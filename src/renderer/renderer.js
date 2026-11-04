const $ = id => document.getElementById(id);
const show = (id, on) => $(id).style.display = on ? 'block' : 'none';
let prefs = null, capturando = false, pendingQuestion = null, selectedSource = null, currentView = 'home', sourceLoading = false;

// --- Pluma: expresiones segun estado ---
const EXPR = { feliz: 'assets/pluma-feliz.png', pensativa: 'assets/pluma-pensativa.png',
               emocionada: 'assets/pluma-emocionada.png', dormida: 'assets/pluma-dormida.png' };
let exprTimer = null;
function setExpr(nombre, volverMs) {
  const src = EXPR[nombre] || EXPR.dormida;
  $('pluma-pill').src = src; $('pluma-panel').src = src;
  if (exprTimer) { clearTimeout(exprTimer); exprTimer = null; }
  if (volverMs) exprTimer = setTimeout(() => setExpr(capturando ? 'feliz' : 'dormida'), volverMs);
}

function setEstado(txt, modo) {
  $('estado').textContent = txt;if($('header-status'))$('header-status').textContent=txt;const status=$('session-status');if(status){status.textContent=txt;status.classList.toggle('paused',modo==='paused');}
  $('dot').className = modo === 'on' ? 'on' : modo === 'paused' ? 'paused' : '';
}

async function init() {
  for(const selector of ['.settings-footer','.context-footer']){const footer=document.querySelector(selector);$('panel').insertBefore(footer,$('notes-label'));}
  $('version').textContent = 'v' + await window.tercero.version();
  const draft = await window.tercero.pendingDraft();
  if (draft && draft.fields) for (const [id, value] of Object.entries(draft.fields)) { if ($(id)) $(id).value = value; }
  prefs = await window.tercero.getPrefs();
  const ai = await window.tercero.aiStatus();
  $('aiMode').textContent = ai.mode === 'mock' ? 'Demo local' : 'Meta';$('header-mode').textContent=ai.mode==='mock'?'Demo local':'Meta AI';
  setExpr('feliz');
  applyUi();
  $('panel').classList.toggle('open', !!prefs.panelPinned);
  layout();
  show('v-onboarding', false); show('controles', true);setEstado('Sin captura');goView('home');
}

$('b-onboard').onclick = async () => {
  prefs = await window.tercero.setPrefs({
    onboarded: true,
    objetivo: $('f-objetivo').value, estrategia: $('f-estrategia').value,
    recursos: $('f-recursos').value, plazo: $('f-plazo').value
  });
  goView('home');
};

$('b-contexto').onclick = () => {$('panel').classList.add('context');layout();closeViews();show('v-onboarding',true);show('bienvenida',false);};
$('b-cerrar-setup').onclick = () => {$('panel').classList.remove('context');layout();show('v-onboarding',false);show('bienvenida',true);};
$('b-elegir').onclick = () => abrirFuentes();

async function abrirFuentes() {
  if(sourceLoading)return;sourceLoading=true;goView('source');$('lista-fuentes').textContent='Buscando ventanas disponibles…';try{
  $('panel').classList.remove('config','options','context','suggestion','active-session');$('panel').classList.add('source');layout();
  show('v-fuentes', true);show('bienvenida',false);
  const fuentes = await window.tercero.listSources();
  closeViews();show('v-fuentes',true);const lista = $('lista-fuentes'); lista.innerHTML = '';
  for (const f of fuentes) {
    const d = document.createElement('button');d.type='button';
    d.className = 'src';
    const thumb=document.createElement("img");thumb.src=f.thumb;const title=document.createElement("span");title.textContent=f.name;d.append(thumb,title);
    d.onclick = async () => {
      const started=await window.tercero.startCapture(f.id);if(!started?.ok){$('v-error').textContent='No se pudo iniciar la captura.';return;}selectedSource=f;currentView='home';
      capturando = true; show('v-fuentes', false);$('panel').classList.remove('source');layout();
      setEstado('mirando: ' + f.name.slice(0, 28), 'on');
      $('b-pausa').textContent = 'Pausar';
      $('hola').textContent = HOLA_ON;
      setExpr('feliz');goView('home');
    };
    lista.appendChild(d);
  }if(!fuentes.length)lista.textContent='No hay ventanas disponibles. Abrí una ventana y volvé a intentar.';
  }catch(error){$('lista-fuentes').textContent='No se pudieron listar las ventanas.';$('v-error').textContent=error.message;}finally{sourceLoading=false;}
}

