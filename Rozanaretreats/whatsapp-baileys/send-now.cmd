@echo off
cd /d "%~dp0"
node scripts\trigger-send.mjs
if errorlevel 1 pause
