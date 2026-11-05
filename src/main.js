// Tercero - HUD companion (Electron main process)
// Isla flotante siempre visible + captura elegida por el usuario + sugerencias.
// Privacidad: captura solo de la fuente elegida, pausa inmediata, nada se sube
// sin autorizacion explicita; los frames se descartan tras el analisis.
const { app, BrowserWindow, ipcMain, desktopCapturer, session, screen, safeStorage, Tray, Menu, nativeImage, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const prefs = require('./prefs');
const sessionLog = require('./session-log');
const ai = require('./ai');
const companion=require('./companion');

let tray = null;
let updateBusy = false;
let hud = null;
let captureWin = null; // ventana oculta que recibe el stream
let captureTimer = null;
let lastFrame = null;
let paused = false;
let snoozedUntil = 0;
let currentSourceId = null;

const SMOKE = process.argv.includes('--smoke');

function showHud() {
  if (!hud) createHud();
  hud.show();
  hud.setIgnoreMouseEvents(false);
  hud.focus();
}

async function updateFromTray(){
 if(updateBusy)return;updateBusy=true;
 try{
  const root=path.dirname(path.dirname(process.execPath));
  if(process.platform!=='win32'||!app.isPackaged)throw new Error('La actualizacion desde bandeja esta disponible en la instalacion Windows.');
  const result=await require('./update-github-launch').launch({root,oldPid:process.pid,shell,worker:fs.readFileSync(path.join(__dirname,'update-github.ps1')),onReady:async()=>{
   const draft=hud&&!hud.isDestroyed()?await hud.webContents.executeJavaScript(`Object.fromEntries(['chat-input','f-objetivo','f-estrategia','f-recursos','f-plazo'].map(id=>[id,document.getElementById(id)?.value||'']))`):{};
   fs.writeFileSync(path.join(app.getPath('userData'),'pending-ui-draft.json'),JSON.stringify({fields:draft,savedAt:new Date().toISOString()}));
   paused=true;stopCapture();setTimeout(()=>app.quit(),300);
  }});
  if(result.current)await dialog.showMessageBox({type:'info',message:'Ya tenes la ultima version de Tercero.'});
 }catch(e){await dialog.showMessageBox({type:'error',title:'No se pudo actualizar',message:String(e.message),detail:'Tercero sigue abierto si el reemplazo no comenzo. No se envian capturas para actualizar.'});}
 finally{updateBusy=false;}
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'renderer', 'assets', 'pluma-feliz.png')).resize({width:32,height:32});
  tray = new Tray(icon);
  tray.setToolTip('Tercero v' + app.getVersion());
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:'Tercero v' + app.getVersion(), enabled:false},
    {label:'Mostrar Tercero', click:showHud},
    {label:'Pausar captura', click:()=>{paused=true;stopCapture();sessionLog.add({ts:Date.now(),kind:'pause'});if(hud)hud.webContents.send('hud:tray-paused');}},
    {type:'separator'},
    {label:'Actualizar', click:updateFromTray},
    {type:'separator'},
    {label:'Salir de Tercero', click:()=>app.quit()}
  ]));
  tray.on('double-click', showHud);
}

