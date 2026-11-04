import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';
import type { LoginInput, Rol } from '@colpa/shared';
import { alRechazarToken, api, fijarToken } from './api';

export interface Funcionario {
  id: string;
  nombreCompleto: string;
  rol: Rol;
  unidadId: string;
}
interface RespuestaLogin {
  token: string;
  expiraEn: string;
  funcionario: Funcionario;
}
interface Guardado {
  token: string;
  expiraEn: string;
  funcionario: Funcionario;
}

const CLAVE = 'sesion_funcionario';

// SecureStore no existe en web (solo para la verificación con navegador): sin persistencia allí.
async function leer(): Promise<Guardado | null> {
  try {
    if (!(await SecureStore.isAvailableAsync())) return null;
    const v = await SecureStore.getItemAsync(CLAVE);
    return v ? (JSON.parse(v) as Guardado) : null;
  } catch {
    return null;
  }
}
async function guardar(g: Guardado | null) {
  try {
    if (!(await SecureStore.isAvailableAsync())) return;
    if (g) await SecureStore.setItemAsync(CLAVE, JSON.stringify(g));
    else await SecureStore.deleteItemAsync(CLAVE);
  } catch {
    // sin almacén seguro la sesión vive solo en memoria
  }
}

interface Contexto {
  cargando: boolean;
  funcionario: Funcionario | null;
  entrar: (d: LoginInput) => Promise<void>;
  salir: () => Promise<void>;
}
const Ctx = createContext<Contexto | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [cargando, setCargando] = useState(true);
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);

  const limpiar = useCallback(() => {
    fijarToken(null);
    setFuncionario(null);
    qc.clear();
    void guardar(null);
  }, [qc]);

  useEffect(() => {
    alRechazarToken(limpiar);
    void leer().then((g) => {
      if (g && new Date(g.expiraEn) > new Date()) {
        fijarToken(g.token);
        setFuncionario(g.funcionario);
      }
      setCargando(false);
    });
    return () => alRechazarToken(null);
  }, [limpiar]);

  const valor = useMemo<Contexto>(
    () => ({
      cargando,
      funcionario,
      async entrar(d) {
        const r = await api<RespuestaLogin>('/auth/login', {
          metodo: 'POST',
          cuerpo: d,
          autenticado: false,
        });
        fijarToken(r.token);
        setFuncionario(r.funcionario);
        await guardar(r);
      },
      async salir() {
        try {
          await api('/auth/logout', { metodo: 'POST' });
        } catch {
          // sin red o token ya vencido: igual se cierra localmente
        }
        limpiar();
      },
    }),
    [cargando, funcionario, limpiar],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSesion(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSesion fuera de ProveedorSesion');
  return c;
}
