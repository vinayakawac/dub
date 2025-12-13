# dub

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](package.json)

**dub** is a real-time AI interview assistant desktop app that helps you ace interviews by generating instant, personalized answers using free AI technology.

## Features

- **Voice Recording** - Free browser-based speech recognition
- **AI Answer Generation** - Powered by Groq's Llama 3.3 70B (Free!)
- **Screen Capture** - Under development
- **Personalized Answers** - Add your resume and job description
- **Always-On-Top Overlay** - Dark, transparent interface
- **Global Hotkeys** - Ctrl+Shift+R to record
- **Privacy First** - Local storage, auto-delete transcripts

## Installation

### Prerequisites
- Node.js 16+ 
- Windows, macOS, or Linux

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/vinayakawac/dub.git
   cd dub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API key**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Groq API key:
   ```
   GROQ_API_KEY=your_key_here
   ```

4. **Get FREE Groq API key**
   - Visit: https://console.groq.com
   - Sign up (free, no credit card required)
   - Create API key
   - Paste in `.env` file

5. **Run the app**
   ```bash
   npm start
   ```

### Alternative: Use Setup Scripts

**Windows:**
```bash
.\scripts\setup-production.bat
```

**macOS/Linux:**
```bash
chmod +x scripts/setup-production.sh
./scripts/setup-production.sh
```

## Usage

### Recording Questions

1. Launch the app - overlay appears in top-right corner
2. When asked a question, press **Ctrl+Shift+R** or click **Record**
3. Speak the question clearly
4. Press **Ctrl+Shift+R** again or click **Stop**
5. AI generates answer instantly
6. If speech fails, type your question in the fallback input

### Settings

Click **Settings** to:
- Add/update Groq API key
- Select AI model (Llama 3.3 70B, Mixtral, Gemma)
- Add resume summary for personalized answers
- Add job description for role-specific responses

### Keyboard Shortcuts

- **Ctrl+Shift+R** - Start/stop recording
- **Escape** - Close settings modal

## Tech Stack

- **Electron 28** - Desktop framework
- **Groq SDK** - AI completions (Llama 3.3 70B)
- **Web Speech API** - Free speech recognition
- **electron-store** - Settings persistence
- **dotenv** - Environment configuration

## Development

```bash
# Run in development mode
npm start

# Build for production
npm run build

# Package for current platform
npm run dist
```

## Project Structure

```
dub/
├── src/
│   ├── main.js              # Electron main process
│   ├── renderer.js          # Frontend logic & AI integration
│   ├── overlay.html         # UI interface
│   └── utils/
│       ├── logger.js        # Logging system
│       ├── errorHandler.js  # Error handling
│       ├── healthMonitor.js # Health monitoring
│       └── security.js      # Security utilities
├── assets/
│   └── icon.js              # App icon
├── scripts/
│   ├── setup-production.bat # Windows setup script
│   ├── setup-production.sh  # Unix setup script
│   └── start-free.bat       # Quick start script
├── .github/
│   └── workflows/           # CI/CD pipelines
├── .env                     # API keys (create from .env.example)
├── .env.example             # Environment template
├── package.json             # Dependencies & scripts
└── README.md                # This file
```

## Configuration

Create `.env` file:
```env
GROQ_API_KEY=gsk_your_key_here
DEFAULT_MODEL=llama-3.3-70b-versatile
AUTO_DELETE_TRANSCRIPTS=true
```

## Troubleshooting

**Speech recognition not working?**
- Ensure you're using Chrome or Edge (Chromium-based)
- Check microphone permissions
- Use manual text input as fallback

**API errors?**
- Verify API key in Settings
- Check internet connection
- Free tier: 30 requests/minute

**App not starting?**
- Check Node.js version (16+)
- Delete `node_modules` and run `npm install`
- Check logs in app data folder

## License

MIT License - See [LICENSE](LICENSE) file

## Contributing

Contributions welcome! Open an issue or submit a pull request.

## Support

- GitHub Issues: [Report bugs](https://github.com/vinayakawac/dub/issues)
- Groq API: [Get help](https://console.groq.com)

---

Made with ❤️ for interview success

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
## 📁 Project Structure

```
dub/
├── .github/
│   └── workflows/          # CI/CD automation
│       ├── build.yml       # Multi-platform builds
│       └── test.yml        # Code quality checks
├── src/
│   ├── main.js            # Electron main process
│   ├── overlay.html       # UI with Chrome dark theme
│   ├── renderer.js        # AI integration & UI logic
│   └── utils/
│       ├── logger.js      # Logging system
│       ├── errorHandler.js # Error handling
│       ├── security.js    # Security utilities
│       └── healthMonitor.js # Performance tracking
├── assets/
│   └── icon.js            # Application icons
├── .env.example           # Environment template
├── CHANGELOG.md           # Version history
├── CONTRIBUTING.md        # Contribution guide
├── DEPLOYMENT.md          # Deployment instructions
├── PRODUCTION_READY.md    # Production features
├── SECURITY.md           # Security policy
├── package.json          # Project configuration
└── README.md            # This file
```

## 🛠️ Development

### Development Mode

```bash
npm run dev
```

Features:
- Hot reload enabled
- DevTools open
- Debug logging
- Test environment

### Production Build

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux
npm run build:all     # All platforms
```

### Running Tests

```bash
npm test
```

## 🔒 Security

- ✅ API key encryption
- ✅ Input sanitization
- ✅ Content Security Policy
- ✅ Secure local storage
- ✅ No external data transmission
- ✅ Automatic transcript deletion
- ✅ Vulnerability scanning

See [SECURITY.md](SECURITY.md) for details.

## 📊 Monitoring & Logs

### Log Locations

**Windows:** `%APPDATA%/dub/logs/`  
**macOS:** `~/Library/Application Support/dub/logs/`  
**Linux:** `~/.config/dub/logs/`

### Log Files

- `app-YYYY-MM-DD.log` - General application logs
- `error-YYYY-MM-DD.log` - Error logs only
- Automatic cleanup after 7 days

### Health Monitoring

- Memory usage tracking
- CPU usage monitoring
- Error rate tracking
- Crash detection
- Performance metrics

## 🔄 Auto-Updates

The application includes automatic update functionality:

- Checks for updates on startup
- Downloads in background
- Notifies when ready
- Installs on next restart

Configure in `.env`:
```env
AUTO_UPDATE_ENABLED=true
UPDATE_CHECK_INTERVAL=3600000
```

## 💻 Technologies

- **Electron 28** - Cross-platform desktop framework
- **Groq API** - FREE Llama 3.3 70B + Vision AI
- **Web Speech API** - Free browser-based speech recognition
- **Node.js** - Backend runtime
- **Electron Store** - Encrypted local settings
- **electron-updater** - Auto-update functionality
- **GitHub Actions** - CI/CD automation

## 🚢 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions.

### Quick Release

1. Update version in `package.json`
2. Commit changes
3. Create tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. GitHub Actions automatically:
   - Builds for all platforms
   - Creates release
   - Uploads installers

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/vinayakawac/dub/issues)
- **Discussions:** [GitHub Discussions](https://github.com/vinayakawac/dub/discussions)
- **Documentation:** See docs in repository

## 🙏 Acknowledgments

- **Groq** - For free Llama 3.3 70B API access
- **Electron** - Cross-platform desktop framework
- **Contributors** - All project contributors

## ⚠️ Disclaimer

This tool is for educational and legitimate interview preparation purposes only. Users are responsible for ensuring compliance with applicable laws and regulations in their jurisdiction. Use responsibly and ethically.
