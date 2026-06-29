# Run Baileys EOD sender in background (production). Logs to logs/eod-sender.log
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path '.env')) {
    Write-Error 'Missing .env — copy from .env.example and set OWNER_WHATSAPP_NUMBERS'
}

if (-not (Test-Path 'logs')) { New-Item -ItemType Directory -Path 'logs' | Out-Null }

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Write-Error 'Node.js not found. Install from https://nodejs.org' }

# Stop existing sender if re-running this script
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*whatsapp-baileys*index.mjs*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

$log = Join-Path $PSScriptRoot 'logs\eod-sender.log'
$err = Join-Path $PSScriptRoot 'logs\eod-sender-error.log'

Start-Process -FilePath 'node' -ArgumentList 'src/index.mjs' -WorkingDirectory $PSScriptRoot `
    -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $err

Write-Host 'Rozana EOD sender started in background.'
Write-Host "  Log: $log"
Write-Host '  Schedule: EOD_CRON in .env (default 6:00 PM IST)'
Write-Host '  Test: .\send-now.cmd'
Write-Host '  If QR needed: delete auth_info, run .\start.cmd once to scan, then run this again.'
