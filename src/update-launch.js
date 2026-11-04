// Local updater launch with durable logs and a readiness handshake.
// No network requests, telemetry, user content, keys, notes, or screenshots.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
function append(file,event,data={}){fs.appendFileSync(file,JSON.stringify({time:new Date().toISOString(),event,...data})+'\n');}
async function launch({root,oldPid,version,workerBytes,onReady,spawn=cp.spawn,readyTimeout=8000,now=Date.now,delay=ms=>new Promise(r=>setTimeout(r,ms))}){
 const dir=path.join(root,'update-logs');fs.mkdirSync(dir,{recursive:true});
 const id=crypto.randomBytes(8).toString('hex'),log=path.join(dir,'main.jsonl'),ready=path.join(dir,id+'.ready'),worker=path.join(root,'tray-update-local.ps1'),workerLog=path.join(dir,id+'-worker.log'),nativeLog=path.join(dir,id+'-powershell.log');
 append(log,'prepare',{id,root,oldPid,version,workerSha256:crypto.createHash('sha256').update(workerBytes).digest('hex')});
 fs.writeFileSync(worker,workerBytes);
 const exe=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 const fd=fs.openSync(nativeLog,'a');let child,spawnError=null,exit=null;
 try{
  child=spawn(exe,['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',worker,'-Root',root,'-OldPid',String(oldPid),'-CurrentVersion',version,'-ReadyFile',ready,'-LogFile',workerLog],{detached:true,cwd:root,windowsHide:true,stdio:['ignore',fd,fd]});
  child.once('error',e=>{spawnError=e;append(log,'spawn-error',{id,error:e.message,code:e.code});});
  child.once('spawn',()=>append(log,'spawn',{id,childPid:child.pid}));
  child.once('exit',(code,signal)=>{exit={code,signal};append(log,'exit-before-parent-close',{id,code,signal});});
 }finally{fs.closeSync(fd);}
 const start=now();
 while(now()-start<readyTimeout){
  if(spawnError)throw Object.assign(spawnError,{log:nativeLog});
  if(fs.existsSync(ready)){
   const marker=JSON.parse(fs.readFileSync(ready,'utf8').replace(/^\uFEFF/,''));
   if(marker.oldPid===oldPid){append(log,'worker-ready',{id,childPid:child.pid});child.unref();await onReady();return {id,workerLog,nativeLog};}
  }
  if(exit)throw Object.assign(new Error('El actualizador termino antes de estar listo. La app sigue abierta.'),{log:nativeLog,exit});
  await delay(80);
 }
 append(log,'ready-timeout',{id});throw Object.assign(new Error('El actualizador no confirmo inicio. La app sigue abierta.'),{log:nativeLog});
}
module.exports={launch};
