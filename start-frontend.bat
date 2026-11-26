@echo off
cd /d C:\ALBA_SERVICE_GROUP_PLATFORM\frontend
echo Starting ALBA Frontend on port 3000...
npx vite --port 3000 --host
if errorlevel 1 (
    echo.
    echo ERROR: Frontend failed to start.
    echo.
    pause
)
