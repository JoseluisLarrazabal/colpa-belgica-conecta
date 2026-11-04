import { ACCIONES, ROLES } from './estados';
import { puede } from './permisos';

describe('matriz de permisos (Tabla 2.1)', () => {
  it('solo el rol de TRANSICIONES puede ejecutar cada acción', () => {
    expect(ACCIONES.filter((a) => puede('APROBADOR', a))).toEqual([
      'PUBLICAR',
      'DEVOLVER',
      'ARCHIVAR',
    ]);
    expect(ACCIONES.filter((a) => puede('PUBLICADOR', a))).toEqual(['ENVIAR_REVISION']);
    expect(ACCIONES.some((a) => puede('ADMIN_TECNICO', a))).toBe(false);
  });
  it('solo el administrador gestiona cuentas; todos inician sesión', () => {
    expect(ROLES.filter((r) => puede(r, 'GESTIONAR_CUENTAS'))).toEqual(['ADMIN_TECNICO']);
    expect(ROLES.every((r) => puede(r, 'INICIAR_SESION'))).toBe(true);
    expect(ROLES.filter((r) => puede(r, 'ELABORAR_PUBLICACION'))).toEqual(['PUBLICADOR']);
  });
});
