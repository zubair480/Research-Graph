# Thread — start backend only (run this in its own terminal)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$env:PORT = "8070"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Thread API v2.2 - Port $env:PORT" -ForegroundColor Cyan
Write-Host "  Mermaid graph chat ENABLED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

python main.py
