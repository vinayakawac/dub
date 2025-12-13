const { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');
const recorder = require('node-record-lpcm16');
const fs = require('fs');
const logger = require('./utils/logger');
const errorHandler = require('./utils/errorHandler');
const healthMonitor = require('./utils/healthMonitor');

// Load environment variables FIRST before anything else
require('dotenv').config();

// Initialize electron-store for settings with proper defaults from .env
const store = new Store({
  name: 'dub-config',
  defaults: {
    settings: {
      model: process.env.DEFAULT_MODEL || 'llama-3.3-70b-versatile',
      autoStart: false,
      transparencyLevel: 0.95,
      autoDeleteTranscripts: process.env.AUTO_DELETE_TRANSCRIPTS === 'true' || true
    },
    resume: null,
    jobDescription: null,
    apiKeys: {
      groq: process.env.GROQ_API_KEY || ''
    }
  }
});

// Ensure API key from .env is loaded into store if not already set
if (process.env.GROQ_API_KEY && (!store.get('apiKeys.groq') || store.get('apiKeys.groq') === '')) {
  store.set('apiKeys.groq', process.env.GROQ_API_KEY);
  logger.info('Loaded Groq API key from environment');
}

logger.info('Application starting', { 
  version: app.getVersion(),
  platform: process.platform,
  nodeEnv: process.env.NODE_ENV,
  hasGroqKey: !!store.get('apiKeys.groq')
});

let overlayWindow = null;
let tray = null;
let recording = null;
let audioBuffer = [];
let isRecording = false;

// Create invisible overlay window
function createOverlay() {
  try {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    overlayWindow = new BrowserWindow({
      width: 450,
      height: 700,
      x: width - 470,
      y: 20,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      opacity: store.get('settings.transparencyLevel', 0.95),
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false,
        enableRemoteModule: true
      }
    });
    
    // Load the overlay UI
    overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));
    
    // Show on startup, then user can hide/show with hotkey
    overlayWindow.show();

    // Development tools (remove in production)
    if (process.env.NODE_ENV !== 'production') {
      overlayWindow.webContents.openDevTools({ mode: 'detach' });
    }

    overlayWindow.on('closed', () => {
      logger.info('Overlay window closed');
      overlayWindow = null;
    });
    
    logger.info('Overlay window created successfully');
  } catch (error) {
    logger.error('Failed to create overlay window', { error: error.message });
    throw error;
  }
}