function createHud() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  hud = new BrowserWindow({
    width: 132, height: 138, x: width - 152, y: 16,
    frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true,
    resizable: false, hasShadow: false, focusable: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  hud.setAlwaysOnTop(true, 'screen-saver');hud.setContentProtection(true);
  hud.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  hud.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  hud.webContents.once('did-finish-load',()=>{if(app.isPackaged&&process.platform==='win32'){try{const root=path.dirname(path.dirname(process.execPath));const dir=path.join(root,'update-logs');fs.mkdirSync(dir,{recursive:true});fs.appendFileSync(path.join(dir,'app-start.jsonl'),JSON.stringify({time:new Date().toISOString(),version:app.getVersion(),pid:process.pid,event:'hud-loaded'})+'\n');}catch{}}});
  // Por defecto el overlay NO intercepta clics: el renderer activa
  // interactividad solo cuando el puntero esta sobre la isla visible.
  hud.webContents.once('did-finish-load', () => { if (hud) hud.setIgnoreMouseEvents(true, { forward: true }); });
  hud.on('blur',()=>{if(hud)hud.webContents.send('hud:blur');});
  hud.on('closed', () => { hud = null; });
  if (SMOKE) hud.webContents.once('did-finish-load', () => setTimeout(async () => {
    // Verificacion visual: abrir panel, simular sugerencia + nota de chat y capturar.
    await hud.webContents.executeJavaScript(`
      document.getElementById('panel').classList.add('open');
      document.getElementById('v-onboarding').style.display = 'none';
      document.getElementById('controles').style.display = 'flex';
      // estado real del smoke: sin captura, modo demo - el copy refleja eso
      window.dispatchEvent(new Event('resize'));
      const sug = { id: 'smoke-1', tipo: 'estructura', texto: 'El titular podría ganar jerarquía: si el objetivo es lectura rápida, probá subir 1-2 pasos el tamaño.', mock: true };
      const ev = null;
      const list = document.getElementById('v-sugerencias');
      const c = document.createElement('div');
      c.className = 'card';
      c.innerHTML = '<div class="tipo">Sugerencia · demo</div><div class="txt">' + sug.texto + '</div><div class="row"><button class="primary">Me sirvió</button><button>No</button><button>Ahora no</button></div>';
      list.prepend(c);
      const n = document.createElement('div');
      n.className = 'nota'; n.textContent = 'probá también con la fecha más chica';
      list.prepend(n);
      document.getElementById('pluma-pill').src = 'assets/pluma-feliz.png';
      document.getElementById('pluma-panel').src = 'assets/pluma-emocionada.png';
      document.getElementById('isla').dispatchEvent(new Event('mousemove'));
    `);
    await new Promise(r => setTimeout(r, 900));
    const img = await hud.webContents.capturePage();
    fs.writeFileSync('/tmp/tercero-smoke.png', img.toPNG());
    app.quit();
  }, 2500));
}

function createCaptureWindow() {
  captureWin = new BrowserWindow({
    show: false, width: 1280, height: 800,
    webPreferences: { preload: path.join(__dirname, 'preload-capture.js'), contextIsolation: true }
  });
  captureWin.loadFile(path.join(__dirname, 'renderer', 'capture.html'));
}

// El usuario elige la fuente; solo se concede esa.
function setupDisplayMediaHandler() {
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then(sources => {
      const src = sources.find(s => s.id === currentSourceId);
      if (src) callback({ video: src }); else callback({});
    }).catch(() => callback({}));
  });
}

function stopCapture() {
  workEpoch++;companion.setState('pausa');
  companion.setState('pausa');
  if (captureTimer) { clearInterval(captureTimer); captureTimer = null; }
  if (captureWin) captureWin.webContents.send('capture:stop-stream');
}

function scheduleCapture() {
  if(captureTimer){clearInterval(captureTimer);captureTimer=null;}
  const p = prefs.get();
  if (!currentSourceId || paused) return;
  const intervalMs = Math.max(5, p.captureIntervalSec || 20) * 1000;
  captureTimer = setInterval(tickCapture, intervalMs);
}

