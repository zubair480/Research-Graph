@echo off
cd /d "%~dp0..\backend"
set PORT=8070
echo.
echo ========================================
echo   Thread API - Port %PORT%
echo ========================================
echo.
python -m app.main
pause
