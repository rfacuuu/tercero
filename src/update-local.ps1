param([Parameter(Mandatory=$true)][string]$Root,[int]$OldPid=0,[string]$CurrentVersion='0.2.1',[string]$ReadyFile='',[string]$LogFile='')
$ErrorActionPreference='Stop'
if(!$LogFile){$LogFile=Join-Path $Root 'update-worker.log'}
function Log-Step([string]$Message){Add-Content -LiteralPath $LogFile -Encoding UTF8 -Value ((Get-Date -Format o)+' '+$Message)}
function Read-Host {param([string]$Prompt) Log-Step ('completed: '+$Prompt)}
Log-Step ('start pid='+$PID+' oldPid='+$OldPid+' root='+$Root)

$exe=Join-Path $Root 'app\tercero.exe'
$target=Join-Path $Root 'app\resources\app.asar'
$backup=$target+'.bak'
$copied=$false
try {
  Log-Step 'read-config'
  $configPath=Join-Path $Root 'actualizaciones.json'
  if(!(Test-Path -LiteralPath $configPath)){throw 'Falta configurar la carpeta privada de actualizaciones.'}
  $config=Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
  if($config.channel -ne 'drive-folder' -or !$config.folder){throw 'Configuracion de actualizaciones no valida.'}
  $source=Join-Path ([string]$config.folder) 'tercero-ultima.json'
  if(!(Test-Path -LiteralPath $source)){throw 'No se encuentra la release. Abri Drive para escritorio y espera que sincronice.'}
  if($ReadyFile){@{oldPid=$OldPid;workerPid=$PID}|ConvertTo-Json -Compress|Set-Content -LiteralPath $ReadyFile -Encoding UTF8}
  Log-Step 'wait-main-exit'
  if($OldPid -gt 0){
    $p=Get-Process -Id $OldPid -ErrorAction SilentlyContinue
    if($p -and !$p.WaitForExit(20000)){throw 'Tercero no se cerro. No se reemplazo la app.'}
  }
  Log-Step 'main-exited, read-feed'
  Write-Host 'Leyendo la ultima release disponible en tu carpeta privada de Drive...'
  Write-Host 'La frescura depende de Drive: comproba que haya terminado de sincronizar.'
  Log-Step 'copy-snapshot'
  $snapshot=Join-Path $Root 'release-recibida.json'
  Copy-Item -LiteralPath $source -Destination $snapshot -Force
  $release=Get-Content -LiteralPath $snapshot -Raw | ConvertFrom-Json
  if($release.format -ne 'tercero-release-1'){throw 'Formato de release no valido.'}
  $bytes=[Convert]::FromBase64String($release.asar)
  $sha=[Security.Cryptography.SHA256]::Create()
  $digest=([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant()
  if($digest -ne $release.sha256){throw 'La huella del paquete no coincide con la release.'}
  if($bytes.Length -lt 1000){throw 'Paquete incompleto.'}
  function Read-AsarVersion([byte[]]$data) {
    if($data.Length -lt 16){throw 'ASAR incompleto.'}
    $headerSize=[BitConverter]::ToUInt32($data,12)
    if($headerSize -gt 1048576 -or (16+$headerSize) -gt $data.Length){throw 'Cabecera ASAR invalida.'}
    $header=([Text.Encoding]::UTF8.GetString($data,16,$headerSize) | ConvertFrom-Json)
    $pkg=$header.files.'package.json'
    if(!$pkg){throw 'ASAR sin package.json.'}
    $offset=8+[BitConverter]::ToUInt32($data,4)+[int]$pkg.offset
    if($pkg.size -gt 1048576 -or ($offset+$pkg.size) -gt $data.Length){throw 'package.json invalido.'}
    return ([Text.Encoding]::UTF8.GetString($data,$offset,[int]$pkg.size) | ConvertFrom-Json).version
  }
  $version=Read-AsarVersion $bytes
  if($version -ne $release.version){throw 'Version del manifest no coincide con paquete.'}
  $CurrentVersion=Read-AsarVersion ([IO.File]::ReadAllBytes($target))
  if([version]$version -lt [version]$CurrentVersion){
    Write-Host ('La carpeta sincronizada contiene v'+$version+' pero esta copia es v'+$CurrentVersion+'. Se conserva la version mas nueva, sin reemplazarla.')
    Log-Step 'launch-request'
  $started=Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe) -PassThru
  Log-Step ('launch-requested pid='+$started.Id)
    Read-Host 'Presiona Enter para cerrar esta ventana'
    return
  }

  Log-Step ('validated version='+$version+' sha256='+$digest)
  $stage=Join-Path $Root 'tray-update-next.asar'
  [IO.File]::WriteAllBytes($stage,$bytes)
  $hash=(Get-FileHash -LiteralPath $stage -Algorithm SHA256).Hash
  if($hash -eq (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash){
    Write-Host 'Este paquete coincide con la release disponible en la carpeta sincronizada.'
  } else {
    Log-Step 'backup-current'
    Copy-Item -LiteralPath $target -Destination $backup -Force
    $copied=$true
    Log-Step 'replace-asar'
    Copy-Item -LiteralPath $stage -Destination $target -Force
    if((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $hash){throw 'La verificacion de la copia fallo.'}
    Write-Host ('Paquete actualizado y verificado. SHA256: '+$hash)
  }
  Log-Step 'launch-request'
  $started=Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe) -PassThru
  Log-Step ('launch-requested pid='+$started.Id)
  Write-Host 'Apertura solicitada. Comproba la version visible; no se confirma aqui que la ventana arranco.'
} catch {
  Log-Step ('error: '+$_.Exception.Message+'; stack: '+$_.ScriptStackTrace)
  Write-Host ('ERROR: '+$_.Exception.Message) -ForegroundColor Red
  if($copied -and (Test-Path -LiteralPath $backup)){
    try {Log-Step 'rollback';Copy-Item -LiteralPath $backup -Destination $target -Force; Write-Host 'Se restauro el paquete anterior.'} catch {Write-Host 'No se pudo restaurar. Conserva esta ventana y el archivo app.asar.bak.'}
  }
  Write-Host 'No se borraron preferencias ni notas. Podes reabrir con INICIAR.cmd.'
}
Read-Host 'Presiona Enter para cerrar esta ventana'

Log-Step 'worker-end'
