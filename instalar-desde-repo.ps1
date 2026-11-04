param([Parameter(Mandatory=$true)][string]$Root,[string]$FeedFolder='')
$ErrorActionPreference='Stop'
try {
 $app=Join-Path $Root 'app';$exe=Join-Path $app 'tercero.exe';$target=Join-Path $app 'resources\app.asar'
 if(!(Test-Path -LiteralPath (Join-Path $Root '.git'))){throw 'Falta el clon del repositorio.'}
 if(Test-Path -LiteralPath $app){throw 'La carpeta app ya existe. No se sobreescribe.'}
 if(Get-Process -Name tercero -ErrorAction SilentlyContinue){throw 'Guarda tus campos y cerra Tercero desde Salir en el tray antes de instalar. No se cerro nada por la fuerza.'}
 $r=Get-Content -LiteralPath (Join-Path $Root 'tercero-release-0.2.1.json') -Raw|ConvertFrom-Json
 $bytes=[Convert]::FromBase64String($r.asar)
 $h=([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($bytes))).Replace('-','').ToLowerInvariant()
 if($r.format -ne 'tercero-release-1' -or $r.version -ne '0.2.1' -or $h -ne '2d1a0a50a5d84ef1210cb833a9ec358ed6f92251d91a74ea08ad6a9d8f41d183'){throw 'La release no coincide con la version verificada.'}
 if(!$FeedFolder){
  Add-Type -AssemblyName System.Windows.Forms
  $picker=New-Object System.Windows.Forms.FolderBrowserDialog
  $picker.Description='Elegi Tercero actualizaciones dentro de la unidad de Google Drive. Drive debe estar instalado, conectado y sincronizado.'
  $picker.ShowNewFolderButton=$false
  if($picker.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK){throw 'Configuracion cancelada. No se instalo otra app.'}
  $FeedFolder=$picker.SelectedPath
 }
 if(!(Test-Path -LiteralPath (Join-Path $FeedFolder 'tercero-ultima.json'))){throw 'No esta tercero-ultima.json en la carpeta elegida. Espera que Google Drive sincronice Tercero actualizaciones.'}
 $f=Get-Content -LiteralPath (Join-Path $FeedFolder 'tercero-ultima.json') -Raw|ConvertFrom-Json
 if($f.format -ne 'tercero-release-1'){throw 'La carpeta de actualizaciones no es valida.'}
 $zip=Join-Path $Root 'electron-runtime.zip'
 Write-Host 'Descargando Electron oficial 45.2.2 (158 MB)...'
 & curl.exe --fail --location --retry 2 --output $zip 'https://github.com/electron/electron/releases/download/v45.2.2/electron-v45.2.2-win32-x64.zip'
 if($LASTEXITCODE -ne 0){throw 'Fallo la descarga del runtime.'}
 if((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'a234388419ccbcb18dd2feec856e4ae1832499e200837f23f8e653bd51ff3be5'){throw 'Huella del runtime incorrecta. No se ejecuto.'}
 Expand-Archive -LiteralPath $zip -DestinationPath $app
 Rename-Item -LiteralPath (Join-Path $app 'electron.exe') -NewName 'tercero.exe'
 [IO.File]::WriteAllBytes($target,$bytes)
 if((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $h){throw 'Fallo verificacion de copia.'}
 @{channel='drive-folder';folder=$FeedFolder}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $Root 'actualizaciones.json') -Encoding UTF8
 $launch="@echo off`r`nstart `"`" `"%~dp0app\tercero.exe`"`r`n"
 [IO.File]::WriteAllText((Join-Path $Root 'INICIAR.cmd'),$launch)
 $cmd="@echo off`r`npowershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File `"%~dp0tray-update-local.ps1`" -Root `"%~dp0.`"`r`n"
 [IO.File]::WriteAllText((Join-Path $Root 'ACTUALIZAR-LOCAL.cmd'),$cmd)
 Write-Host ('Instalada v0.2.1 en '+$exe)
 Write-Host 'Carpetas anteriores, preferencias y notas no se borraron. Usa SOLO el INICIAR.cmd de esta carpeta.'
 Write-Host 'Para actualizar: Drive abierto y sincronizado, luego Actualizar desde la bandeja.'
 Start-Process -FilePath $exe -WorkingDirectory $app
 Write-Host 'Apertura solicitada. Falta confirmar la version y la bandeja visibles en Windows.'
} catch {
 Write-Host ('ERROR: '+$_.Exception.Message) -ForegroundColor Red
 Read-Host 'Presiona Enter para cerrar'
 exit 1
}
