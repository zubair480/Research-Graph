@echo off
cd /d "%~dp0"
set PORT=8070
echo.
echo ========================================
echo   Thread API v2.2 - Port %PORT%
echo   Mermaid graph chat ENABLED
echo ========================================
echo.
python main.py
pause
