@echo off
echo ========================================================
echo Starting CAMPUS MEMORY Backend and Frontend
echo ========================================================

start "CAMPUS MEMORY - Backend (FastAPI)" cmd /k "cd /d %~dp0DBMS_PROJECT-main\backend && python run_server.py"
start "CAMPUS MEMORY - Frontend (Vite)" cmd /k "cd /d %~dp0DBMS_PROJECT-main\frontend && npm run dev"

echo Both services launched!
echo - Frontend: http://localhost:5173
echo - Backend API: http://127.0.0.1:8000
echo - Swagger Docs: http://127.0.0.1:8000/docs
