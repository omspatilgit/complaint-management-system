@echo off
setlocal
cd /d "%~dp0"
if not exist "backend\venv\Scripts\python.exe" (echo ERROR: Run setup.bat first.& exit /b 1)
if not exist "frontend\node_modules\vite\bin\vite.js" (echo ERROR: Frontend dependencies missing. Run setup.bat first.& exit /b 1)
echo ClearDesk URLs:
echo Frontend: http://localhost:5173
echo Backend:  http://127.0.0.1:8000
echo API docs: http://127.0.0.1:8000/docs
echo Close each server window with Ctrl+C to stop it.
start "ClearDesk API" /D "%~dp0backend" "%~dp0backend\venv\Scripts\python.exe" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
start "ClearDesk Frontend" /D "%~dp0frontend" cmd /k "npm run dev -- --host 127.0.0.1 --port 5173"
start "" "http://localhost:5173"
