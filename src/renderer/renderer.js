const $ = id => document.getElementById(id);
const show = (id, on) => $(id).style.display = on ? 'block' : 'none';
let prefs = null, capturando = false;

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
  $('estado').textContent = txt;
  $('dot').className = modo === 'on' ? 'on' : modo === 'paused' ? 'paused' : '';
}

async function init() {
  $('version').textContent = 'v' + await window.tercero.version();
  const draft = await window.tercero.pendingDraft();
  if (draft && draft.fields) for (const [id, value] of Object.entries(draft.fields)) { if ($(id)) $(id).value = value; }
  prefs = await window.tercero.getPrefs();
  const ai = await window.tercero.aiStatus();
  $('aiMode').textContent = ai.mode === 'mock' ? 'demo sin IA' : 'Meta';
  setExpr('dormida');
  $('panel').classList.add('open');
  show('v-onboarding', false); show('controles', true);
}

$('b-onboard').onclick = async () => {
  prefs = await window.tercero.setPrefs({
    onboarded: true,
    objetivo: $('f-objetivo').value, estrategia: $('f-estrategia').value,
    recursos: $('f-recursos').value, plazo: $('f-plazo').value
  });
  show('v-onboarding', false); show('bienvenida', true); show('controles', true);
};

$('b-contexto').onclick = () => {show('v-onboarding',true);show('bienvenida',false);};
$('b-cerrar-setup').onclick = () => {show('v-onboarding',false);show('bienvenida',true);};
$('b-elegir').onclick = () => abrirFuentes();

async function abrirFuentes() {
  show('v-fuentes', true);show('bienvenida',false);
  const fuentes = await window.tercero.listSources();
  const lista = $('lista-fuentes'); lista.innerHTML = '';
  for (const f of fuentes) {
    const d = document.createElement('div');
    d.className = 'src';
    d.innerHTML = `<img src="${f.thumb}"><span>${f.name}</span>`;
    d.onclick = async () => {
      await window.tercero.startCapture(f.id);
      capturando = true; show('v-fuentes', false);
      setEstado('mirando: ' + f.name.slice(0, 28), 'on');
      $('b-pausa').textContent = 'Pausar';
      $('hola').textContent = HOLA_ON;
      setExpr('feliz');
    };
    lista.appendChild(d);
  }
}

const HOLA_IDLE = 'Todavía no estoy mirando nada. Elegí qué ventana acompaño.';
const HOLA_ON = 'Estoy mirando la ventana que elegiste. Si veo algo útil, te cuento acá.';
const HOLA_PAUSA = 'Captura en pausa: no estoy mirando nada hasta que reanudes.';
$('b-pausa').onclick = async () => {
  if (capturando) { await window.tercero.pause(); capturando = false; setEstado('pausada', 'paused'); $('b-pausa').textContent = 'Reanudar'; setExpr('dormida'); $('hola').textContent = HOLA_PAUSA; }
  else { await window.tercero.resume(); capturando = true; setEstado('mirando', 'on'); $('b-pausa').textContent = 'Pausar'; setExpr('feliz'); $('hola').textContent = HOLA_ON; }
};
$('b-posponer').onclick = async () => { await window.tercero.snooze(10); setEstado('pospuesta 10 min', 'paused'); setExpr('dormida'); $('hola').textContent = HOLA_PAUSA; };
$('b-fuente').onclick = abrirFuentes;
$('b-stop').onclick = async () => { await window.tercero.stop(); capturando = false; setEstado('sin captura'); setExpr('dormida'); $('hola').textContent = HOLA_IDLE; };

$('b-prefs').onclick = async () => {
  prefs = await window.tercero.getPrefs();
  $('p-interval').value = prefs.captureIntervalSec;
  $('p-frecuencia').value = prefs.frecuenciaIntervencion;
  $('p-retencion').value = prefs.frameRetention;
  $('p-modo').value = prefs.aiMode || 'mock';
  $('p-aprendidas').value = (prefs.prefs_aprendidas || []).join('\n');
  $('consent-estado').textContent = prefs.aiConsent ? 'activado - podés revocarlo cambiando el modo a Demo' : '';
  const ai = await window.tercero.aiStatus();
  $('key-estado').textContent = ai.keyStored ? 'hay una clave guardada (cifrada)' : '';
  show('v-prefs', true);
};
$('b-consent').onclick = async () => {
  prefs = await window.tercero.setPrefs({ aiConsent: true });
  $('consent-estado').textContent = 'activado - podés revocarlo cambiando el modo a Demo';
};
$('b-guardar-key').onclick = async () => {
  const r = await window.tercero.setAiKey($('p-key').value);
  $('key-estado').textContent = r.ok ? 'clave guardada cifrada' : ('error: ' + r.error);
  $('p-key').value = '';
};
$('b-borrar-key').onclick = async () => { await window.tercero.clearAiKey(); $('key-estado').textContent = 'clave borrada'; };
$('b-guardar-prefs').onclick = async () => {
  prefs = await window.tercero.setPrefs({
    captureIntervalSec: parseInt($('p-interval').value) || 20,
    frecuenciaIntervencion: $('p-frecuencia').value,
    frameRetention: $('p-retencion').value,
    aiMode: $('p-modo').value,
    prefs_aprendidas: $('p-aprendidas').value.split('\n').filter(Boolean)
  });
  const ai = await window.tercero.aiStatus();
  $('aiMode').textContent = ai.mode === 'mock' ? 'demo sin IA' : 'Meta';
  show('v-prefs', false);
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
  const r = await window.tercero.addNote(t);
  if (!r.ok) return;
  $('chat-input').value = '';
  const n = document.createElement('div');
  n.className = 'nota'; n.textContent = t;
  $('v-sugerencias').prepend(n);
  setExpr('pensativa', 2500);
}
$('b-chat').onclick = enviarNota;
$('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') enviarNota(); });

window.tercero.onSuggestion(s => {
  setExpr('emocionada', 4000);
  const c = document.createElement('div');
  c.className = 'card';
  c.innerHTML = `<div class="tipo">${s.tipo === 'pregunta' ? 'Pregunta' : 'Sugerencia'}${s.mock ? ' · demo' : ''}</div><div class="txt"></div>
    <div class="row"><button class="primary" data-u="1">Me sirvió</button><button data-u="0">No</button>
    <button data-pos="1">Ahora no</button></div>`;
  c.querySelector('.txt').textContent = s.texto;
  c.querySelector('[data-u="1"]').onclick = () => { window.tercero.feedback(s.id, true); c.remove(); };
  c.querySelector('[data-u="0"]').onclick = () => { window.tercero.feedback(s.id, false); c.remove(); };
  c.querySelector('[data-pos]').onclick = () => { window.tercero.snooze(10); c.remove(); };
  $('v-sugerencias').replaceChildren(c);
  show('bienvenida',false);
  $('panel').classList.add('open');
});
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

// La ventana se ajusta al alto visible: nada de area transparente que robe clics.
const isla = $('isla');
const avisarAlto = () => window.tercero.setHeight(isla.offsetHeight + 4);
new ResizeObserver(avisarAlto).observe(isla);
window.addEventListener('load', avisarAlto);

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
    if (start && !moved) $('panel').classList.toggle('open');
    start = null;
    pill.classList.remove('dragging');
  });
})();

init();

window.tercero.onTrayPaused(() => {capturando=false;setEstado('pausada','paused');$('b-pausa').textContent='Reanudar';$('hola').textContent=HOLA_PAUSA;setExpr('dormida');});
