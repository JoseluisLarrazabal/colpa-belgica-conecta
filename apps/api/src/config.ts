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

// Railway termina TLS en un proxy: sin confiar en él, el límite de login vería una sola IP.
const hopsCrudo = process.env['TRUST_PROXY_HOPS'];
if (hopsCrudo === undefined || hopsCrudo === '') {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('TRUST_PROXY_HOPS es obligatoria en producción (en Railway debe ser 1)');
  }
}
if (hopsCrudo && !/^\d+$/.test(hopsCrudo)) {
  throw new Error('TRUST_PROXY_HOPS debe ser un entero no negativo');
}
export const TRUST_PROXY_HOPS = hopsCrudo ? Number(hopsCrudo) : 0;
