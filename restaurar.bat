@echo off
setlocal
cd /d "%~dp0"
if not exist instalacion.txt (
  echo No hay instalacion registrada. Nada que restaurar.
  pause
  exit /b 1
)
set /p TERCERO_DIR=<instalacion.txt
taskkill /IM tercero.exe /F >nul 2>&1
if exist "!TERCERO_DIR!\resources\app.asar.bak" (
  copy /y "!TERCERO_DIR!\resources\app.asar.bak" "!TERCERO_DIR!\resources\app.asar" >nul
  echo Version anterior restaurada.
) else (
  echo No hay respaldo para restaurar.
)
start "" "!TERCERO_DIR!\tercero.exe"
pause
