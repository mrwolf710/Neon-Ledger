@echo off
rem Stops whatever is serving the game on port 4173, rebuilds it, and starts it again for the phone (same Wi-Fi: open the Network address below).
cd /d "%~dp0"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4173 " ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
call npm run build
if errorlevel 1 (
  echo.
  echo Build failed. Fix the error above, then run this again.
  pause
  exit /b 1
)
echo.
echo Starting the game server. Open the Network address on your phone, then refresh the page.
call npm run preview -- --host --port 4173 --strictPort
pause