function pipeline(message){companion.setState(/Analizando con Meta/.test(message)?'analizando':/Demo|Preparando respuesta/.test(message)?'pensando':/pausa|permiso|clave|No se pudo/.test(message)?'pausa':'acompanando');if(hud&&!hud.isDestroyed())hud.webContents.send('hud:pipeline',message);}
async function tickCapture() {
  if (paused || Date.now() < snoozedUntil || !captureWin || analysisBusy || replyBusy) return;
  analysisBusy=true;const epoch=workEpoch;companion.hide(true);
  try {
    await new Promise(r=>setTimeout(r,75));
    const frame = await captureWin.webContents.executeJavaScript('window.terceroCapture && window.terceroCapture.grabFrame()');
    companion.hide(false);
    if(epoch!==workEpoch||paused||!currentSourceId)return;
    if (!frame||!frame.jpeg){pipeline('Esperando imagen de la ventana…');return;}
    const jpeg=frame.jpeg,signature=frame.signature;
    if (!lastFrame) { lastFrame = signature;pipeline('Ventana lista. Espero un cambio para comentar.'); if (TEST) fs.appendFileSync('/tmp/tick-errors.log', new Date().toISOString() + ' baseline\n'); return; } // primer frame = referencia, sin IA
    const changed = sessionLog.frameChanged(lastFrame, signature);

    if (TEST) fs.appendFileSync('/tmp/tick-errors.log', new Date().toISOString() + ' tick changed=' + changed + '\n');
    if (!changed){pipeline('En pausa: sin cambios en el diseño.');return;}
    lastFrame=signature; // sin avance visible, no molestar
    const p = prefs.get();
    if (TEST) fs.appendFileSync('/tmp/tick-errors.log', new Date().toISOString() + ' gate mode=' + ai.status(p).mode + ' consent=' + JSON.stringify(p.aiConsent) + ' keys=' + Object.keys(p).join(',') + '\n');
    if(ai.status(p).mode==='meta'&&!p.aiConsent){pipeline('Meta necesita tu permiso en Ajustes.');return;}if(ai.status(p).mode==='meta'&&!ai.status(p).metaReady){pipeline('Meta necesita una clave guardada en Ajustes.');return;}pipeline(ai.status(p).mode==='meta'?'Analizando con Meta…':'Preparando una idea de Demo…'); // sin consentimiento, nada sale de la PC
    const entry = await ai.analyzeFrame(jpeg, p, sessionLog.recent());
    if (TEST) fs.appendFileSync('/tmp/tick-errors.log', new Date().toISOString() + ' ai-result=' + JSON.stringify(entry) + '\n');
    if(epoch!==workEpoch)return;
    if(!entry)pipeline('Analizado. No hay una sugerencia útil ahora.');
    if (entry) {companion.flash();pipeline('Nueva idea para tu diseño.'); // null = el criterio (mock o Meta) decidio no intervenir: no molestar
      sessionLog.add({ ts: Date.now(), kind: 'suggestion', ...entry, frameKept: prefs.get().frameRetention === 'guardar-local' });
      hud.webContents.send('hud:suggestion', entry);if(prefs.get().commentPlacement==='near'){const c=screen.getCursorScreenPoint(),a=screen.getDisplayNearestPoint(c).workArea,b=hud.getBounds();hud.setPosition(Math.max(a.x,Math.min(a.x+a.width-b.width,c.x+35)),Math.max(a.y,Math.min(a.y+a.height-b.height,c.y+35)));}
    }
  } catch (e) {
    pipeline('No se pudo analizar. Revisá el error.');hud.webContents.send('hud:error', String(e && e.message || e));
    if (TEST) fs.appendFileSync('/tmp/tick-errors.log', new Date().toISOString() + ' ' + String(e && e.stack || e) + '\n');
  }finally{analysisBusy=false;companion.hide(false);}
}

