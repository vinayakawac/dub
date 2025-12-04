const { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');
const recorder = require('node-record-lpcm16');
const fs = require('fs');

// Initialize electron-store for settings
const store = new Store({
  name: 'dub-config',
  defaults: {
    settings: {
      model: 'llama-3.3-70b-versatile',
      autoStart: false,
      transparencyLevel: 0.95,
      autoDeleteTranscripts: true
    },
    resume: null,
    jobDescription: null,
    apiKeys: {
      groq: process.env.GROQ_API_KEY || ''
    }
  }
});

let overlayWindow = null;
let tray = null;
let recording = null;
let audioBuffer = [];
let isRecording = false;

// Create invisible overlay window
function createOverlay() {
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
  if (process.argv.includes('--dev')) {
    overlayWindow.webContents.openDevTools({ mode: 'detach' });
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
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
        console.error('Recording error:', err);
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

    showNotification('dub', 'Recording started');
  } catch (error) {
    console.error('Failed to start recording:', error);
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

    audioBuffer = [];
  } catch (error) {
    console.error('Failed to stop recording:', error);
    isRecording = false;
  }
}

// IPC Handlers
ipcMain.handle('get-config', async () => {
  return store.store;
});

ipcMain.handle('save-config', async (event, config) => {
  store.set(config);
  return { success: true };
});

ipcMain.handle('get-api-keys', async () => {
  return store.get('apiKeys', {
    openai: process.env.OPENAI_API_KEY || '',
    anthropic: process.env.ANTHROPIC_API_KEY || ''
  });
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

ipcMain.handle('capture-screen', async () => {
  const { desktopCapturer } = require('electron');
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    
    if (sources.length > 0) {
      return sources[0].thumbnail.toDataURL();
    }
    return null;
  } catch (error) {
    console.error('Screen capture error:', error);
    return null;
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

  showNotification('dub', 'Ready. Press Ctrl+Shift+R to record.');
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
  console.error('Uncaught exception:', error);
});
