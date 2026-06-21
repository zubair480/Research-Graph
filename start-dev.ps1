# Start both Thread backend and frontend (PowerShell)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting backend on http://127.0.0.1:8070 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; `$env:PORT='8070'; python main.py"

Start-Sleep -Seconds 2

Write-Host "Starting frontend ..." -ForegroundColor Cyan
Set-Location "$root\Thread AI Studio"
if (-not (Test-Path "node_modules")) {
    npm install
}
npm run dev