let analysisBusy=false,replyBusy=false,workEpoch=0;
const TEST = process.argv.includes('--test-capture');
let testWin = null;
function createTestWindow() {
  testWin = new BrowserWindow({ width: 900, height: 600, show: true, title: 'Tercero Pieza Test' });
  testWin.loadFile(path.join(__dirname, 'renderer', 'pieza.html'));
}
async function runCaptureTest() {
  // E2E INTEGRADO: mismo camino que el usuario real (prefs -> fuente elegida -> tickCapture -> IA -> UI).
  const out = { pasos: [], modoIA: process.env.TERCERO_AI || 'mock' };
  try {
    prefs.set({ onboarded: true, objetivo: 'Flyer para charla de diseno con speaker, 18hs',
      estrategia: 'Que se entienda en 3 segundos', recursos: 'Titular, bloque para foto, horario', plazo: 'Hoy',
      captureIntervalSec: 8, aiConsent: true }); // test: consentimiento simulado (capturas sinteticas autorizadas)
    const sources = await desktopCapturer.getSources({ types: ['window', 'screen'], thumbnailSize: { width: 64, height: 64 } });
    const src = sources.find(x => x.name.startsWith('Tercero Pieza Test'));
    out.pasos.push('fuente elegida: ' + (src ? src.name : 'NO ENCONTRADA'));
    if (!src) throw new Error('fuente pieza no listada');
    currentSourceId = src.id; paused = false;
    captureWin.webContents.send('capture:start-stream', src.id);
    sessionLog.add({ ts: Date.now(), kind: 'session-start', sourceId: src.id });
    scheduleCapture(); // el bucle real: tickCapture -> diff -> ai.analyzeFrame -> hud:suggestion
    // esperar activamente el resultado IA (hasta 55s), no un tiempo fijo: las respuestas pueden tardar >15s
    const t0 = Date.now();
    while (Date.now() - t0 < 55000) {
      await new Promise(r => setTimeout(r, 1000));
      try { if (fs.readFileSync('/tmp/tick-errors.log','utf8').includes('ai-result=')) break; } catch {}
    }
    const log = sessionLog.recent(20).filter(e => e.kind === 'suggestion');
    out.pasos.push('sugerencias generadas por el bucle: ' + log.length);
    out.sugerencias = log.map(e => ({ tipo: e.tipo, texto: e.texto, mock: !!e.mock }));
    const img = await hud.webContents.capturePage();
    fs.writeFileSync('/tmp/tercero-e2e-hud.png', img.toPNG());
    out.ok = log.length > 0;
  } catch (e) { out.ok = false; out.error = String(e && e.message || e); }
  fs.writeFileSync('/tmp/tercero-e2e.json', JSON.stringify(out, null, 2));
  app.quit();
}
// Key Meta: cifrada con el almacen seguro del SO (DPAPI en Windows, keychain en mac/linux).
// Nunca se guarda en claro, nunca llega al renderer, nunca se loguea.
let metaKey = '';
function keyFile() { return require('path').join(app.getPath('userData'), 'meta-key.enc'); }
function loadKey() {
  try { metaKey = safeStorage.decryptString(require('fs').readFileSync(keyFile())); } catch { metaKey = ''; }
}
ai.setKeyProvider(() => metaKey || process.env.META_API_KEY || '');

app.whenReady().then(() => {
  loadKey();
  prefs.init(app.getPath('userData'));
  sessionLog.init(app.getPath('userData'));
  setupDisplayMediaHandler();
  createHud();
  createCaptureWindow();
  companion.init(()=>prefs.get());
  if (!SMOKE && !TEST) createTray();
  if (TEST) { createTestWindow(); setTimeout(runCaptureTest, 7000); }
});

app.on('before-quit', () => { companion.destroy();stopCapture(); if (tray) {tray.destroy();tray=null;} });

app.on('window-all-closed', () => { stopCapture(); app.quit(); });

ipcMain.on('capture:stream-error',(_e,message)=>{pipeline('No se pudo iniciar la captura.');if(hud)hud.webContents.send('hud:error',String(message));});
ipcMain.handle('sources:list', async () => {
  const sources = await desktopCapturer.getSources({ types: ['window', 'screen'], thumbnailSize: { width: 320, height: 180 }, fetchWindowIcons: true });
  return sources.map(s => ({ id: s.id, name: s.name, appIcon: s.appIcon ? s.appIcon.toDataURL() : null, thumb: s.thumbnail.toDataURL() }));
});

ipcMain.handle('capture:start', async (_e, sourceId) => {
  workEpoch++;currentSourceId = sourceId; paused = false;lastFrame=null;snoozedUntil=0;
  captureWin.webContents.send('capture:start-stream', sourceId);
  sessionLog.add({ ts: Date.now(), kind: 'session-start', sourceId });
  scheduleCapture();
  return { ok: true };
});

