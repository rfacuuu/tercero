@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
echo === Tercero - actualizar ===

REM 1) Traer la ultima version del repo
git pull --ff-only
if errorlevel 1 (
  echo ERROR: git pull fallo. No se toco nada. Revisa conexion o acceso al repo.
  pause
  exit /b 1
)

REM 2) Ubicar la instalacion (carpeta donde esta tercero.exe)
if exist instalacion.txt (
  set /p TERCERO_DIR=<instalacion.txt
) else (
  echo Primera vez: pega la ruta de la carpeta donde esta tercero.exe
  echo ^(ej: C:\Users\facu\Downloads\tercero-win32-x64^)
  set /p TERCERO_DIR=
  echo !TERCERO_DIR!>instalacion.txt
)
if not exist "!TERCERO_DIR!\tercero.exe" (
  echo ERROR: no encontre tercero.exe en !TERCERO_DIR!
  echo Borra instalacion.txt y volve a correr este archivo.
  pause
  exit /b 1
)

REM 3) Cerrar solo tercero (no toca ningun otro programa)
taskkill /IM tercero.exe /F >nul 2>&1

REM 4) Decodificar el paquete (viene en base64 dentro del repo)
if exist app.asar.b64 (
  certutil -decode app.asar.b64 app.asar >nul
  if errorlevel 1 (
    echo ERROR: no se pudo decodificar app.asar.b64. No se toco nada.
    pause
    exit /b 1
  )
)

REM 5) Actualizar con respaldo y verificacion
if not exist "!TERCERO_DIR!\resources\app.asar" (
  echo ERROR: no encontre resources\app.asar en la instalacion.
  pause
  exit /b 1
)
copy /y "!TERCERO_DIR!\resources\app.asar" "!TERCERO_DIR!\resources\app.asar.bak" >nul
copy /y "app.asar" "!TERCERO_DIR!\resources\app.asar" >nul
fc /b "app.asar" "!TERCERO_DIR!\resources\app.asar" >nul
if errorlevel 1 (
  echo ERROR: la copia fallo. Restauro la version anterior.
  copy /y "!TERCERO_DIR!\resources\app.asar.bak" "!TERCERO_DIR!\resources\app.asar" >nul
  pause
  exit /b 1
)

REM 6) Reabrir
start "" "!TERCERO_DIR!\tercero.exe"
echo Listo: tercero actualizado y abierto de nuevo.
echo Si algo anda mal, corre restaurar.bat para volver a la version anterior.
pause
