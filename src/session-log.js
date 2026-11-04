// Registro local de sesion (JSONL). Base del borrador de portfolio.
// Por defecto NO se guardan frames: solo descripciones y eventos.
const fs = require('fs');
const path = require('path');
let file = null;
let entries = [];
function init(dir) { file = path.join(dir, 'tercero-session.jsonl'); try { entries = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { entries = []; } }
function persist() { fs.writeFileSync(file, entries.map(e => JSON.stringify(e)).join('\n') + '\n'); }
function add(e) { entries.push(e); persist(); return e; }
function recent(n = 20) { return entries.slice(-n); }
function addFeedback(id, useful) { const e = entries.find(x => x.id === id); if (e) { e.useful = useful; persist(); } }
// Deteccion barata de avance: compara longitud y muestreo del dataURL (sin decodificar).
function frameChanged(prev,next){if(!prev||!next||prev.length!==next.length)return true;let changed=0,total=0;for(let i=0;i<next.length;i+=3){const d=(Math.abs(prev[i]-next[i])+Math.abs(prev[i+1]-next[i+1])+Math.abs(prev[i+2]-next[i+2]))/3;total+=d;if(d>18)changed++;}const pixels=next.length/3;return changed/pixels>=.012 && total/pixels>=.5;}
// Borrador de caso de portfolio: solo con lo registrado y aprobado en sesion. Sin inventar resultados.
function buildPortfolioDraft(p) {
  const sugs = entries.filter(e => e.kind === 'suggestion');
  const hayMock = sugs.some(e => e.mock);
  const kept = sugs.filter(e => e.useful === true);
  const h = n => new Date(n).toLocaleString('es-AR');
  let md = `# Caso de diseno - borrador (Tercero)\n\n`;
  if (hayMock) md += `> NOTA: sesion de demostracion. Las sugerencias marcadas como demo son heuristicas locales de prueba, NO analisis de IA. No usar este borrador como caso real.\n\n`;
  md += `## Contexto\n- Objetivo: ${p.objetivo || '(completar)'}\n- Estrategia: ${p.estrategia || '(completar)'}\n- Recursos: ${p.recursos || '(completar)'}\n- Plazo: ${p.plazo || '(completar)'}\n\n`;
  md += `## Proceso (registro real de la sesion)\n`;
  for (const e of entries) {
    if (e.kind === 'suggestion') md += `- ${h(e.ts)} - ${e.texto || ''}${e.useful === true ? ' (aplicada)' : e.useful === false ? ' (descartada)' : ''}\n`;
    if (e.kind === 'nota') md += `- ${h(e.ts)} - Nota: ${e.texto}\n`;
  }
  md += `\n## Decisiones\n${kept.length ? kept.map(e => `- ${e.texto}`).join('\n') : '(se completan al revisar)'}\n`;
  md += `\n---\nBorrador generado localmente por Tercero a partir del proceso real. Revisar antes de compartir.\n`;
  return { markdown: md, sugerencias: sugs.length, aplicadas: kept.length };
}
module.exports = { init, add, recent, addFeedback, frameChanged, buildPortfolioDraft };
