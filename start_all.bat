@echo off
echo =============================================
echo   OceanGuard AI - Marine Intelligence Platform
echo   SIH 2026 - PS SIH26143
echo =============================================
echo.

echo [1/2] Starting FastAPI Backend on port 8000...
start cmd /k "cd /d %~dp0backend && python run.py"

timeout /t 3 /nobreak > nul

echo [2/2] Starting React Frontend on port 5173...
start cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo All systems launched!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo.
echo You can close this window now.
pause
