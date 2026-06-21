# Thread — start backend only (run this in its own terminal)
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location "$repoRoot\backend"
$env:PORT = "8070"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Thread API - Port $env:PORT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

python -m app.main
