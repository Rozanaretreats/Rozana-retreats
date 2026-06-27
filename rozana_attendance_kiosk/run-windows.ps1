# Run Rozana kiosk on Windows (works even if flutter is not on PATH yet)
$flutter = "$env:USERPROFILE\flutter\bin\flutter.bat"
if (-not (Test-Path $flutter)) {
    Write-Error "Flutter not found at $flutter. Install from https://docs.flutter.dev/get-started/install/windows"
    exit 1
}
Set-Location $PSScriptRoot
& $flutter run -d windows @args
