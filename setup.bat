@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>nul || (echo ERROR: Python is required. Install Python 3.10+ and add it to PATH.& exit /b 1)
where node >nul 2>nul || (echo ERROR: Node.js is required. Install Node.js 18+ and add it to PATH.& exit /b 1)
where npm >nul 2>nul || (echo ERROR: npm is required.& exit /b 1)
if not exist "backend\venv\Scripts\python.exe" (
  echo Creating backend virtual environment...
  python -m venv "backend\venv" || (echo ERROR: Could not create backend venv.& exit /b 1)
)
echo Installing backend requirements...
"backend\venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt" || (echo ERROR: Backend dependency install failed.& exit /b 1)
echo Installing frontend dependencies...
pushd "frontend"
call npm install || (popd & echo ERROR: Frontend dependency install failed.& exit /b 1)
if not exist ".env" copy ".env.example" ".env" >nul
popd
echo.
echo ClearDesk setup completed successfully.
exit /b 0
