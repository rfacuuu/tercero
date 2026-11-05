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
  $('estado').textContent = txt;$('island-state').textContent=txt;if($('header-status'))$('header-status').textContent=txt;const status=$('session-status');if(status){status.textContent=txt;status.classList.toggle('paused',modo==='paused');}
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
$('b-stop').onclick = async () => {pendingQuestion=null;comments=[];$('v-sugerencias').replaceChildren(); await window.tercero.stop(); capturando = false;selectedSource=null;goView('home'); setEstado('Sin captura'); setExpr('dormida'); $('hola').textContent = HOLA_IDLE; };

$('b-prefs').onclick = async () => {
  closeViews();show('bienvenida',false);show('v-sugerencias',false);$('panel').classList.remove('source','options','context');$('panel').classList.add('open','config');layout();
  currentView='config';refreshHome();layout();prefs = await window.tercero.getPrefs();
  $('p-response').value=prefs.responseView||'panel';$('p-companion').value=prefs.companionMode==='fixed'?'fixed':'follow';$('p-motion').checked=!!prefs.reduceMotion;$('p-comments').value=prefs.commentPlacement||'edge';refreshSelects();$('p-dock').value=prefs.dockMode||'floating';$('p-pin').checked=!!prefs.panelPinned;$('p-details').checked=!!prefs.showDetails;$('p-shadow').checked=!!prefs.smallShadow;
  $('p-interval').value = prefs.captureIntervalSec;
  $('p-frecuencia').value = prefs.frecuenciaIntervencion;
  $('p-retencion').value = prefs.frameRetention;
  $('p-modo').value = prefs.aiMode || 'mock';
  $('p-aprendidas').value = (prefs.prefs_aprendidas || []).join('\n');
  $('consent-estado').textContent = prefs.aiMode==='meta'&&prefs.aiConsent ? 'IA activa con permiso. Volver a Demo lo revoca.' : 'En Demo no se envían capturas.';show('meta-consent-view',false);
  const ai = await window.tercero.aiStatus();
  $('key-estado').textContent = ai.keyStored ? 'hay una clave guardada (cifrada)' : '';
  show('v-prefs', true);refreshSelects();
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
    responseView:$('p-response').value,companionMode:$('p-companion').value,reduceMotion:$('p-motion').checked,commentPlacement:$('p-comments').value,dockMode:$('p-dock').value,panelPinned:$('p-pin').checked,showDetails:$('p-details').checked,smallShadow:$('p-shadow').checked,
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

let comments=[];
function flashAnswer(){document.body.classList.remove('is-answer');void document.body.offsetWidth;document.body.classList.add('is-answer');setExpr('emocionada',1800);if(prefs?.dockMode!=='top'){$('panel').classList.add('open');layout();}setTimeout(()=>document.body.classList.remove('is-answer'),1400);}
function addComment(s){document.body.classList.toggle('bubble',prefs?.responseView==='bubble');flashAnswer();comments.push(s);if(comments.length>12)comments.shift();renderComments();setExpr('emocionada',2500);goView('suggestion');$('panel').classList.add('open');layout();}
async function saveFeedback(s,useful){try{const r=await window.tercero.feedback(s.id,useful);if(!r.ok)throw Error(r.error||'No se pudo guardar.');s.useful=useful;s.feedbackError='';}catch(e){s.feedbackError=String(e.message);}renderComments();}
async function openReply(s){s.replyOpen=!s.replyOpen;s.collapsed=false;renderComments();layout();if(s.replyOpen){await window.tercero.focusEditor();requestAnimationFrame(()=>{const card=[...document.querySelectorAll('.comment')].find(c=>c.dataset.id===s.id),input=card?.querySelector('.reply-input');card?.querySelector('.reply-box')?.scrollIntoView({block:'end'});input?.focus({preventScroll:true});});}}
function renderComments(){const list=$('v-sugerencias');list.replaceChildren();if(!comments.length){list.textContent='No hay comentarios pendientes.';return;}
 const info=document.createElement('div');info.className='comments-explainer';info.textContent='Comentarios flotantes. Mover desde la cabecera; no se anclan a objetos de la pieza.';list.append(info);
 for(const s of comments){const card=document.createElement('div');card.className='comment'+(s.collapsed?' collapsed':'');card.dataset.id=s.id;if(s.tipo==='pregunta'||/[?¿]/.test(s.texto))card.classList.add('question');
 const head=document.createElement('div');head.className='comment-header';const icon=document.createElement('img');icon.src='assets/pluma-feliz.png';const title=document.createElement('strong');title.textContent='Tercero'+(s.mock?' · Demo':'');const min=document.createElement('button');min.innerHTML='<img class=ph-icon alt="" src="assets/icons/'+(s.collapsed?'plus':'minus')+'.svg">';min.title=s.collapsed?'Abrir comentario':'Minimizar comentario';min.onclick=()=>{s.collapsed=!s.collapsed;renderComments();};const close=document.createElement('button');close.innerHTML='<img class=ph-icon alt="" src="assets/icons/check.svg">';close.title='Resolver comentario';close.onclick=()=>{comments=comments.filter(x=>x!==s);renderComments();};head.append(icon,title,min,close);
 const body=document.createElement('div');body.className='comment-body';const tipo=document.createElement('div');tipo.className='tipo';tipo.textContent=s.tipo==='pregunta'?'Pregunta necesaria':'Sugerencia';const txt=document.createElement('div');txt.className='txt';txt.textContent=s.texto;const row=document.createElement('div');row.className='row';
 for(const [label,fn] of [[s.useful===true?'Me sirvió ✓':'Me sirvió',()=>saveFeedback(s,true)],[s.useful===false?'No me sirve ✓':'No me sirve',()=>saveFeedback(s,false)],['Contestar',()=>openReply(s)]]){const bt=document.createElement('button');bt.textContent=label;bt.onclick=fn;row.append(bt);}body.append(tipo,txt,row);if(s.tipo==='pregunta'||/[?¿]/.test(s.texto)){const reply=document.createElement('button');reply.className='bubble-reply';reply.textContent='Responder';reply.onclick=()=>openReply(s);body.append(reply);}
 for(const e of s.thread||[]){const item=document.createElement('div');item.className='thread-entry'+(e.ai?' ai':'');item.textContent=(e.ai?'Tercero: ':'Vos: ')+e.text;body.append(item);}
 if(s.replyOpen){const box=document.createElement('div');box.className='reply-box';const input=document.createElement('textarea');input.className='reply-input';input.placeholder='Contestar a este comentario…';input.maxLength=800;input.value=s.draft||'';input.oninput=()=>s.draft=input.value;const send=document.createElement('button');send.className='primary';send.textContent=s.sending?'Enviando…':'Enviar respuesta';send.disabled=!!s.sending;const status=document.createElement('div');status.className='reply-status';status.textContent=s.error||(s.mock?'Demo: guarda un hilo local, no consulta IA.':'Meta recibirá tu texto y el contexto reciente. No se envía una captura nueva.');
 send.onclick=async()=>{const value=input.value.trim();if(!value||s.sending)return;
 prefs=await window.tercero.getPrefs();const activeAi=await window.tercero.aiStatus();if(activeAi.mode==='meta'&&!prefs.textConsent){if(!window.confirm('Para contestar, se enviará tu texto y el contexto reciente de esta sesión a Meta. No se toma una captura nueva. ¿Permitís este envío y las respuestas siguientes?'))return;prefs=await window.tercero.setPrefs({textConsent:true});}
 s.sending=true;s.error='';renderComments();const result=await window.tercero.reply({id:s.id,text:value});s.sending=false;if(result.ok){flashAnswer();s.thread=s.thread||[];s.thread.push({text:value},{text:result.entry.texto,ai:true});s.draft='';}else s.error=result.error||'No se pudo responder.';renderComments();};box.append(input,send,status);body.append(box);}
 const note=document.createElement('div');note.className='feedback-status';note.textContent=s.feedbackError||(s.useful===true?'Guardado: te sirvió.':s.useful===false?'Guardado: no te sirve. Se tendrá en cuenta en los próximos aportes.':'');row.after(note);card.append(head,body);list.append(card);}}
window.tercero.onSuggestion(addComment);
window.tercero.onPipeline(message=>{$('island-state').textContent=message;const thinking=/Analizando|Preparando/.test(message);document.body.classList.toggle('is-thinking',thinking);if(thinking)setExpr('pensativa');document.body.classList.toggle('is-paused',/pausa|Sin captura/.test(message));if(selectedSource)$('session-status').textContent=message;});
window.tercero.onError(m => { $('v-error').textContent = m; });

// --- Clics y cierre (fix overlay) ---
let ct = null;
function updateCT(e) {
  if($('pill').classList.contains('dragging')){ct=false;window.tercero.setClickThrough(false);return;}
  const over = e.target && e.target.closest ? e.target.closest('#panel,#pill') : null;
  const want = !over;
  if (want !== ct) { ct = want; window.tercero.setClickThrough(want); }
}
document.addEventListener('mousemove', updateCT);
document.addEventListener('mouseleave', () => { if($('pill').classList.contains('dragging'))return;ct = true; window.tercero.setClickThrough(true); });

function closeViews(){for(const id of ['v-fuentes','v-onboarding','v-prefs','v-reporte','v-options'])show(id,false);}
function refreshHome(){if($('island-source')){$('island-source').textContent=selectedSource?.name||'Sin ventana elegida';$('island-mode').textContent=prefs?.aiMode==='meta'?'Meta AI':'Demo local';$('island-comments').textContent=document.querySelectorAll('#v-sugerencias .comment').length+' comentarios';}
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
$('bubble-expand').onclick=()=>{document.body.classList.remove('bubble');layout();};
function layout(){refreshHome();const panel=$('panel').classList.contains('open');document.body.classList.toggle('idle',!panel);window.tercero.layout({panel,bubble:document.body.classList.contains('bubble')&&currentView==='suggestion',bubbleHeight:Math.ceil($('panel').getBoundingClientRect().height),settings:currentView==='config',dock:prefs?.dockMode==='top',details:!!prefs?.showDetails,view:currentView==='home'?(selectedSource?'active':'empty'):currentView});}
function togglePanel(){if(!$('panel').classList.contains('open'))goView(comments.length?'suggestion':'home');$('panel').classList.toggle('open');layout();}
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
let dockHideTimer=null;window.tercero.onDockReveal(on=>{if(on){clearTimeout(dockHideTimer);dockHideTimer=null;document.body.classList.add('revealed');}else if(!dockHideTimer)dockHideTimer=setTimeout(()=>{document.body.classList.remove('revealed');dockHideTimer=null;},350);});
window.addEventListener('load',()=>{if(prefs)layout();});

$('b-cerrar-app').onclick = (e) => { e.stopPropagation(); window.tercero.quitApp(); };

// --- Arrastre manual de la isla (Windows: app-region no anda con click-through) ---
(function habilitarArrastre(){const pill=$('pill');let start=null,moved=false;function finish(e,cancel=false){if(!start)return;window.tercero.dragEnd();pill.classList.remove('dragging');if(!moved&&!cancel)togglePanel();start=null;try{pill.releasePointerCapture(e.pointerId);}catch{}}
pill.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('#b-cerrar-app'))return;start={x:e.screenX,y:e.screenY};moved=false;pill.setPointerCapture(e.pointerId);pill.classList.add('dragging');window.tercero.setClickThrough(false);});pill.addEventListener('pointermove',e=>{if(!start)return;if(!moved&&Math.hypot(e.screenX-start.x,e.screenY-start.y)>4){moved=true;window.tercero.dragBegin();}});pill.addEventListener('pointerup',e=>finish(e));pill.addEventListener('pointercancel',e=>finish(e,true));pill.addEventListener('lostpointercapture',e=>finish(e,true));window.addEventListener('blur',()=>{if(start){window.tercero.dragEnd();start=null;pill.classList.remove('dragging');}});})();

