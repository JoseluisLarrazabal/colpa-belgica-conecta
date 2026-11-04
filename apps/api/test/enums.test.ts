import { CATALOGO, ESTADOS, ROLES } from '@colpa/shared';
import {
  EstadoPublicacion,
  Modulo,
  RolFuncionario,
  TipoPublicacion,
} from '../src/generated/prisma/enums';

// El schema de Prisma no puede importar de shared: este test evita que diverjan.
describe('enums de Prisma reflejan @colpa/shared', () => {
  it('estados', () => expect(Object.values(EstadoPublicacion)).toEqual([...ESTADOS]));
  it('roles', () => expect(Object.values(RolFuncionario)).toEqual([...ROLES]));
  it('módulos', () => expect(Object.values(Modulo)).toEqual(Object.keys(CATALOGO)));
  it('tipos', () => expect(Object.values(TipoPublicacion)).toEqual(Object.values(CATALOGO).flat()));
});
