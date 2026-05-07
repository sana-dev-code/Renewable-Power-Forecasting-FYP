@echo off
title SolarCast Pro — Solar Energy Forecasting Platform
color 0A
cls

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║     ☀  SolarCast Pro — FYP Solar Forecast System   ║
echo  ║          Final Year Project — Advanced Edition       ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

setlocal enabledelayedexpansion

:: ────────────────────────────────
:: CHECK PYTHON
:: ────────────────────────────────
echo  [1/6] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found!
    echo  Please install Python 3.10+ from https://www.python.org/downloads/
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo  [OK] %%v

:: ────────────────────────────────
:: CHECK / CREATE VENV
:: ────────────────────────────────
echo  [2/6] Setting up virtual environment...
if not exist "venv\" (
    echo       Creating venv...
    python -m venv venv
    if errorlevel 1 ( echo  [ERROR] venv creation failed & pause & exit /b 1 )
)
call venv\Scripts\activate.bat
echo  [OK] venv active.

:: ────────────────────────────────
:: INSTALL DEPENDENCIES
:: ────────────────────────────────
echo  [3/6] Installing / verifying dependencies...
pip install --quiet --upgrade pip
pip install --quiet fastapi "uvicorn[standard]" tortoise-orm asyncpg python-dotenv httpx pandas numpy scikit-learn joblib requests
if errorlevel 1 ( echo  [WARN] Some packages may have failed. Continuing... )

echo       Checking TensorFlow (optional ML model)...
pip show tensorflow >nul 2>&1
if errorlevel 1 (
    echo       Installing TensorFlow (this may take a moment)...
    pip install --quiet tensorflow 2>nul
    pip show tensorflow >nul 2>&1
    if errorlevel 1 (
        echo  [WARN] TensorFlow not installed. System will use physics-based baseline.
    ) else (
        echo  [OK] TensorFlow installed.
    )
) else (
    echo  [OK] TensorFlow already installed.
)

:: ────────────────────────────────
:: CHECK .ENV
:: ────────────────────────────────
echo  [4/6] Checking configuration...
if not exist ".env" (
    echo       Creating default .env file...
    (
        echo DATABASE_URL=postgres://postgres:sana@localhost:5432/solar_forecast
        echo OWM_KEY=
        echo ART_DIR=services/training_artifacts
        echo DEFAULT_TZ=Asia/Karachi
        echo FORCE_BASELINE=0
        echo FORCE_ML=0
        echo ML_ZERO_GUARD=1
        echo ENSEMBLE=0
        echo DEBUG_FORECAST=1
        echo MIN_DAY_FRACTION=0.02
    ) > .env
    echo  [OK] .env created. Edit OWM_KEY and DATABASE_URL as needed.
) else (
    echo  [OK] .env found.
)

:: ────────────────────────────────
:: CHECK TRAINING ARTIFACTS DIR
:: ────────────────────────────────
echo  [5/6] Checking training artifacts...
if not exist "services\training_artifacts\" (
    mkdir "services\training_artifacts"
    echo  [INFO] Created services\training_artifacts\ directory.
    echo  [INFO] Run python make_dataset_only.py to build dataset.
    echo  [INFO] Run python train.py to train the LSTM model.
) else (
    if exist "services\training_artifacts\model.keras" (
        echo  [OK] ML model found: model.keras
    ) else if exist "services\training_artifacts\model.h5" (
        echo  [OK] ML model found: model.h5
    ) else (
        echo  [WARN] No ML model found. Baseline physics mode will be used.
        echo  [HINT] Run: python make_dataset_only.py ^&^& python train.py
    )
)

:: ────────────────────────────────
:: LAUNCH SERVER + BROWSER
:: ────────────────────────────────
echo  [6/6] Starting SolarCast Pro server...
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║  Desktop App    → solar_app.html (open in browser)  ║
echo  ║  API Docs       → http://localhost:8000/docs         ║
echo  ║  Backend API    → http://localhost:8000              ║
echo  ║  Press Ctrl+C to stop the server                     ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: Open the desktop HTML app first
echo  Opening SolarCast Pro desktop app...
start "" "%~dp0solar_app.html"

:: Wait 3 seconds then open API docs
start "" cmd /c "timeout /t 3 >nul && start http://localhost:8000/docs"

:: Start the FastAPI backend
uvicorn app:app --host 0.0.0.0 --port 8000 --reload --log-level info

echo.
echo  Server stopped. Press any key to exit.
pause >nul
