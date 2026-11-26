@echo off
echo ==========================================
echo   ALBA SERVICE GROUP PLATFORM
echo ==========================================
echo.
echo Starting Backend (port 4000)...
start "ALBA Backend" cmd /c "cd /d C:\ALBA_SERVICE_GROUP_PLATFORM\backend && node dist\src\main.js"
timeout /t 5 /nobreak >nul
echo Starting Frontend (port 3000)...
start "ALBA Frontend" cmd /c "cd /d C:\ALBA_SERVICE_GROUP_PLATFORM\frontend && npx vite --port 3000 --host"
timeout /t 5 /nobreak >nul
echo.
echo ==========================================
echo   URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:4000/api
echo.
echo   Login:    admin@alba-service.com
echo   Password: admin123
echo ==========================================
echo.
echo Close the two terminal windows to stop.
pause
