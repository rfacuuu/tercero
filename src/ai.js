// Adaptador de IA.
// MODO MOCK (default): sin red, sin costo. Sugerencias heuristicas de demostracion.
// MODO META: POST a Meta Model API (Responses) con la captura + contexto de onboarding.
//   Activo SOLO si: modo meta (prefs o TERCERO_AI en tests), hay key (vault, variable de entorno local del
//   usuario), y el usuario autorizo enviar capturas + creditos gratuitos.
//   Nunca se llama en otro caso. Modelo: muse-spark-1.3 (imagen -> texto).
const https = require('https');
// Modo efectivo: TERCERO_AI (tests) > preferencia del usuario > mock.
// En la PC del usuario el modo se elige en Preferencias; sin variables de entorno.
function modeOf(prefs) { return process.env.TERCERO_AI || (prefs && prefs.aiMode) || 'mock'; }
let keyProvider = () => process.env.META_API_KEY || '';
function setKeyProvider(fn) { keyProvider = fn; }
const META_MODEL = process.env.META_MODEL || 'muse-spark-1.3';
let counter = 0;

const BANCO = [
  { tipo: 'estructura', texto: 'El titular podria ganar jerarquia: si el objetivo es lectura rapida, probá subir 1-2 pasos el tamano.' },
  { tipo: 'estructura', texto: 'Hay varios elementos compitiendo en el mismo plano; agrupar lo secundario liberaria foco.' },
  { tipo: 'pregunta', texto: 'Esta pieza es para feed o para historia? Cambia el peso que conviene darle al texto.' },
  { tipo: 'pregunta', texto: 'El elemento nuevo que agregaste, apunta al objetivo que marcaste o es exploracion?' }
];

function status(prefs) { const m = modeOf(prefs); return { mode: m, metaReady: m === 'meta' && !!keyProvider() }; }

function promptDiseno(prefs, recent=[]) {
  return `Sos Tercero, un companero de diseno que observa capturas del trabajo del usuario.
Intervenciones recientes (no repetir): ${recent.filter(e=>e.kind==='suggestion'||e.kind==='nota').slice(-8).map(e=>e.texto+(e.useful===false?' [NO LE SIRVIÓ: no repetir este enfoque]':e.useful===true?' [LE SIRVIÓ]':'')).join(' | ')}
Contexto declarado por el usuario:
- Objetivo: ${prefs.objetivo || '(no declarado)'}
- Estrategia: ${prefs.estrategia || '(no declarada)'}
- Recursos: ${prefs.recursos || '(no declarados)'}
- Plazo: ${prefs.plazo || '(no declarado)'}
Reglas aprendidas del usuario (respetarlas): ${(prefs.prefs_aprendidas || []).join('; ') || '(ninguna aun)'}
Tu rol: sugerir sobre estructura (jerarquia, tamano de texto, posicion segun imagenes/recursos, estrategia de diseno) con criterio crítico honesto. No elogies por defecto ni valides una pieza sólo para agradar. Evaluá legibilidad/contraste, jerarquía, alineación, espaciado, composición y adecuación al objetivo según lo que realmente se ve. Si hay un problema visible, nombrá el elemento y el problema concreto, explicá por qué perjudica el objetivo y proponé un cambio específico y comprobable. No inventes defectos: si no podés verlos con seguridad, expresá la incertidumbre o callá. Reconocé un acierto sólo si es específico y aporta a una decisión; no lo uses como relleno ni como prefacio obligatorio. Si el usuario marcó un aporte como no útil, cambiá el enfoque, no repitas esa recomendación con otras palabras. Preguntá SOLO cuando falte un dato imprescindible y no esté ya en contexto. No cierres cada aporte con una pregunta. No repitas preguntas ni sugerencias recientes. NUNCA modificar el diseno: el criterio y los cambios son del usuario. No ser encimoso: una sola intervencion breve por avance, maximo 2 oraciones. Si no hay nada util que decir, responde exactamente "SIN_SUGERENCIA".
Respondé en JSON: {"tipo":"estructura|pregunta|recursos","texto":"..."}`;
}

function callMetaResponses(jpegDataUrl, prefs, recent=[], replyText=null) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: META_MODEL,
      input: [{ role: 'user', content: [
        { type: 'input_text', text: promptDiseno(prefs,recent)+(replyText?'\nRespuesta del usuario al comentario: '+replyText+'\nRespondé a su punto. No hay imagen nueva en este intercambio.':'') },
        ...(jpegDataUrl?[{ type: 'input_image', image_url: jpegDataUrl }]:[])
      ] }]
    });
    const req = https.request({
      hostname: 'api.meta.ai', path: '/v1/responses', method: 'POST',
      headers: { 'Authorization': 'Bearer ' + keyProvider(), 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (process.env.TERCERO_AI_DEBUG) { try { require('fs').writeFileSync('/tmp/meta-raw-' + Date.now() + '.json', data); } catch {} } // solo cuerpo respuesta; key/headers jamas
        if (res.statusCode !== 200) return reject(new Error('Meta API ' + res.statusCode + ': ' + data.slice(0, 200)));
        try {
          const j = JSON.parse(data);
          const txt = (j.output_text || (j.output || []).flatMap(o => (o.content || []).map(c => c.text || '')).join(' ')).trim();
          if (!txt || txt.includes('SIN_SUGERENCIA')) return resolve(null);
          const parsed = JSON.parse(txt.replace(/```json|```/g, '').trim());
          resolve({ tipo: parsed.tipo || 'estructura', texto: String(parsed.texto || '').slice(0, 400) });
        } catch (e) { reject(new Error('Respuesta Meta no parseable')); }
      });
    });
    req.setTimeout(60000,()=>req.destroy(new Error('Meta no respondió a tiempo.')));
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function analyzeFrame(jpegDataUrl, prefs, recent) {
  counter++;
  const id = 'sg-' + Date.now() + '-' + counter;
  if (modeOf(prefs) === 'mock') {
    const pick = BANCO[(counter-1)%2];
    return { id, tipo: pick.tipo, texto: pick.texto, mock: true };
  }
  if (!keyProvider()) throw new Error('Modo Meta sin key: no configurada');
  const r = await callMetaResponses(jpegDataUrl, prefs,recent);
  if(r&&r.tipo==='pregunta'&&recent.filter(e=>e.kind==='suggestion').slice(-3).some(e=>e.tipo==='pregunta'))return null;
  if(r&&recent.slice(-8).some(e=>e.texto===r.texto))return null;
  if (!r) return null; // el modelo decidio no intervenir
  return { id, ...r };
}
async function reply(text,parent,prefs,recent){if(modeOf(prefs)==='mock')return {tipo:'estructura',texto:'Demo local: tu respuesta quedó en el hilo. En este modo no hay conversación con IA.',mock:true};if(!prefs.aiConsent||!prefs.textConsent||!keyProvider())throw Error('Falta permiso o clave de Meta.');return await callMetaResponses(null,prefs,[...recent,{kind:'suggestion',texto:parent.texto}],text)||{tipo:'estructura',texto:'No tengo otro aporte útil sobre ese punto.'};}
module.exports = { status, analyzeFrame, setKeyProvider,reply };
