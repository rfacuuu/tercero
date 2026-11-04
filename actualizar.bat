@echo off
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tray-update-local.ps1" -Root "%~dp0."
