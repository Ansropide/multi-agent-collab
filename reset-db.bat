@echo off
cd /d "%~dp0"

echo 正在清理测试数据...
if exist "backend\data\agents.db" (
    del "backend\data\agents.db"
    echo 已删除 agents.db
)
if exist "backend\data\agents.db-wal" del "backend\data\agents.db-wal" 2>nul
if exist "backend\data\agents.db-shm" del "backend\data\agents.db-shm" 2>nul
echo 清理完成！
pause
