const { app } = require('electron');
const logger = require('./logger');
const { autoUpdater } = require('electron-updater');

class HealthMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      crashes: 0,
      errors: 0,
      memoryUsage: [],
      cpuUsage: []
    };
    
    this.setupMonitoring();
    this.setupAutoUpdater();
  }
  
  setupMonitoring() {
    // Check health every 5 minutes
    setInterval(() => {
      this.collectMetrics();
    }, 5 * 60 * 1000);
    
    // Initial metrics
    this.collectMetrics();
  }
  
  collectMetrics() {
    try {
      const memoryInfo = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: memoryInfo.heapUsed,
        heapTotal: memoryInfo.heapTotal,
        external: memoryInfo.external,
        rss: memoryInfo.rss
      });
      
      this.metrics.cpuUsage.push({
        timestamp: Date.now(),
        user: cpuUsage.user,
        system: cpuUsage.system
      });
      
      // Keep only last 24 hours of metrics (288 samples at 5 min intervals)
      if (this.metrics.memoryUsage.length > 288) {
        this.metrics.memoryUsage.shift();
      }
      if (this.metrics.cpuUsage.length > 288) {
        this.metrics.cpuUsage.shift();
      }
      
      // Log if memory usage is high
      const heapUsedMB = memoryInfo.heapUsed / 1024 / 1024;
      if (heapUsedMB > 500) {
        logger.warn('High memory usage detected', { 
          heapUsedMB: heapUsedMB.toFixed(2) 
        });
      }
      
    } catch (error) {
      logger.error('Failed to collect metrics', { error: error.message });
    }
  }
  
  setupAutoUpdater() {
    if (process.env.NODE_ENV === 'production' && process.env.AUTO_UPDATE_ENABLED !== 'false') {
      autoUpdater.logger = logger;
      autoUpdater.autoDownload = false;
      
      // Check for updates on startup
      autoUpdater.checkForUpdatesAndNotify();
      
      // Check for updates every hour
      const updateInterval = parseInt(process.env.UPDATE_CHECK_INTERVAL) || 3600000;
      setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
      }, updateInterval);
      
      autoUpdater.on('update-available', (info) => {
        logger.info('Update available', { version: info.version });
      });
      
      autoUpdater.on('update-downloaded', (info) => {
        logger.info('Update downloaded', { version: info.version });
      });
      
      autoUpdater.on('error', (error) => {
        logger.error('Auto-updater error', { error: error.message });
      });
    }
  }
  
  recordError() {
    this.metrics.errors++;
    logger.debug('Error recorded', { totalErrors: this.metrics.errors });
  }
  
  recordCrash() {
    this.metrics.crashes++;
    logger.error('Crash recorded', { totalCrashes: this.metrics.crashes });
  }
  
  getUptime() {
    return Date.now() - this.metrics.startTime;
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      uptime: this.getUptime(),
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron
    };
  }
  
  getHealthStatus() {
    const uptime = this.getUptime();
    const errorRate = this.metrics.errors / (uptime / 1000); // errors per second
    
    const status = {
      healthy: true,
      uptime: uptime,
      errors: this.metrics.errors,
      crashes: this.metrics.crashes,
      errorRate: errorRate
    };
    
    // Consider unhealthy if:
    // - High crash rate
    // - High error rate
    if (this.metrics.crashes > 5 || errorRate > 0.1) {
      status.healthy = false;
    }
    
    return status;
  }
  
  generateReport() {
    const metrics = this.getMetrics();
    const health = this.getHealthStatus();
    
    const report = {
      timestamp: new Date().toISOString(),
      health: health,
      system: {
        version: metrics.version,
        platform: metrics.platform,
        arch: metrics.arch,
        nodeVersion: metrics.nodeVersion,
        electronVersion: metrics.electronVersion
      },
      performance: {
        uptime: metrics.uptime,
        errors: metrics.errors,
        crashes: metrics.crashes
      }
    };
    
    logger.info('Health report generated', report);
    return report;
  }
}

module.exports = new HealthMonitor();
