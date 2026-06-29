@echo off
cd /d "%~dp0"
node -e "fetch('http://127.0.0.1:3939/send-now').then(async r=>{const t=await r.text(); console.log(r.status, t); process.exit(r.ok?0:1)}).catch(e=>{console.error('Failed. Is start.cmd running and connected?'); console.error(e.message); process.exit(1)})"
pause
