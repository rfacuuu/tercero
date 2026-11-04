const fs=require('fs'),path=require('path'),crypto=require('crypto');
async function launch({root,oldPid,shell,worker,onReady,timeout=45000}){
 const dir=path.join(root,'update-logs');fs.mkdirSync(dir,{recursive:true});const token=crypto.randomBytes(12).toString('hex'),base=path.join(dir,'github-'+token),config={root,parentPid:oldPid,token,ready:base+'.ready',proceed:base+'.proceed',result:base+'.result'};
 fs.writeFileSync(base+'.json',JSON.stringify(config));fs.writeFileSync(base+'.ps1',worker);
 const safe=s=>s.replaceAll("'","''");const command=`& '${safe(base+'.ps1')}' -ConfigPath '${safe(base+'.json')}'`;
 fs.writeFileSync(base+'.cmd','@echo off\r\npowershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -EncodedCommand '+Buffer.from(command,'utf16le').toString('base64')+'\r\nif errorlevel 1 pause\r\n');
 const error=await shell.openPath(base+'.cmd');if(error)throw new Error(error);
 const end=Date.now()+timeout;while(Date.now()<end){
  if(fs.existsSync(config.result)){const r=fs.readFileSync(config.result,'utf8');if(r==='already-current')return {current:true};throw new Error(r);}
  if(fs.existsSync(config.ready)&&fs.readFileSync(config.ready,'utf8')===token){await onReady();fs.writeFileSync(config.proceed,token);return {ready:true};}
  await new Promise(r=>setTimeout(r,150));
 }
 throw new Error('El actualizador no confirmo que estaba listo. Tercero sigue abierto.');
}
module.exports={launch};
