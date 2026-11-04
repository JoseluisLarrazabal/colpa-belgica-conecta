// Cliente HTTP único. EXPO_PUBLIC_API_URL = raíz del servidor (sin /api/v1).
let token: string | null = null;
let alExpirar: (() => void) | null = null;

export const fijarToken = (t: string | null) => {
  token = t;
};
export const tokenActual = () => token;
/** El contexto de sesión registra aquí qué hacer ante un 401 (cerrar sesión). */
export const alRechazarToken = (fn: (() => void) | null) => {
  alExpirar = fn;
};

/** Cuerpo de error de la API: `{ error, campos?, errores? }` (middleware validar / fichas). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
    readonly campos: Record<string, string[]> = {},
    readonly errores: string[] = [],
  ) {
    super(mensaje);
  }
}

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  cuerpo?: unknown;
  /** false en el login: un 401 allí es "credenciales incorrectas", no sesión vencida. */
  autenticado?: boolean;
  /** Bearer explícito (logout tras limpiar la sesión local); sin él se usa el de la sesión. */
  token?: string;
}

const base = () => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error('Falta EXPO_PUBLIC_API_URL: no se sabe a qué servidor conectar');
  if (!__DEV__ && !url.startsWith('https://'))
    throw new Error('EXPO_PUBLIC_API_URL debe usar https en producción');
  return `${url}/api/v1`;
};

export async function api<T = void>(
  ruta: string,
  { metodo = 'GET', cuerpo, autenticado = true, token: bearer }: Opciones = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  const t = bearer ?? (autenticado ? token : null);
  if (t) headers['Authorization'] = `Bearer ${t}`;

  const url = `${base()}${ruta}`; // fuera del try: una URL mal configurada no es "sin conexión"
  let res: Response;
  try {
    res = await fetch(url, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor');
  }

  const texto = await res.text();
  let json: unknown = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    // cuerpo no JSON (p. ej. 502 de un proxy): se cae al mensaje genérico
  }

  if (!res.ok) {
    const c = (json ?? {}) as {
      error?: string;
      campos?: Record<string, string[]>;
      errores?: string[];
    };
    if (res.status === 401 && autenticado) alExpirar?.();
    throw new ApiError(res.status, c.error ?? 'Error inesperado', c.campos, c.errores);
  }
  return json as T;
}
