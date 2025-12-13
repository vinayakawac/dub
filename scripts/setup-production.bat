@echo off
echo ========================================
echo dub - Production Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Checking Node.js version...
node --version
echo.

echo [2/5] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo.

echo [3/5] Setting up environment...
if not exist .env (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit .env file and add your API keys!
    echo.
) else (
    echo .env file already exists.
)
echo.

echo [4/5] Building application...
call npm run build:win
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo.

echo [5/5] Setup Complete!
echo.
echo ========================================
echo Installation files are in the dist folder:
dir dist /b | findstr /i "exe"
echo ========================================
echo.
echo Next Steps:
echo 1. Edit .env file with your API keys
echo 2. Install the application from dist folder
echo 3. Run dub and enjoy!
echo.
pause
