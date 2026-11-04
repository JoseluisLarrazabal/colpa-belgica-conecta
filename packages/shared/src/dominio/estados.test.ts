import {
  ACCIONES,
  ESTADOS,
  ROLES,
  puedeTransicionar,
  type Accion,
  type Estado,
  type Rol,
} from './estados';

describe('Tabla 2.2: enviar a revisión', () => {
  it('el Publicador pasa BORRADOR a EN_REVISION', () => {
    expect(puedeTransicionar('BORRADOR', 'ENVIAR_REVISION', 'PUBLICADOR')).toBe('EN_REVISION');
  });
});

describe('Tabla 2.2: publicar', () => {
  it('el Aprobador pasa EN_REVISION a PUBLICADO', () => {
    expect(puedeTransicionar('EN_REVISION', 'PUBLICAR', 'APROBADOR')).toBe('PUBLICADO');
  });
});

describe('Tabla 2.2: devolver con observaciones', () => {
  it('el Aprobador pasa EN_REVISION a BORRADOR', () => {
    expect(puedeTransicionar('EN_REVISION', 'DEVOLVER', 'APROBADOR')).toBe('BORRADOR');
  });
});

describe('Tabla 2.2: archivar', () => {
  it('el Aprobador pasa PUBLICADO a ARCHIVADO', () => {
    expect(puedeTransicionar('PUBLICADO', 'ARCHIVAR', 'APROBADOR')).toBe('ARCHIVADO');
  });
});

describe('Tabla 2.2 rechaza toda transición ajena', () => {
  const permitidas = new Set([
    'BORRADOR|ENVIAR_REVISION|PUBLICADOR',
    'EN_REVISION|PUBLICAR|APROBADOR',
    'EN_REVISION|DEVOLVER|APROBADOR',
    'PUBLICADO|ARCHIVAR|APROBADOR',
  ]);
  const combos: [Estado, Accion, Rol][] = ESTADOS.flatMap((e) =>
    ACCIONES.flatMap((a) => ROLES.map((r): [Estado, Accion, Rol] => [e, a, r])),
  );

  it.each(combos.filter(([e, a, r]) => !permitidas.has(`${e}|${a}|${r}`)))(
    '%s + %s + %s devuelve null',
    (e, a, r) => {
      expect(puedeTransicionar(e, a, r)).toBeNull();
    },
  );
});
