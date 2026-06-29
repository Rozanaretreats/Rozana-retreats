# Start Rozana Baileys EOD sender (keeps running for daily cron)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
    Write-Host 'Created .env — fill OWNER_WHATSAPP_NUMBERS then run again.'
    notepad .env
    exit 1
}

$envContent = Get-Content '.env' -Raw
if ($envContent -match 'OWNER_WHATSAPP_NUMBERS=\s*$' -or $envContent -match 'OWNER_WHATSAPP_NUMBERS=919876543210') {
    Write-Host ''
    Write-Host 'ACTION REQUIRED: Set Ruheed WhatsApp in .env'
    Write-Host '  OWNER_WHATSAPP_NUMBERS=91XXXXXXXXXX'
    Write-Host ''
    notepad .env
    exit 1
}

npm start
