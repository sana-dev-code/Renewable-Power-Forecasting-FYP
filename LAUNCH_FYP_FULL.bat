@echo off
title SolarCast Pro Master Launcher (Debug Mode)
color 0B
cls

echo.
echo  +======================================================+
echo  ^|      [SUN] SolarCast Pro Master Launcher           ^|
echo  ^|    Final Year Project - Integrated Full Stack      ^|
echo  +======================================================+
echo.

:: --- CHECK FOR NODE ---
echo  [1/4] Checking Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found! Please install it.
    pause
    exit /b 1
)
echo  [OK] Node.js is ready.

:: --- CHECK FOR PYTHON ---
echo  [2/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found! Please install it.
    pause
    exit /b 1
)
echo  [OK] Python is ready.

:: --- START BACKEND (FastAPI) ---
echo  [3/4] Launching Python Backend (Port 8000)...
start "SolarCast Backend (Python)" cmd /k "cd solar-forecast-backend && venv\Scripts\activate && python -m uvicorn app:app --host 0.0.0.0 --port 8000"

:: --- START AUTH PROXY (Node.js) ---
echo  [4/4] Launching Auth Proxy ^& Frontend (Port 4000)...
start "SolarCast Auth Proxy (Node)" cmd /k "cd auth-proxy && npm start"

echo.
echo  [WAIT] Warming up servers (10 seconds)...
echo        Please check the two new windows for any errors!
timeout /t 10 /nobreak >nul

echo  [OPEN] Opening Application...
start http://localhost:4000

echo.
echo  If the browser shows 'Refused to Connect', check the windows above.
echo  Common issue: PostgreSQL not running or database 'solar_forecast' missing.
echo.
pause
