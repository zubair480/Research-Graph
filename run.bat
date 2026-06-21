@echo off
cd /d "%~dp0"
echo Installing dependencies...
python -m pip install -r requirements.txt
if not exist .env if exist .env.example copy .env.example .env
echo Starting Thread API...
python main.py
