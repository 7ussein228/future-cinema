@echo off
title Sea Way Cinema - Launcher

echo ==========================================
echo    SEA WAY CINEMA - One Click Starter
echo ==========================================
echo.

echo [0/3] Closing any old instances...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1

echo [1/3] Starting server (OTP codes will appear in its window)...
start "SeaWay-SERVER (OTP codes appear here)" cmd /k "cd /d %~dp0server && node index.js"

timeout /t 2 /nobreak >nul

echo [2/3] Starting website...
start "SeaWay-WEB" cmd /k "cd /d %~dp0client && npx vite"

echo [3/3] Waiting for services...
timeout /t 5 /nobreak >nul

set LOCALIP=
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' } | Select-Object -First 1).IPAddress"') do set LOCALIP=%%i

start "" http://localhost:5173

cls
echo ==========================================
echo    SEA WAY CINEMA IS RUNNING
echo ==========================================
echo.
echo    On this PC     : http://localhost:5173
if defined LOCALIP echo    From any phone : http://%LOCALIP%:5173
echo.
echo    OTP login codes appear inside the
echo    "SeaWay-SERVER" window title bar area.
echo.
echo    Keep both black windows OPEN while working.
echo    Close them (or press any key) to exit launcher.
echo ==========================================
pause >nul
