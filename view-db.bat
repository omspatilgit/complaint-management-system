@echo off
setlocal
cd /d "%~dp0"
if not exist "backend\venv\Scripts\python.exe" (echo ERROR: Run setup.bat first.& exit /b 1)
"backend\venv\Scripts\python.exe" "backend\view_db.py"