function refreshSelects(){document.querySelectorAll('.custom-select').forEach(w=>{const select=w.previousElementSibling;w.querySelector('.select-trigger').textContent=(select.selectedOptions[0]?.textContent||'Elegir')+'  ⌄';w.querySelectorAll('[data-value]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.value===select.value)));});}
function setupSelects(){document.querySelectorAll('select:not([disabled])').forEach(select=>{select.hidden=true;const w=document.createElement('div');w.className='custom-select';const bt=document.createElement('button');bt.type='button';bt.className='select-trigger';bt.setAttribute('aria-label',select.previousElementSibling?.textContent||'Elegir');bt.setAttribute('aria-expanded','false');const menu=document.createElement('div');menu.className='select-menu';menu.setAttribute('role','listbox');for(const opt of select.options){const item=document.createElement('button');item.type='button';item.dataset.value=opt.value;item.setAttribute('role','option');item.textContent=opt.textContent;item.onclick=()=>{select.value=opt.value;select.dispatchEvent(new Event('change'));w.classList.remove('open');bt.setAttribute('aria-expanded','false');refreshSelects();};menu.append(item);}bt.onclick=()=>{const on=!w.classList.contains('open');document.querySelectorAll('.custom-select.open').forEach(x=>x.classList.remove('open'));w.classList.toggle('open',on);bt.setAttribute('aria-expanded',String(on));};w.append(bt,menu);select.after(w);});refreshSelects();}
setupSelects();
// Header drag moves the floating comment panel, never the underlying design.
$('panel-top').addEventListener('mousedown',e=>{if(e.target.closest('button')||e.button!==0)return;const sx=e.screenX,sy=e.screenY,wx=window.screenX,wy=window.screenY;const move=v=>window.tercero.dragTo(wx+v.screenX-sx,wy+v.screenY-sy);const up=()=>{document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);};document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);});
init();

window.tercero.onTrayPaused(() => {capturando=false;setEstado('pausada','paused');refreshHome();$('b-pausa').textContent='Reanudar';$('hola').textContent=HOLA_PAUSA;setExpr('dormida');});
new ResizeObserver(()=>{if(document.body.classList.contains('bubble')&&currentView==='suggestion')layout();}).observe($('panel'));
