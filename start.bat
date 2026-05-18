@echo off
cd /d "%~dp0"

echo ========================================
echo   本地智能体管理系统 - 启动中...
echo ========================================
echo.

echo [1/2] 启动后端服务 (http://localhost:8000)...
start "agent-backend" cmd /c "cd /d "%~dp0backend" && uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo [2/2] 启动前端服务 (http://localhost:5173)...
start "agent-frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo.
echo 后端: http://localhost:8000
echo 前端: http://localhost:5173
echo.
echo 按任意键退出...
pause >nul
