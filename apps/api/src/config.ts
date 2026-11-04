// RNF-25: el secreto viene solo del entorno. Se valida al cargar el módulo: la API no arranca sin él.
const secreto = process.env['JWT_SECRET'];
if (!secreto || secreto.length < 32) {
  throw new Error('JWT_SECRET debe estar definida y tener al menos 32 caracteres');
}
export const JWT_SECRET: string = secreto;

// RNF-22 / RNF-24 no fijan las cifras ("se fijan en el Sprint 1"): valores conservadores.
export const TOKEN_TTL_SEG = 60 * 60; // 1 h
export const MAX_INTENTOS = 5;
export const BLOQUEO_MIN = 15;