ipcMain.handle('capture:pause', () => { paused = true; stopCapture(); sessionLog.add({ ts: Date.now(), kind: 'pause' }); return { ok: true }; });
ipcMain.handle('capture:resume', () => { if(!currentSourceId)return {ok:false,error:'Primero elegi una ventana'};snoozedUntil=0;paused = false; if (captureWin) captureWin.webContents.send('capture:start-stream', currentSourceId); scheduleCapture(); sessionLog.add({ ts: Date.now(), kind: 'resume' }); return { ok: true }; });
ipcMain.handle('capture:stop', () => { currentSourceId = null; stopCapture(); sessionLog.add({ ts: Date.now(), kind: 'session-stop' }); return { ok: true }; });

ipcMain.handle('hud:snooze', (_e, minutes) => { companion.setState('pausa');snoozedUntil = Date.now() + Math.max(1, minutes || 10) * 60000; return { snoozedUntil }; });
ipcMain.handle('prefs:get', () => prefs.get());
ipcMain.handle('prefs:set', (_e, patch) => { if(patch.aiMode==='mock'){patch.aiConsent=false;patch.textConsent=false;workEpoch++;}const p = prefs.set(patch); scheduleCapture(); return p; });
ipcMain.handle('session:recent', () => sessionLog.recent(50));
ipcMain.handle('report:draft', () => sessionLog.buildPortfolioDraft(prefs.get()));
ipcMain.handle('hud:feedback', (_e, id, useful) => { sessionLog.addFeedback(id, useful); return { ok: true }; });
ipcMain.handle('hud:set-clickthrough', (_e, on) => { if (hud) hud.setIgnoreMouseEvents(dragTimer?false:!!on, { forward: true }); return { ok: true }; });
let dragTimer=null;function endDrag(){if(dragTimer)clearInterval(dragTimer);dragTimer=null;}ipcMain.on('hud:drag-end',endDrag);ipcMain.on('hud:drag-begin',()=>{if(!hud||uiState.dock)return;endDrag();const c=screen.getCursorScreenPoint(),b=hud.getBounds();hud.setIgnoreMouseEvents(false);dragTimer=setInterval(()=>{if(!hud||hud.isDestroyed())return endDrag();const p=screen.getCursorScreenPoint(),a=screen.getDisplayNearestPoint(p).workArea;const x=Math.max(a.x,Math.min(a.x+a.width-b.width,b.x+p.x-c.x)),y=Math.max(a.y,Math.min(a.y+a.height-b.height,b.y+p.y-c.y));hud.setPosition(Math.round(x),Math.round(y));},16);});app.on('before-quit',endDrag);
// Arrastre manual: -webkit-app-region no funciona de forma confiable en Windows
// cuando la ventana alterna setIgnoreMouseEvents (click-through). El renderer
// manda la posicion destino y el proceso principal mueve la ventana.
ipcMain.on('hud:drag-to', (_e, x, y) => {
  if (!hud) return;
  const nx = Math.round(Number(x)), ny = Math.round(Number(y));
  if (Number.isFinite(nx) && Number.isFinite(ny)) {const b=hud.getBounds(),a=screen.getDisplayNearestPoint({x:nx,y:ny}).workArea;hud.setPosition(Math.max(a.x,Math.min(a.x+a.width-b.width,nx)),Math.max(a.y,Math.min(a.y+a.height-b.height,ny)));}
});
// Notas del chat de contexto: quedan en el registro local y entran al borrador.
ipcMain.handle('session:note', (_e, texto) => {
  const value=typeof texto==='object'&&texto?texto:{texto};
  const t = String(value.texto || '').trim().slice(0, 500);
  if (!t) return { ok: false };
  const replyTo=typeof value.replyTo==='string'?value.replyTo.slice(0,100):null;
  const question=typeof value.question==='string'?value.question.slice(0,400):null;
  sessionLog.add({ ts: Date.now(), kind: 'nota', texto: t, ...(replyTo?{replyTo,question}: {}) });
  return { ok: true };
});
// La ventana se achica/crece con el contenido visible: nada de area invisible que robe clics.
let uiState={panel:false,settings:false,dock:false,details:false};let dockTimer=null;
function placeUi(state){if(!hud)return;uiState=state;const b=hud.getBounds(),area=screen.getDisplayMatching(b).workArea;let w=state.panel?424:(state.details?312:132);const heights={empty:530,active:582,suggestion:544,source:614,options:538,context:614,config:614};let h=state.panel?(heights[state.view]||318):134;if(state.dock){w=state.panel?424:392;h=state.panel?(heights[state.view]||530):114;}if(state.panel&&state.bubble){w=264;h=Math.max(60,Math.min(300,Number(state.bubbleHeight)||120))+(state.dock?114:136);}w=Math.min(w,area.width);h=Math.min(h,area.height);let x=b.x+b.width-w,y=b.y+b.height-h;if(state.dock){x=area.x+Math.round((area.width-w)/2);y=area.y;if(!state.panel)h=114;}x=Math.max(area.x,Math.min(area.x+area.width-w,x));y=Math.max(area.y,Math.min(area.y+area.height-h,y));hud.setBounds({x,y,width:w,height:h});}
ipcMain.handle('hud:layout',(_e,state)=>{placeUi(state);return {ok:true};});
app.whenReady().then(()=>{dockTimer=setInterval(()=>{if(!hud||hud.isDestroyed()||!uiState.dock||uiState.panel)return;const p=screen.getCursorScreenPoint(),b=hud.getBounds();const over=p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height;hud.webContents.send('hud:dock-reveal',over);},160);screen.on('display-metrics-changed',()=>placeUi(uiState));});
app.on('before-quit',()=>{if(dockTimer)clearInterval(dockTimer);});
// Cierre visible y recuperable: la X de la isla cierra la app; se reabre con tercero.exe.
ipcMain.handle('app:quit', () => { app.quit(); return { ok: true }; });
ipcMain.handle('ai:status', () => ({ ...ai.status(prefs.get()), keyStored: !!metaKey }));
ipcMain.handle('ai:set-key', (_e, key) => {
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'safeStorage no disponible en este sistema' };
  require('fs').writeFileSync(keyFile(), safeStorage.encryptString(String(key || '')));
  metaKey = String(key || '');
  return { ok: true };
});
ipcMain.handle('ai:clear-key', () => { metaKey = ''; try { require('fs').unlinkSync(keyFile()); } catch {} return { ok: true }; });

ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('ui:draft', () => {try{const f=path.join(app.getPath('userData'),'pending-ui-draft.json');const d=JSON.parse(fs.readFileSync(f,'utf8'));fs.unlinkSync(f);return d;}catch{return null;}});

