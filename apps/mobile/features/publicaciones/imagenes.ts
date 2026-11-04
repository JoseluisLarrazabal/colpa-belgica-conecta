import { Platform } from 'react-native';
import { registrarImagenSchema, type RegistrarImagenInput } from '@colpa/shared';
import { api } from '../../lib/api';

/** Respuesta de POST /panel/publicaciones/:id/imagenes/firma (imagen.service.ts → firmaSubida). */
export interface FirmaCloudinary {
  cloudName: string;
  apiKey: string;
  allowed_formats: string;
  overwrite: boolean;
  public_id: string;
  timestamp: number;
  signature: string;
  maxImagenes: number;
}

export interface ArchivoLocal {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

export const pedirFirma = (publicacionId: string) =>
  api<FirmaCloudinary>(`/panel/publicaciones/${publicacionId}/imagenes/firma`, { metodo: 'POST' });

/** Sube directo a Cloudinary con los parámetros firmados (la API no transporta binarios). */
export async function subirACloudinary(
  f: FirmaCloudinary,
  a: ArchivoLocal,
): Promise<RegistrarImagenInput> {
  const form = new FormData();
  // Solo estos campos están firmados: deben viajar exactamente como se firmaron.
  form.append('api_key', f.apiKey);
  form.append('timestamp', String(f.timestamp));
  form.append('signature', f.signature);
  form.append('public_id', f.public_id);
  form.append('allowed_formats', f.allowed_formats);
  form.append('overwrite', String(f.overwrite));
  if (Platform.OS === 'web') {
    form.append('file', await (await fetch(a.uri)).blob());
  } else {
    // React Native acepta { uri, name, type } como parte de archivo.
    form.append('file', {
      uri: a.uri,
      name: a.fileName ?? 'imagen',
      type: a.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }
  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${f.cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });
  } catch {
    throw new Error('No hay conexión para subir la imagen');
  }
  const json = (await res.json().catch(() => ({}))) as { public_id?: string; format?: string };
  const r = registrarImagenSchema.safeParse({ publicId: json.public_id, formato: json.format });
  if (!res.ok || !r.success) throw new Error('No se pudo subir la imagen. Use JPG, PNG o WebP.');
  return r.data;
}

export const registrarImagen = (publicacionId: string, d: RegistrarImagenInput) =>
  api(`/panel/publicaciones/${publicacionId}/imagenes`, { metodo: 'POST', cuerpo: d });

export const eliminarImagen = (publicacionId: string, imagenId: string) =>
  api(`/panel/publicaciones/${publicacionId}/imagenes/${imagenId}`, { metodo: 'DELETE' });
