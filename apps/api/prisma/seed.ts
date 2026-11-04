import '../src/env';
import argon2 from 'argon2';
import { prisma } from '../src/db';
import { AreaUnidad, RolFuncionario, TipoEstablecimiento } from '../src/generated/prisma/client';

// Datos de demostración: todo lo que no es una unidad del GAM lleva el prefijo [FICTICIO].
const UNIDADES: { nombre: string; area: AreaUnidad }[] = [
  { nombre: 'Salud', area: 'SALUD' },
  { nombre: 'Educación', area: 'EDUCACION' },
  { nombre: 'Desarrollo comunitario', area: 'DESARROLLO_COMUNITARIO' },
  { nombre: 'Comunicación', area: 'COMUNICACION' },
];

const FUNCIONARIOS: { cuenta: string; nombre: string; rol: RolFuncionario; unidad: string }[] = [
  {
    cuenta: 'publicador.demo',
    nombre: '[FICTICIO] Publicador de Salud',
    rol: 'PUBLICADOR',
    unidad: 'Salud',
  },
  {
    cuenta: 'aprobador.demo',
    nombre: '[FICTICIO] Aprobador',
    rol: 'APROBADOR',
    unidad: 'Comunicación',
  },
  {
    cuenta: 'admin.demo',
    nombre: '[FICTICIO] Administrador técnico',
    rol: 'ADMIN_TECNICO',
    unidad: 'Comunicación',
  },
];

// Coordenadas 0,0 con desplazamiento mínimo: marcadores de prueba, no ubicaciones reales.
const ESTABLECIMIENTOS: { nombre: string; tipo: TipoEstablecimiento; unidad: string }[] = [
  { nombre: '[FICTICIO] Centro de salud 1', tipo: 'CENTRO_SALUD', unidad: 'Salud' },
  { nombre: '[FICTICIO] Centro de salud 2', tipo: 'CENTRO_SALUD', unidad: 'Salud' },
  { nombre: '[FICTICIO] Centro de salud 3', tipo: 'CENTRO_SALUD', unidad: 'Salud' },
  { nombre: '[FICTICIO] Unidad educativa 1', tipo: 'UNIDAD_EDUCATIVA', unidad: 'Educación' },
  { nombre: '[FICTICIO] Unidad educativa 2', tipo: 'UNIDAD_EDUCATIVA', unidad: 'Educación' },
];

async function main() {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'El seed carga datos de demostración y no puede correr con NODE_ENV=production',
    );
  }
  const password = process.env['SEED_PASSWORD'];
  if (!password) throw new Error('SEED_PASSWORD no está definida');
  const hash = await argon2.hash(password);

  const unidades = new Map<string, string>();
  for (const u of UNIDADES) {
    const fila = await prisma.unidad.upsert({ where: { nombre: u.nombre }, update: {}, create: u });
    unidades.set(u.nombre, fila.id);
  }

  const funcionarios = new Map<string, string>();
  for (const f of FUNCIONARIOS) {
    const fila = await prisma.funcionario.upsert({
      where: { identificadorCuenta: f.cuenta },
      // Re-sembrar rota la contraseña de demostración.
      update: {
        nombreCompleto: f.nombre,
        hashContrasena: hash,
        rol: f.rol,
        unidadId: unidades.get(f.unidad)!,
      },
      create: {
        identificadorCuenta: f.cuenta,
        nombreCompleto: f.nombre,
        hashContrasena: hash,
        rol: f.rol,
        unidadId: unidades.get(f.unidad)!,
      },
    });
    funcionarios.set(f.rol, fila.id);
  }

  for (const [i, e] of ESTABLECIMIENTOS.entries()) {
    if (await prisma.establecimiento.findFirst({ where: { nombre: e.nombre } })) continue;
    await prisma.establecimiento.create({
      data: {
        nombre: e.nombre,
        tipo: e.tipo,
        latitud: 0.001 * (i + 1),
        longitud: 0.001 * (i + 1),
        horarioAtencion: '[FICTICIO] Horario por definir',
        estado: 'PUBLICADO',
        publicadoEn: new Date(),
        unidadId: unidades.get(e.unidad)!,
        autorId: funcionarios.get('PUBLICADOR')!,
        aprobadorId: funcionarios.get('APROBADOR')!,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
