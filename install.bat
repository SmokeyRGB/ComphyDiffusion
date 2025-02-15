@echo off
echo =======================================
echo  Installing Project Dependencies
echo =======================================

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it first.
    exit /b 1
)

:: Install Node.js dependencies
echo Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Node.js dependencies.
    exit /b 1
)
echo Node.js dependencies installed successfully.

:: Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Please install it first.
    exit /b 1
)

:: Navigate to python_server directory
cd python_server

:: Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

:: Activate virtual environment
call venv\Scripts\activate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment.
    exit /b 1
)

:: Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    exit /b 1
)

echo Python dependencies installed successfully.

:: Deactivate virtual environment
deactivate

:: Navigate back to the root directory
cd ..

echo =======================================
echo  Installation Complete! ✅
echo =======================================
pause
exit /b 0
