const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.logDir = path.join(app.getPath('userData'), 'logs');
    
    // Create logs directory
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    this.logFile = path.join(this.logDir, `app-${this.getDateString()}.log`);
    this.errorFile = path.join(this.logDir, `error-${this.getDateString()}.log`);
    
    // Clean old logs (keep last 7 days)
    this.cleanOldLogs();
  }
  
  getDateString() {
    const date = new Date();
    return date.toISOString().split('T')[0];
  }
  
  cleanOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      
      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtimeMs < sevenDaysAgo) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }
  
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}\n`;
  }
  
  writeToFile(file, message) {
    try {
      fs.appendFileSync(file, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
  
  shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] <= levels[this.logLevel];
  }
  
  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      const formatted = this.formatMessage('error', message, meta);
      console.error(message, meta);
      this.writeToFile(this.errorFile, formatted);
      this.writeToFile(this.logFile, formatted);
    }
  }
  
  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, meta);
      console.warn(message, meta);
      this.writeToFile(this.logFile, formatted);
    }
  }
  
  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, meta);
      if (this.isDevelopment) {
        console.log(message, meta);
      }
      this.writeToFile(this.logFile, formatted);
    }
  }
  
  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      const formatted = this.formatMessage('debug', message, meta);
      if (this.isDevelopment) {
        console.log(message, meta);
      }
      this.writeToFile(this.logFile, formatted);
    }
  }
}

module.exports = new Logger();
