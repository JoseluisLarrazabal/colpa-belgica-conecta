import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contarPorRF, renderizar } from './progreso.mjs';

const reporte = (tests) => ({ testResults: [{ assertionResults: tests }] });

test('cuenta aprobados y no aprobados por RF', () => {
  const porRF = contarPorRF([
    reporte([
      { status: 'passed', fullName: 'RF-06 enviar a revisión pasa' },
      { status: 'failed', fullName: 'RF-07 publicar falla' },
      { status: 'passed', fullName: 'sin identificador' },
      { status: 'passed', fullName: 'RF-06 y RF-07 juntos' },
      { status: 'pending', fullName: 'RF-08 pendiente' },
    ]),
  ]);
  assert.deepEqual(
    [...porRF],
    [
      ['RF-06', { ok: 2, mal: 0 }],
      ['RF-07', { ok: 1, mal: 1 }],
      ['RF-08', { ok: 0, mal: 1 }],
    ],
  );
});

test('un RF con algún test fallido o pendiente no cuenta y figura como Falla', () => {
  const reqs = ['RF-06', 'RF-07', 'RF-08'].map((id) => ({ id, modulo: 'M01', titulo: 't' }));
  const porRF = new Map([
    ['RF-06', { ok: 2, mal: 0 }],
    ['RF-07', { ok: 3, mal: 1 }],
    ['RF-08', { ok: 0, mal: 1 }],
  ]);
  const { cubiertos, md } = renderizar(reqs, porRF, '2026-01-01');
  assert.equal(cubiertos, 1);
  assert.match(md, /RF-07 \| M01 \| t \| Falla/);
  assert.match(md, /RF-06 \| M01 \| t \| Con test verde/);
});

test('el porcentaje es RF cubiertos sobre el total', () => {
  const reqs = [1, 2, 3, 4].map((n) => ({ id: `RF-0${n}`, modulo: 'M01', titulo: 't' }));
  const { pct, cubiertos } = renderizar(
    reqs,
    new Map([['RF-01', { ok: 1, mal: 0 }]]),
    '2026-01-01',
  );
  assert.equal(cubiertos, 1);
  assert.equal(pct, '25.0');
});

test('muestra por app dónde se cubre cada RF', () => {
  const reqs = ['RF-01', 'RF-02'].map((id) => ({ id, modulo: 'M01', titulo: 't' }));
  const total = new Map([
    ['RF-01', { ok: 3, mal: 0 }],
    ['RF-02', { ok: 1, mal: 0 }],
  ]);
  const { md } = renderizar(reqs, total, '2026-01-01', {
    API: new Map([['RF-01', { ok: 2, mal: 0 }]]),
    Móvil: new Map([
      ['RF-01', { ok: 1, mal: 0 }],
      ['RF-02', { ok: 1, mal: 0 }],
    ]),
  });
  assert.match(md, /RF-01 \| M01 \| t \| Con test verde \| 3 \| 2 \| 1 \|/);
  assert.match(md, /RF-02 \| M01 \| t \| Con test verde \| 1 \| — \| 1 \|/);
});
