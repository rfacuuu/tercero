@echo off
setlocal
set "TERCERO_BAT=%~f0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$s=[IO.File]::ReadAllText($env:TERCERO_BAT);$m='#'+' POWERSHELL';Invoke-Expression $s.Substring($s.IndexOf($m)+$m.Length)"
set "CODE=%ERRORLEVEL%"
if not "%CODE%"=="0" pause
exit /b %CODE%
# POWERSHELL
$ErrorActionPreference='Stop'
$Root=$env:TERCERO_ROOT
if(!$Root){$Root='C:\Users\Facu\tercero-0.2.1-20261104-172540'}
$Target=Join-Path $Root 'app\resources\app.asar';$Exe=Join-Path $Root 'app\tercero.exe'
$env:GIT_TERMINAL_PROMPT='0';$env:GCM_INTERACTIVE='Never'
$Changed=$false;$Backup=$Target+'.before-github.bak';$Started=$null
function Read-Version([byte[]]$Data){
 if($Data.Length -lt 16){throw 'Paquete incompleto'}
 $Size=[BitConverter]::ToUInt32($Data,12)
 if($Size -gt 1048576 -or (16+$Size) -gt $Data.Length){throw 'Cabecera invalida'}
 $H=[Text.Encoding]::UTF8.GetString($Data,16,$Size)|ConvertFrom-Json
 $P=$H.files.'package.json';$Off=8+[BitConverter]::ToUInt32($Data,4)+[int]$P.offset
 if(!$P -or $P.size -gt 1048576 -or ($Off+$P.size) -gt $Data.Length){throw 'Falta version interna'}
 return ([Text.Encoding]::UTF8.GetString($Data,$Off,[int]$P.size)|ConvertFrom-Json).version
}
function Hash([byte[]]$Data){return ([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($Data))).Replace('-','').ToLowerInvariant()}
function Running {return @(Get-Process -Name tercero -ErrorAction SilentlyContinue|Where-Object{$_.Path -and $_.Path.Equals($Exe,[StringComparison]::OrdinalIgnoreCase)})}
function Confirm-Launch([string]$Version){
 $LaunchTime=(Get-Date).ToUniversalTime()
 $P=Start-Process -FilePath $Exe -WorkingDirectory (Split-Path $Exe) -PassThru
 $script:Started=$P
 $P.Refresh()
 $End=(Get-Date).AddSeconds(25);$Log=Join-Path $Root 'update-logs\app-start.jsonl'
 while((Get-Date) -lt $End){
  if(Test-Path -LiteralPath $Log){foreach($Line in Get-Content -LiteralPath $Log){try{$J=$Line|ConvertFrom-Json;if($J.pid -eq $P.Id -and $J.version -eq $Version -and $J.event -eq 'hud-loaded' -and ([DateTime]$J.time).ToUniversalTime() -ge $LaunchTime.AddSeconds(-2) -and (Get-Process -Id $P.Id -ErrorAction SilentlyContinue)){return}}catch{}}}
  $P.Refresh();if($P.HasExited){throw 'Tercero termino antes de abrir'}
  Start-Sleep -Milliseconds 200
 }
 throw 'No se confirmo la apertura de Tercero'
}
try {
 if(!(Test-Path -LiteralPath $Target) -or !(Test-Path -LiteralPath (Join-Path $Root '.git'))){throw 'No se encontro la instalacion original con Git'}
 $Origin=(& git -C $Root remote get-url origin|Out-String).Trim()
 if($LASTEXITCODE -or $Origin -notin @('https://github.com/rfacuuu/tercero','https://github.com/rfacuuu/tercero.git')){throw 'El repositorio no es el esperado. No se cambio nada'}
 Write-Host 'Buscando la ultima version en GitHub...'
 & git -C $Root fetch --quiet origin main
 if($LASTEXITCODE){throw 'No se pudo leer el repositorio privado. No se cambio la app'}
 $Commit=(& git -C $Root rev-parse --verify 'refs/remotes/origin/main^{commit}'|Out-String).Trim()
 if($LASTEXITCODE -or $Commit -notmatch '^[0-9a-f]{40}$'){throw 'No se pudo fijar la version recibida de GitHub'}
 Write-Host ('Version GitHub fijada: '+$Commit.Substring(0,12))
 $Pkg=(& git -C $Root show ($Commit+':package.json')|Out-String)|ConvertFrom-Json
 if($LASTEXITCODE -or $Pkg.version -notmatch '^\d+\.\d+\.\d+$'){throw 'Version de GitHub invalida'}
 $Release=(& git -C $Root show ($Commit+':tercero-release-'+$Pkg.version+'.json')|Out-String)|ConvertFrom-Json
 if($LASTEXITCODE -or $Release.format -ne 'tercero-release-1'){throw 'Release de GitHub incompleta'}
 $Bytes=[Convert]::FromBase64String($Release.asar);$Version=Read-Version $Bytes
 if($Version -notmatch '^\d+\.\d+\.\d+$'){throw 'Version interna invalida'}
 if($Version -ne $Pkg.version -or $Version -ne $Release.version -or (Hash $Bytes) -ne $Release.sha256){throw 'La version o huella no coincide. No se cambio la app'}
 $Current=[IO.File]::ReadAllBytes($Target);$OldVersion=Read-Version $Current
 if($OldVersion -notmatch '^\d+\.\d+\.\d+$'){throw 'La version instalada no es valida'}
 if([version]$Version -lt [version]$OldVersion){throw 'GitHub contiene una version anterior. Se conserva la instalada'}
 if((Hash $Current) -eq $Release.sha256){Write-Host ('Ya tenes Tercero '+$Version);if(!(Running).Count){Confirm-Launch $Version};exit 0}
 if((Running).Count){Write-Host 'Guarda tu trabajo y cerra Tercero desde Salir en la bandeja.';Read-Host 'Presiona Enter cuando lo hayas cerrado'|Out-Null;if((Running).Count){throw 'Tercero sigue abierto. No se cambio nada'}}
 $Stage=$Target+'.github-next';[IO.File]::WriteAllBytes($Stage,$Bytes)
 if((Get-FileHash -LiteralPath $Stage -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Release.sha256){throw 'No se pudo verificar el archivo temporal'}
 Copy-Item -LiteralPath $Target -Destination $Backup -Force
 if((Get-FileHash -LiteralPath $Backup -Algorithm SHA256).Hash.ToLowerInvariant() -ne (Hash $Current)){throw 'No se pudo verificar el respaldo'}
 if((Running).Count){throw 'Tercero volvio a abrirse. No se cambio nada'}
 $Changed=$true;Copy-Item -LiteralPath $Stage -Destination $Target -Force
 if((Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Release.sha256){throw 'La copia final no coincide'}
 Confirm-Launch $Version
 Remove-Item -LiteralPath $Stage -ErrorAction SilentlyContinue
 Write-Host ('Tercero '+$Version+' actualizado y abierto. Respaldo anterior conservado.')
 exit 0
} catch {
 Write-Host ('ERROR: '+$_.Exception.Message) -ForegroundColor Red
 if($Changed){
  try {
   if($Started -and (Get-Process -Id $Started.Id -ErrorAction SilentlyContinue)){Stop-Process -Id $Started.Id;Wait-Process -Id $Started.Id -ErrorAction SilentlyContinue}
   if((Running).Count){throw 'Quedan procesos de Tercero abiertos'}
   Copy-Item -LiteralPath $Backup -Destination $Target -Force
   if((Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash.ToLowerInvariant() -ne (Hash $Current)){throw 'No coincide el respaldo restaurado'}
   Confirm-Launch $OldVersion
   Write-Host 'Se restauro y abrio la version anterior.'
  } catch {Write-Host ('Conserva este respaldo: '+$Backup+'. '+$_.Exception.Message) -ForegroundColor Red}
 }
 Write-Host 'Tus preferencias, notas y runtime no se modificaron.'
 exit 1
}