ipcMain.handle('comment:reply',async(_e,value)=>{
 const p=prefs.get(),text=String(value?.text||'').trim().slice(0,800),id=String(value?.id||'');if(!text)return {ok:false,error:'Escribí una respuesta.'};
 if(analysisBusy||replyBusy)return {ok:false,error:'Esperá a que termine el análisis actual.'};
 const parent=sessionLog.recent(200).find(e=>e.id===id&&e.kind==='suggestion');if(!parent)return {ok:false,error:'Ese comentario ya no está disponible.'};
 if(ai.status(p).mode==='meta'&&(!p.aiConsent||!p.textConsent))return {ok:false,error:'Falta permiso para enviar tu respuesta a Meta.'};
 replyBusy=true;const epoch=workEpoch;sessionLog.add({ts:Date.now(),kind:'nota',texto:text,replyTo:id});pipeline('Preparando respuesta…');
 try{const r=await ai.reply(text,parent,p,sessionLog.recent(20));if(epoch!==workEpoch)return {ok:false,error:'La sesión cambió. La respuesta anterior no se agregó.'};const entry={id:'sg-'+Date.now(),kind:'suggestion',ts:Date.now(),...r,replyTo:id};sessionLog.add(entry);companion.flash();pipeline('Respuesta lista.');return {ok:true,entry};}catch(e){pipeline('No se pudo responder.');return {ok:false,error:String(e.message)};}finally{replyBusy=false;}
});
