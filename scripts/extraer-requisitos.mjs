// Genera docs/requisitos.json desde la tabla de RF del Documento PG (03-cap2a.md).
// Uso: node scripts/extraer-requisitos.mjs [ruta/03-cap2a.md]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEFAULT_FUENTE =
  '../Documentos para mi proyecto de titulacion/Documento PG - Trabajo/fuente/03-cap2a.md';
const SALIDA = new URL('../docs/requisitos.json', import.meta.url);

/** @returns {{id:string,actor:string,titulo:string,modulo:string}[]} */
export function parsear(texto) {
  const reqs = [];
  let modulo = '';
  for (const linea of texto.split('\n')) {
    const h = linea.match(/^#### 2\.3\.1\.\d+\. (M\d\d)\b/);
    if (h) modulo = h[1];
    const f = linea.match(/^\| (RF-\d\d) \| ([^|]+) \| ([^|]+) \|/);
    if (f) reqs.push({ id: f[1], actor: f[2].trim(), titulo: f[3].trim(), modulo });
  }
  return reqs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ruta = process.argv[2] ?? fileURLToPath(new URL(`../${DEFAULT_FUENTE}`, import.meta.url));
  const reqs = parsear(readFileSync(ruta, 'utf8'));
  if (reqs.length !== 35) throw new Error(`Se esperaban 35 RF y se hallaron ${reqs.length}`);
  writeFileSync(SALIDA, JSON.stringify(reqs, null, 2) + '\n');
  console.log(`docs/requisitos.json: ${reqs.length} RF`);
}
