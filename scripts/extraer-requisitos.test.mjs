import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parsear } from './extraer-requisitos.mjs';

test('parsea filas RF con su módulo', () => {
  const md = '#### 2.3.1.2. M02 Salud\n| ID |\n| RF-11 | Publicador | Registrar campaña | x |\n';
  assert.deepEqual(parsear(md), [
    { id: 'RF-11', actor: 'Publicador', titulo: 'Registrar campaña', modulo: 'M02' },
  ]);
});

test('docs/requisitos.json tiene 35 RF únicos y continuos', () => {
  const reqs = JSON.parse(
    readFileSync(new URL('../docs/requisitos.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(
    reqs.map((r) => r.id),
    Array.from({ length: 35 }, (_, i) => `RF-${String(i + 1).padStart(2, '0')}`),
  );
  assert.ok(reqs.every((r) => r.modulo && r.actor && r.titulo));
});
