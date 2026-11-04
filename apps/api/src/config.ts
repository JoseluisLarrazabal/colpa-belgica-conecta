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

// Detrás de un proxy sin confiar en él, el límite de login vería una sola IP.
// Vercel: su edge SOBRESCRIBE x-forwarded-for con la IP real del cliente (un solo valor; no pasa el del cliente),
// así que hay exactamente 1 salto de confianza -> TRUST_PROXY_HOPS=1. Con 0, req.ip sería la IP interna de Vercel.
// Railway: también 1.
const hopsCrudo = process.env['TRUST_PROXY_HOPS'];
if (hopsCrudo === undefined || hopsCrudo === '') {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'TRUST_PROXY_HOPS es obligatoria en producción (en Vercel y Railway debe ser 1)',
    );
  }
}
if (hopsCrudo && !/^\d+$/.test(hopsCrudo)) {
  throw new Error('TRUST_PROXY_HOPS debe ser un entero no negativo');
}
export const TRUST_PROXY_HOPS = hopsCrudo ? Number(hopsCrudo) : 0;

/** RNF-25: credenciales de Cloudinary solo del entorno; se leen al usarlas para no impedir el arranque sin ellas. */
export function cloudinary() {
  const cloudName = process.env['CLOUDINARY_CLOUD_NAME'];
  const apiKey = process.env['CLOUDINARY_API_KEY'];
  const apiSecret = process.env['CLOUDINARY_API_SECRET'];
  if (!cloudName || !apiKey || !apiSecret) return null;
  // Una carpeta por entorno (2.4.4).
  const carpeta =
    process.env['CLOUDINARY_FOLDER'] || `colpa/${process.env['NODE_ENV'] ?? 'development'}`;
  return { cloudName, apiKey, apiSecret, carpeta };
}
