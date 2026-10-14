@echo off
rem Double-click to start FitNote locally. Close this window to stop it.
cd /d "%~dp0.."
title FitNote dev server
set FITNOTE_WEB_PORT=5180
set FITNOTE_API_PORT=8790
echo Starting FitNote at http://localhost:5180  (log: dev.log)
call npm run dev > dev.log 2>&1
type dev.log
pause
