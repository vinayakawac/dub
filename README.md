# dub

A real-time AI interview assistant that listens to questions, generates personalized answers, and displays them discreetly during video calls or coding sessions. Built with Electron for standalone desktop use.

## Features

- **Real-time Speech Recognition** - Browser-based speech recognition (completely free)
- **Free AI Model** - Llama 3.3 70B via Groq API (no payment required)
- **Continuous Screen Reading** - Automatically detects and answers questions on screen
- **Screen Capture & Analysis** - OCR and vision AI for coding problems
- **Resume Context** - Add your background for personalized answers
- **Transparent Overlay** - Always-on-top window, Chrome dark theme
- **Global Hotkeys** - Control without switching windows
- **Privacy First** - Local storage, auto-delete transcripts
- **Standalone Desktop App** - No browser dependencies, runs independently

## Installation

### FREE Setup (Recommended - 2 Minutes!)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Get FREE Groq API key** (No credit card!)
   - Visit: https://console.groq.com
   - Sign up with email (free forever)
   - Create API key
   - Copy the key (starts with `gsk_...`)

3. **Add key to app**
   - Run `npm start`
   - Click Settings
   - Paste your free Groq key
   - Save and you're done!

**See [FREE-SETUP.md](FREE-SETUP.md) for detailed free setup guide.**

### Alternative: From Source with OpenAI (Paid)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd interview-copilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API keys**
   - Copy `.env.example` to `.env`
   - Add your paid OpenAI API key (or use free Groq key!)

4. **Run the application**
   ```bash
   npm start
   ```

### Build Standalone Executable

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

The built application will be in the `dist/` folder.

## Usage

### Hotkeys

- **Ctrl+Shift+R** - Start/stop voice recording

### Workflow

**Option 1: Voice Recording**
1. Launch the application (overlay is always visible)
2. Press **Ctrl+Shift+R** or click Record when a question is asked
3. Speak the question clearly
4. Press **Ctrl+Shift+R** again to stop
5. AI generates talking points instantly

**Option 2: Continuous Screen Reading**
1. Click the **Capture** button in the overlay
2. App continuously monitors your screen every 3 seconds
3. Automatically detects interview questions or coding problems
4. Generates and displays answers in real-time
5. Click **Stop Read** to turn off monitoring

### First Time Setup

1. Get your FREE Groq API key at https://console.groq.com (no credit card)
2. Click **Settings** in the overlay
3. Paste your API key
4. Optionally add your resume summary and job description
5. Start using the app!

### Features

#### Voice Recording
- Click the Record button or use **Ctrl+Shift+R**
- Browser-based speech recognition (completely free)
- Automatic transcription and AI answer generation

#### Continuous Screen Reading
- Click Capture button to enable continuous monitoring
- Monitors screen every 3 seconds for questions
- Uses vision AI to detect and extract questions
- Automatically generates answers to detected questions
- Perfect for keeping up with rapid-fire interview questions

#### Screen Capture & Analysis
- One-time screen capture for coding problems
- Works with LeetCode, HackerRank, and coding platforms
- Provides solutions with explanations

#### Resume & Job Context
- Add your resume summary in Settings
- Paste job description for tailored responses
- AI personalizes answers based on your background

## Configuration

### Settings

Edit settings in the application or modify the config file at:
- **Windows**: `%APPDATA%\interview-copilot\config.json`
- **macOS**: `~/Library/Application Support/interview-copilot/config.json`
- **Linux**: `~/.config/interview-copilot/config.json`

### Available Models (FREE with Groq!)

- **Llama 3.3 70B** (Recommended - Free & Fast!)
- Llama 3.1 70B (Free)
- Mixtral 8x7B (Free)
- Gemma 2 9B (Free)

**All models are completely FREE with Groq API!**

## Requirements

- **Operating System**: Windows 10/11, macOS 10.14+, Linux
- **RAM**: 4GB minimum (8GB recommended)
- **Internet**: Required for Groq AI API calls
- **Microphone**: Optional (for voice recording feature)
- **Free Groq API Key**: Get instantly at https://console.groq.com

## Privacy & Security

- End-to-end encryption for local data storage
- Auto-delete transcripts after session
- No data sent to third parties (only Groq API for AI)
- Screen captures processed locally, only sent to AI when needed
- All settings stored locally on your machine
- No telemetry or tracking

## Troubleshooting

### Microphone Not Working
- Check Windows Privacy Settings → Microphone
- Allow browser microphone access when prompted
- Ensure the app has permission to access the microphone

### Overlay Not Visible
- Overlay shows automatically on startup
- Press **Ctrl+Shift+P** to toggle
- Check system tray for the app icon
- Look in top-right corner of screen

### Screen Reading Not Working
- Make sure you have a valid Groq API key
- Check internet connection
- Vision model requires stable connection
- Try voice recording mode as alternative

### API Errors
- **Need Free Key:** Get instantly at console.groq.com (no credit card)
- Verify your API key starts with "gsk_"
- Ensure internet connection is stable
- Free tier: 30 requests/min (sufficient for interviews)
- Wait 60 seconds if rate limit reached

## Development

### Project Structure

```
dub/
├── src/
│   ├── main.js          # Electron main process (window, recording, IPC)
│   ├── overlay.html     # UI template with Chrome dark theme
│   ├── renderer.js      # AI integration, screen reading, speech recognition
├── assets/
│   └── icon.js          # App icon configuration
├── package.json
├── .env                 # API keys (not committed)
└── README.md
```

### Technologies

- **Electron 28** - Cross-platform desktop framework
- **Groq API** - FREE Llama 3.3 70B (text) & Vision (screen analysis)
- **Web Speech API** - Free browser-based speech recognition
- **Node.js** - Backend runtime
- **Electron Store** - Encrypted local settings storage

### Key Features Implementation

- **Screen Reading**: Uses desktopCapturer + Groq Vision API
- **Speech Recognition**: Native Web Speech API (Chrome/Edge)
- **AI Processing**: Groq's Llama 3.3 70B with conversation history
- **Hotkeys**: Global shortcuts work system-wide
- **Theme**: Chrome dark theme (#202124, #8ab4f8)

**Total Cost: $0 (Everything is FREE with Groq!)**

## Build Standalone Executable

Create a portable `.exe` file that runs on any Windows machine:

```bash
npm run build:win
```

Output will be in `dist/` folder:
- Installer version (with setup wizard)
- Portable version (runs without installation)

Both versions are ~150MB and include everything needed to run.

## Technical Details

### Free Groq API Benefits
- **30 requests/minute** - More than enough for interviews
- **No credit card required** - Sign up with email only
- **Llama 3.3 70B** - Top-tier open source model
- **Vision API** - For screen content analysis
- **Whisper Large V3** - Professional transcription quality

### Architecture
- **Main Process**: Manages window, system tray, audio recording, global shortcuts
- **Renderer Process**: Handles UI, AI calls, screen capture, speech recognition
- **IPC Communication**: Secure messaging between main and renderer
- **Local Storage**: Encrypted settings with electron-store

## License

MIT License - See LICENSE file for details

## Disclaimer

This tool is for educational and legitimate interview preparation purposes only. Users are responsible for ensuring compliance with applicable laws and regulations in their jurisdiction. Use responsibly and ethically.