const HOLA_IDLE = 'Todavía no estoy mirando nada. Elegí qué ventana acompaño.';
const HOLA_ON = 'Estoy mirando la ventana que elegiste. Si veo algo útil, te cuento acá.';
const HOLA_PAUSA = 'Captura en pausa: no estoy mirando nada hasta que reanudes.';
$('b-pausa').onclick = async () => {
  if(!selectedSource)return abrirFuentes();
  if (capturando) { await window.tercero.pause(); capturando = false; setEstado('pausada', 'paused'); $('b-pausa').textContent = 'Reanudar'; setExpr('dormida'); $('hola').textContent = HOLA_PAUSA; }
  else { const resumed=await window.tercero.resume();if(!resumed?.ok){$('v-error').textContent=resumed?.error||'No se pudo reanudar';return;}capturando = true; setEstado('mirando', 'on'); $('b-pausa').textContent = 'Pausar'; setExpr('feliz'); $('hola').textContent = HOLA_ON; }refreshHome();
};
$('b-posponer').onclick = async () => { if(!selectedSource)return;await window.tercero.snooze(10); setEstado('Ideas silenciadas 10 min', 'paused'); setExpr('dormida'); };
$('b-fuente').onclick = abrirFuentes;
$('b-stop').onclick = async () => {pendingQuestion=null;$('v-sugerencias').replaceChildren(); await window.tercero.stop(); capturando = false;selectedSource=null;goView('home'); setEstado('Sin captura'); setExpr('dormida'); $('hola').textContent = HOLA_IDLE; };

$('b-prefs').onclick = async () => {
  closeViews();show('bienvenida',false);show('v-sugerencias',false);$('panel').classList.remove('source','options','context');$('panel').classList.add('open','config');layout();
  currentView='config';refreshHome();layout();prefs = await window.tercero.getPrefs();
  $('p-dock').value=prefs.dockMode||'floating';$('p-pin').checked=!!prefs.panelPinned;$('p-details').checked=!!prefs.showDetails;$('p-shadow').checked=!!prefs.smallShadow;
  $('p-interval').value = prefs.captureIntervalSec;
  $('p-frecuencia').value = prefs.frecuenciaIntervencion;
  $('p-retencion').value = prefs.frameRetention;
  $('p-modo').value = prefs.aiMode || 'mock';
  $('p-aprendidas').value = (prefs.prefs_aprendidas || []).join('\n');
  $('consent-estado').textContent = prefs.aiMode==='meta'&&prefs.aiConsent ? 'IA activa con permiso. Volver a Demo lo revoca.' : 'En Demo no se envían capturas.';show('meta-consent-view',false);
  const ai = await window.tercero.aiStatus();
  $('key-estado').textContent = ai.keyStored ? 'hay una clave guardada (cifrada)' : '';
  show('v-prefs', true);
};
$('p-modo').onchange=()=>{if($('p-modo').value==='meta'){show('meta-consent-view',true);$('consent-estado').textContent='Requiere tu permiso en este equipo.';}else{show('meta-consent-view',false);}};
$('b-no-consent').onclick=()=>{$('p-modo').value='mock';show('meta-consent-view',false);};
$('b-consent').onclick=async()=>{prefs=await window.tercero.setPrefs({aiMode:'meta',aiConsent:true});$('consent-estado').textContent='Permiso guardado. Elegí una ventana para iniciar captura.';show('meta-consent-view',false);};
$('b-guardar-key').onclick = async () => {
  const r = await window.tercero.setAiKey($('p-key').value);
  $('key-estado').textContent = r.ok ? 'clave guardada cifrada' : ('error: ' + r.error);
  $('p-key').value = '';
};
$('b-borrar-key').onclick = async () => { await window.tercero.clearAiKey(); $('key-estado').textContent = 'clave borrada'; };
$('b-guardar-prefs').onclick = async () => {
  if($('p-modo').value==='meta'&&!(prefs.aiMode==='meta'&&prefs.aiConsent)){show('meta-consent-view',true);return;}
  prefs = await window.tercero.setPrefs({
    aiConsent:$('p-modo').value==='meta'&&!!prefs.aiConsent,
    dockMode:$('p-dock').value,panelPinned:$('p-pin').checked,showDetails:$('p-details').checked,smallShadow:$('p-shadow').checked,
    captureIntervalSec: parseInt($('p-interval').value) || 20,
    frecuenciaIntervencion: $('p-frecuencia').value,
    frameRetention: $('p-retencion').value,
    aiMode: $('p-modo').value,
    prefs_aprendidas: $('p-aprendidas').value.split('\n').filter(Boolean)
  });
  const ai = await window.tercero.aiStatus();
  $('aiMode').textContent = ai.mode === 'mock' ? 'Demo local' : 'Meta';$('header-mode').textContent=ai.mode==='mock'?'Demo local':'Meta AI';
  applyUi();goView('home');
};

