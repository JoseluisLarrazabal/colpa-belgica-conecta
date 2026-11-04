// Corre Jest en cada app con tests, cruza los tests (RF-NN en el nombre)
// con docs/requisitos.json y escribe docs/progreso.md.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

export function renderizar(reqs, porRF, fecha) {
  const cubiertos = reqs.filter((r) => cubierto(porRF.get(r.id))).length;
  const pct = ((cubiertos / reqs.length) * 100).toFixed(1);
  const filas = reqs.map((r) => {
    const c = porRF.get(r.id) ?? { ok: 0, mal: 0 };
    const estado = c.mal ? 'Falla' : c.ok ? 'Con test verde' : 'Pendiente';
    return `| ${r.id} | ${r.modulo} | ${r.titulo} | ${estado} | ${c.ok} |`;
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
      '| RF | Módulo | Título | Estado | Tests verdes |',
      '|----|--------|--------|--------|--------------|',
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
  const dirs = readdirSync(join(raiz, 'apps'))
    .map((d) => join(raiz, 'apps', d))
    .filter((d) => readdirSync(d).some((f) => f.startsWith('jest.config')));
  const { md, pct, cubiertos } = renderizar(
    reqs,
    contarPorRF(dirs.map(correrJest)),
    new Date().toISOString().slice(0, 10),
  );
  writeFileSync(join(raiz, 'docs/progreso.md'), md);
  console.log(`Progreso: ${cubiertos}/${reqs.length} RF (${pct}%)`);
}
