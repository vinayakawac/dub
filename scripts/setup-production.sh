#!/bin/bash

echo "========================================"
echo "dub - Production Setup"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "[1/5] Checking Node.js version..."
node --version
echo ""

echo "[2/5] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies!"
    exit 1
fi
echo ""

echo "[3/5] Setting up environment..."
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "IMPORTANT: Please edit .env file and add your API keys!"
    echo ""
else
    echo ".env file already exists."
fi
echo ""

echo "[4/5] Building application..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    npm run build:mac
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    npm run build:linux
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

if [ $? -ne 0 ]; then
    echo "ERROR: Build failed!"
    exit 1
fi
echo ""

echo "[5/5] Setup Complete!"
echo ""
echo "========================================"
echo "Installation files are in the dist folder:"
ls -1 dist/ | grep -E '\.(dmg|AppImage|deb)$'
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. Edit .env file with your API keys"
echo "2. Install the application from dist folder"
echo "3. Run dub and enjoy!"
echo ""
