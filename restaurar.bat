@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
if not exist instalacion.txt (
  echo No hay instalacion registrada. Nada que restaurar.
  pause
  exit /b 1
)
set /p TERCERO_DIR=<instalacion.txt
set "TD=!TERCERO_DIR!"
powershell -NoProfile -Command "Get-Process tercero -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($env:TD) } | Stop-Process -Force" >nul 2>&1
if exist "!TERCERO_DIR!\resources\app.asar.bak" (
  copy /y "!TERCERO_DIR!\resources\app.asar.bak" "!TERCERO_DIR!\resources\app.asar" >nul
  echo Version anterior restaurada.
) else (
  echo No hay respaldo para restaurar.
)
start "" "!TERCERO_DIR!\tercero.exe"
pause
