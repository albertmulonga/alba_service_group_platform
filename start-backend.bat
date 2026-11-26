@echo off
cd /d C:\ALBA_SERVICE_GROUP_PLATFORM\backend
echo Starting ALBA Backend on port 4000...
node dist\src\main.js
if errorlevel 1 (
    echo.
    echo ERROR: Backend failed to start. Check if PostgreSQL is running.
    echo.
    pause
)
