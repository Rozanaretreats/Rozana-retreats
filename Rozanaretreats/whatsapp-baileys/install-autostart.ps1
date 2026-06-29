# Register Windows Task Scheduler job: start Baileys EOD sender at user logon (daily 6 PM send is internal cron).
# Run once as Administrator OR as the user who owns the WhatsApp linked session.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$taskName = 'Rozana-EOD-WhatsApp-Sender'
$ps1 = Join-Path $PSScriptRoot 'start-production.ps1'

if (-not (Test-Path $ps1)) { throw "Missing $ps1" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ps1`""

$trigger = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Description 'Rozana daily EOD WhatsApp report via Baileys (cron 6 PM IST in app)' -Force

Write-Host "Registered scheduled task: $taskName"
Write-Host 'Runs start-production.ps1 at Windows logon.'
Write-Host 'Ensure .env has OWNER_WHATSAPP_NUMBERS and auth_info exists from prior QR scan.'
