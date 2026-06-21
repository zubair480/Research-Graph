# Thread API — Windows PowerShell startup script
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Installing dependencies..." -ForegroundColor Cyan
python -m pip install -r requirements.txt

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env from .env.example." -ForegroundColor Yellow
    }
}

Write-Host "Starting Thread API..." -ForegroundColor Green
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2
    Write-Host "Backend already running at http://127.0.0.1:8000" -ForegroundColor Yellow
    exit 0
} catch {
    python main.py
}
