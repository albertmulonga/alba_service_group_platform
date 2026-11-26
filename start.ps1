Write-Host "=== Starting ALBA SERVICE GROUP PLATFORM ===" -ForegroundColor Cyan

$ROOT = $PSScriptRoot

# Start Backend
Write-Host "Starting Backend on port 4000..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "node" -ArgumentList "$ROOT\backend\dist\src\main.js" -WorkingDirectory "$ROOT\backend" -PassThru -NoNewWindow -RedirectStandardError "$env:TEMP\alba_backend_err.log" -RedirectStandardOutput "$env:TEMP\alba_backend_out.log"
Write-Host "Backend PID: $($backend.Id)" -ForegroundColor Green

# Wait for backend
Start-Sleep -Seconds 5

# Check backend
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:4000/api/auth" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "Backend is running!" -ForegroundColor Green
} catch {
    if ($_.Exception.Response) {
        Write-Host "Backend is running! (HTTP $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Green
    } else {
        Write-Host "Backend may have errors. Check logs below:" -ForegroundColor Red
        Get-Content "$env:TEMP\alba_backend_err.log" -ErrorAction SilentlyContinue | Select-Object -Last 15
        Get-Content "$env:TEMP\alba_backend_out.log" -ErrorAction SilentlyContinue | Select-Object -Last 15
    }
}

# Start Frontend
Write-Host "Starting Frontend on port 3000..." -ForegroundColor Yellow
$frontend = Start-Process -FilePath "npx" -ArgumentList "vite", "--port", "3000" -WorkingDirectory "$ROOT\frontend" -PassThru -NoNewWindow -RedirectStandardError "$env:TEMP\alba_frontend_err.log" -RedirectStandardOutput "$env:TEMP\alba_frontend_out.log"
Write-Host "Frontend PID: $($frontend.Id)" -ForegroundColor Green

Start-Sleep -Seconds 5

# Show URLs
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ALBA SERVICE GROUP PLATFORM" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:4000/api" -ForegroundColor Green
Write-Host "  Login:    admin@alba-service.com" -ForegroundColor Yellow
Write-Host "  Password: admin123" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to stop both servers..."
Read-Host

# Cleanup
Write-Host "Stopping servers..." -ForegroundColor Red
Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
Write-Host "Done." -ForegroundColor Green