// Create system tray
function createTray() {
  // Use a simple icon (you can replace with actual icon file)
  const iconPath = path.join(__dirname, '../assets/icon.png');
  
  // Create tray icon (fallback to default if icon doesn't exist)
  try {
    tray = new Tray(iconPath);
  } catch (err) {
    // Use nativeImage to create a simple icon if file doesn't exist
    const { nativeImage } = require('electron');
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
  }

  const contextMenu = Menu.buildFromTemplate([
    { type: 'separator' },
    { 
      label: isRecording ? 'Stop Recording' : 'Start Recording', 
      click: () => {
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Settings', 
      click: () => {
        if (overlayWindow) {
          overlayWindow.webContents.send('open-settings');
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('dub - Ready');
  tray.setContextMenu(contextMenu);
}

// Register global shortcuts
function registerShortcuts() {
  // Start/Stop recording (Ctrl+Shift+R)
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });
}

// Audio recording functions
function startRecording() {
  if (isRecording) return;

  try {
    audioBuffer = [];
    isRecording = true;

    recording = recorder.record({
      sampleRate: 16000,
      channels: 1,
      audioType: 'wav',
      threshold: 0.5,
      silence: '2.0',
      recorder: 'sox', // or 'rec' on Linux
      device: null
    });

    recording.stream()
      .on('data', (chunk) => {
        audioBuffer.push(chunk);
      })
      .on('error', (err) => {
        logger.error('Recording error', { error: err.message });
        isRecording = false;
        if (overlayWindow) {
          overlayWindow.webContents.send('recording-error', err.message);
        }
      });

    if (overlayWindow) {
      overlayWindow.webContents.send('recording-started');
    }

    if (tray) {
      tray.setToolTip('dub - Recording...');
    }

    logger.info('Recording started');
    showNotification('dub', 'Recording started');
  } catch (error) {
    logger.error('Failed to start recording', { error: error.message });
    isRecording = false;
    showNotification('dub', 'Failed to start recording. Check microphone permissions.');
  }
}

function stopRecording() {
  if (!recording || !isRecording) return;

  try {
    recording.stop();
    recording = null;
    isRecording = false;

    // Save audio to temporary file
    const tempDir = app.getPath('temp');
    const audioPath = path.join(tempDir, `audio_${Date.now()}.wav`);
    const buffer = Buffer.concat(audioBuffer);
    
    fs.writeFileSync(audioPath, buffer);

    if (overlayWindow) {
      overlayWindow.webContents.send('recording-stopped', audioPath);
    }

    if (tray) {
      tray.setToolTip('dub - Processing...');
    }

    logger.info('Recording stopped', { audioPath });
    audioBuffer = [];
  } catch (error) {
    logger.error('Failed to stop recording', { error: error.message });
    isRecording = false;
  }
}

// IPC Handlers
ipcMain.handle('get-config', async () => {
  const config = store.store;
  // Ensure API key is always included
  if (!config.apiKeys) {
    config.apiKeys = {};
  }
  if (!config.apiKeys.groq && process.env.GROQ_API_KEY) {
    config.apiKeys.groq = process.env.GROQ_API_KEY;
  }
  logger.debug('Config requested', { hasGroqKey: !!config.apiKeys.groq });
  return config;
});

ipcMain.handle('save-config', async (event, config) => {
  store.set(config);
  logger.info('Config saved');
  return { success: true };
});

ipcMain.handle('get-api-keys', async () => {
  const keys = store.get('apiKeys', {
    groq: process.env.GROQ_API_KEY || '',
    openai: process.env.OPENAI_API_KEY || '',
    anthropic: process.env.ANTHROPIC_API_KEY || ''
  });
  logger.debug('API keys requested', { hasGroqKey: !!keys.groq });
  return keys;
});

ipcMain.handle('save-api-keys', async (event, keys) => {
  store.set('apiKeys', keys);
  return { success: true };
});

ipcMain.handle('save-resume', async (event, resumeData) => {
  store.set('resume', resumeData);
  return { success: true };
});

ipcMain.handle('get-resume', async () => {
  return store.get('resume', null);
});

ipcMain.handle('save-job-description', async (event, jobDesc) => {
  store.set('jobDescription', jobDesc);
  return { success: true };
});

ipcMain.handle('get-job-description', async () => {
  return store.get('jobDescription', '');
});

ipcMain.on('manual-record-start', () => {
  startRecording();
});

ipcMain.on('manual-record-stop', () => {
  stopRecording();
});

ipcMain.on('show-notification', (event, title, body) => {
  showNotification(title, body);
});

ipcMain.handle('delete-audio-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to delete audio file:', error);
    return { success: false, error: error.message };
  }
});

// Show native notification
function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({
      title: title,
      body: body,
      silent: true
    }).show();
  }
}

// App lifecycle
app.whenReady().then(() => {
  createOverlay();
  createTray();
  registerShortcuts();

  // Check for auto-start setting
  const autoStart = store.get('settings.autoStart', false);
  app.setLoginItemSettings({
    openAtLogin: autoStart,
    openAsHidden: true
  });

  // Log successful startup
  logger.info('Application ready', {
    autoStart: autoStart,
    version: app.getVersion()
  });

  showNotification('dub', 'Ready. Press Ctrl+Shift+R to record.');
  
  // Generate initial health report
  setTimeout(() => {
    healthMonitor.generateReport();
  }, 5000);
});

app.on('window-all-closed', (e) => {
  // Don't quit on window close - keep running in tray
  e.preventDefault();
});

app.on('before-quit', () => {
  // Clean up
  if (isRecording) {
    stopRecording();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

// macOS specific
app.on('activate', () => {
  if (overlayWindow === null) {
    createOverlay();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { 
    error: error.message, 
    stack: error.stack 
  });
  healthMonitor.recordCrash();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason,
    promise: promise
  });
  healthMonitor.recordError();
});
