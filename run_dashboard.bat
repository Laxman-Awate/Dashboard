@echo off
title SMART GLOVE - Health Monitoring Dashboard
echo ====================================================================
echo   SMART GLOVE - Health Monitoring Dashboard
echo ====================================================================
echo.

cd /d "%~dp0\backend"
echo [1/2] Installing backend Python dependencies...
python -m pip install -r requirements.txt

echo.
echo [2/2] Launching Flask Backend & Dashboard...
echo Open your browser at: http://localhost:5000
echo.
python app.py
pause

