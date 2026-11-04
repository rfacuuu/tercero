// Preferencias del usuario: visibles y editables (respuesta 5: control y aprendizaje honesto).
const fs = require('fs');
const path = require('path');
let file = null;
let data = null;
const DEFAULTS = {
  onboarded: false,
  objetivo: '', estrategia: '', recursos: '', plazo: '',
  captureIntervalSec: 20,
  frecuenciaIntervencion: 'media', // baja | media | alta
  frameRetention: 'descartar',     // descartar | guardar-local
  prefs_aprendidas: [],            // reglas aprendidas del feedback, editables
  aiConsent: false,
  aiMode: 'mock'                     // mock | meta - elegido en Preferencias, sin variables de entorno                 // consentimiento explicito para enviar capturas a Meta
};
function init(dir) { file = path.join(dir, 'tercero-prefs.json'); try { data = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { data = { ...DEFAULTS }; } }
function get() { return data; }
function set(patch) { data = { ...data, ...patch }; fs.writeFileSync(file, JSON.stringify(data, null, 2)); return data; }
module.exports = { init, get, set };