$('b-reporte').onclick = async () => {
  const r = await window.tercero.draftReport();
  $('reporte').textContent = r.markdown;
  show('v-reporte', true);
};
$('b-copiar').onclick = () => navigator.clipboard.writeText($('reporte').textContent);
$('b-cerrar-reporte').onclick = () => show('v-reporte', false);

// --- Chat de contexto (estilo C): queda en el registro y entra al borrador ---
async function enviarNota() {
  const t = $('chat-input').value.trim();
  if (!t) return;
  const r = await window.tercero.addNote({texto:t,replyTo:pendingQuestion?.id||null,question:pendingQuestion?.texto||null});
  if (!r.ok) return;
  $('chat-input').value = '';
  const n = document.createElement('div');
  n.className = 'nota'; n.textContent = pendingQuestion ? 'Tu respuesta: '+t : t;
  pendingQuestion=null;$('chat-input').placeholder='Anotar algo para esta sesión…';
  $('v-sugerencias').prepend(n);goView('suggestion');
  setExpr('pensativa', 2500);
}
$('b-chat').onclick = enviarNota;
$('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') enviarNota(); });

window.tercero.onSuggestion(s => {
  setExpr('emocionada', 4000);goView('suggestion');
  if(s.tipo==='pregunta'){pendingQuestion={id:s.id,texto:s.texto};$('chat-input').placeholder='Responder a esta pregunta...';}
  const c = document.createElement('div');
  c.className = 'card';
  c.innerHTML = `<div class="tipo">${s.tipo === 'pregunta' ? 'Pregunta' : 'Sugerencia'}${s.mock ? ' · demo' : ''}</div><div class="txt"></div>
    <div class="row feedback"><button class="primary" data-u="1">Me sirvió</button><button data-u="0">No</button>
    <button data-pos="1">Ahora no</button></div>`;
  c.querySelector('.txt').textContent = s.texto;
  c.querySelector('[data-u="1"]').onclick = () => { window.tercero.feedback(s.id, true); c.remove();if(!$('v-sugerencias').children.length)goView('home'); };
  c.querySelector('[data-u="0"]').onclick = () => { window.tercero.feedback(s.id, false); c.remove();if(!$('v-sugerencias').children.length)goView('home'); };
  c.querySelector('[data-pos]').onclick = () => { window.tercero.snooze(10); c.remove();if(!$('v-sugerencias').children.length)goView('home'); };
  $('v-sugerencias').replaceChildren(c);
  show('bienvenida',false);
  if(s.tipo==='pregunta'||prefs?.panelPinned)$('panel').classList.add('open');
  layout();setTimeout(()=>c.querySelector('.feedback')?.classList.add('ready'),2500);
  c.classList.add('reveal');
});
window.tercero.onPipeline(message=>{if(selectedSource)$('session-status').textContent=message;});
window.tercero.onError(m => { $('v-error').textContent = m; });

// --- Clics y cierre (fix overlay) ---
let ct = null;
function updateCT(e) {
  const over = e.target && e.target.closest ? e.target.closest('#panel,#pill') : null;
  const want = !over;
  if (want !== ct) { ct = want; window.tercero.setClickThrough(want); }
}
document.addEventListener('mousemove', updateCT);
document.addEventListener('mouseleave', () => { ct = true; window.tercero.setClickThrough(true); });

