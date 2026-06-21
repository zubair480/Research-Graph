# Start both Thread backend and frontend (PowerShell)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $root

Write-Host "Starting backend on http://127.0.0.1:8070 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$repoRoot\backend'; `$env:PORT='8070'; python -m app.main"

Start-Sleep -Seconds 2

Write-Host "Starting frontend ..." -ForegroundColor Cyan
Set-Location "$repoRoot\frontend"
if (-not (Test-Path "node_modules")) {
    npm install
}
npm run dev
