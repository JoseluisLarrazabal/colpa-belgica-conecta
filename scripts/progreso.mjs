// Corre Jest en cada app con tests, cruza los tests (RF-NN en el nombre)
// con docs/requisitos.json y escribe docs/progreso.md.
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));

/** Por RF: tests aprobados y no aprobados (fallidos, pendientes, omitidos) a partir de reportes `jest --json`. */
export function contarPorRF(reportes) {
  const porRF = new Map();
  for (const r of reportes) {
    for (const suite of r.testResults) {
      for (const t of suite.assertionResults) {
        for (const id of new Set(t.fullName.match(/RF-\d\d/g) ?? [])) {
          const c = porRF.get(id) ?? { ok: 0, mal: 0 };
          c[t.status === 'passed' ? 'ok' : 'mal']++;
          porRF.set(id, c);
        }
      }
    }
  }
  return porRF;
}

// Cubierto = al menos un test verde y ninguno rojo/pendiente.
const cubierto = (c) => !!c && c.ok > 0 && c.mal === 0;

// Celda por app: tests verdes (con aviso si hay fallidos) o guion si no hay tests del RF.
const celda = (c) => (!c ? '—' : c.mal ? `${c.ok} (${c.mal} no verdes)` : String(c.ok));

/** `porApp`: { API: Map, Móvil: Map } con el mismo formato que `contarPorRF`, para mostrar dónde se cubre cada RF. */
export function renderizar(reqs, porRF, fecha, porApp = {}) {
  const apps = Object.keys(porApp);
  const cubiertos = reqs.filter((r) => cubierto(porRF.get(r.id))).length;
  const pct = ((cubiertos / reqs.length) * 100).toFixed(1);
  const filas = reqs.map((r) => {
    const c = porRF.get(r.id) ?? { ok: 0, mal: 0 };
    const estado = c.mal ? 'Falla' : c.ok ? 'Con test verde' : 'Pendiente';
    const porCol = apps.map((a) => celda(porApp[a].get(r.id)));
    return `| ${[r.id, r.modulo, r.titulo, estado, c.ok, ...porCol].join(' | ')} |`;
  });
  return {
    pct,
    cubiertos,
    md: [
      '# Progreso por requerimiento funcional',
      '',
      `Generado el ${fecha} por \`pnpm progreso\`.`,
      '',
      `**Avance: ${cubiertos}/${reqs.length} RF con al menos un test verde y ninguno fallido (${pct}%).** Solo cuentan los tests de \`apps/*\`.`,
      '',
      `| ${['RF', 'Módulo', 'Título', 'Estado', 'Tests verdes', ...apps].join(' | ')} |`,
      `|${['----', '--------', '--------', '--------', '--------------', ...apps.map(() => '------')].join('|')}|`,
      ...filas,
      '',
    ].join('\n'),
  };
}

function correrJest(dir) {
  const salida = join(mkdtempSync(join(tmpdir(), 'jest-')), 'reporte.json');
  spawnSync('pnpm', ['--dir', dir, 'run', 'test', '--json', `--outputFile=${salida}`], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (!existsSync(salida)) throw new Error(`Jest no generó reporte en ${dir}`);
  return JSON.parse(readFileSync(salida, 'utf8'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const reqs = JSON.parse(readFileSync(join(raiz, 'docs/requisitos.json'), 'utf8'));
  // packages/* nunca es evidencia de un RF: solo se leen los reportes de apps/*.
  // Tiene tests si hay jest.config* o una clave `jest` en package.json (la app móvil usa esta).
  const conJest = (d) =>
    statSync(d).isDirectory() &&
    existsSync(join(d, 'package.json')) &&
    (readdirSync(d).some((f) => f.startsWith('jest.config')) ||
      !!JSON.parse(readFileSync(join(d, 'package.json'), 'utf8')).jest);
  const dirs = readdirSync(join(raiz, 'apps'))
    .map((d) => join(raiz, 'apps', d))
    .filter(conJest);
  const nombres = { api: 'API', mobile: 'Móvil' };
  const reportes = dirs.map((d) => [nombres[basename(d)] ?? basename(d), correrJest(d)]);
  const { md, pct, cubiertos } = renderizar(
    reqs,
    contarPorRF(reportes.map(([, r]) => r)),
    new Date().toISOString().slice(0, 10),
    Object.fromEntries(reportes.map(([n, r]) => [n, contarPorRF([r])])),
  );
  writeFileSync(join(raiz, 'docs/progreso.md'), md);
  console.log(`Progreso: ${cubiertos}/${reqs.length} RF (${pct}%)`);
}