function closeViews(){for(const id of ['v-fuentes','v-onboarding','v-prefs','v-reporte','v-options'])show(id,false);}
function refreshHome(){
 const home=currentView==='home';$('welcome-home').hidden=!(home&&!selectedSource);$('session-home').hidden=!(home&&!!selectedSource);
 $('source-name').textContent=selectedSource?.name||'';
 $('session-pause').textContent=capturando?'Pausar':'Reanudar';
 $('opt-pause').textContent=capturando?'Pausar captura':'Reanudar captura';
 $('opt-pause').disabled=!selectedSource;$('opt-snooze').disabled=!selectedSource;$('opt-stop').disabled=!selectedSource;
 $('panel').classList.toggle('active-session',home&&!!selectedSource);
}
function goView(view){
 currentView=view;closeViews();$('panel').classList.remove('config','source','context','options','suggestion');
 if(view!=='home')$('panel').classList.add(view);
 const map={source:'v-fuentes',context:'v-onboarding',config:'v-prefs',options:'v-options',suggestion:'v-sugerencias'};
 show('v-sugerencias',view==='suggestion');if(map[view])show(map[view],true);
 refreshHome();$('scroll-content').scrollTop=0;layout();
}
function applyUi(){document.body.classList.toggle('details',!!prefs.showDetails);document.body.classList.toggle('shadow',!!prefs.smallShadow);document.body.classList.toggle('dock',prefs.dockMode==='top');$('b-pin').setAttribute('aria-pressed',String(!!prefs.panelPinned));$('b-pin').textContent=prefs.panelPinned?'Fijado':'Fijar';}
function layout(){refreshHome();const panel=$('panel').classList.contains('open');document.body.classList.toggle('idle',!panel);window.tercero.layout({panel,settings:currentView==='config',dock:prefs?.dockMode==='top',details:!!prefs?.showDetails,view:currentView==='home'?(selectedSource?'active':'empty'):currentView});}
function togglePanel(){if(!$('panel').classList.contains('open'))goView('home');$('panel').classList.toggle('open');layout();}
$('b-contexto').onclick=()=>{for(const key of ['objetivo','estrategia','recursos','plazo'])$('f-'+key).value=prefs[key]||'';goView('context');};
$('b-cerrar-setup').onclick=()=>goView('home');$('sources-back').onclick=()=>goView('home');$('settings-back').onclick=()=>goView('home');
$('home-start').onclick=abrirFuentes;$('session-change').onclick=abrirFuentes;$('session-pause').onclick=()=>{$('b-pausa').click();setTimeout(()=>refreshHome(),100);};
$('b-options').onclick=()=>goView('options');$('opt-back').onclick=()=>goView('home');
$('opt-config').onclick=()=>$('b-settings').click();$('opt-pause').onclick=async()=>{await $('b-pausa').onclick();goView('home');};$('opt-snooze').onclick=async()=>{await $('b-posponer').onclick();goView('home');};$('opt-stop').onclick=async()=>{await $('b-stop').onclick();goView('home');};
window.tercero.onBlur(()=>{if(!prefs.panelPinned&&currentView!=='config'){$('panel').classList.remove('open');layout();}});
$('b-close-panel').onclick=()=>{$('panel').classList.remove('open');goView('home');};
$('b-settings').onclick=()=>$('b-prefs').onclick();
$('b-pin').onclick=async()=>{prefs=await window.tercero.setPrefs({panelPinned:!prefs.panelPinned});applyUi();};
$('pill').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();togglePanel();}};
window.tercero.onDockReveal(on=>document.body.classList.toggle('revealed',on));
window.addEventListener('load',()=>{if(prefs)layout();});

$('b-cerrar-app').onclick = (e) => { e.stopPropagation(); window.tercero.quitApp(); };

// --- Arrastre manual de la isla (Windows: app-region no anda con click-through) ---
(function habilitarArrastre() {
  const pill = $('pill');
  let start = null, moved = false, raf = 0;
  pill.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (e.target.closest('#b-cerrar-app')) return;
    start = { cx: e.screenX, cy: e.screenY, wx: window.screenX || 0, wy: window.screenY || 0 };
    moved = false;
    pill.classList.add('dragging');
  });
  document.addEventListener('mousemove', e => {
    if (!start) return;
    const dx = e.screenX - start.cx, dy = e.screenY - start.cy;
    if (!moved && Math.hypot(dx, dy) <= 4) return;
    moved = true;
    if (raf) return;
    const tx = start.wx + dx, ty = start.wy + dy;
    raf = requestAnimationFrame(() => { raf = 0; window.tercero.dragTo(tx, ty); });
  });
  document.addEventListener('mouseup', () => {
    if (start && !moved) togglePanel();
    start = null;
    pill.classList.remove('dragging');
  });
})();

init();

window.tercero.onTrayPaused(() => {capturando=false;setEstado('pausada','paused');refreshHome();$('b-pausa').textContent='Reanudar';$('hola').textContent=HOLA_PAUSA;setExpr('dormida');});
