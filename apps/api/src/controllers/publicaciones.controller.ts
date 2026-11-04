import type { Request, Response } from 'express';
import type {
  Accion,
  ConsultarAuditoriaInput,
  DevolverInput,
  EditarFichaInput,
  FichaInput,
  ListarPublicacionesInput,
  RegistrarImagenInput,
} from '@colpa/shared';
import * as auditoria from '../services/auditoria.service';
import * as imagenes from '../services/imagen.service';
import * as publicaciones from '../services/publicacion.service';

const id = (req: Request) => req.params['id'] as string;
// requiereRol/autenticar ya garantizan la sesión.
const actor = (req: Request) => req.sesion!;

export const listar = async (req: Request, res: Response) =>
  void res.json(
    await publicaciones.listar(req.query as unknown as ListarPublicacionesInput, actor(req)),
  );
export const obtener = async (req: Request, res: Response) =>
  void res.json(await publicaciones.obtener(id(req), actor(req)));
export const crear = async (req: Request, res: Response) =>
  void res.status(201).json(await publicaciones.crear(req.body as FichaInput, actor(req)));
export const editar = async (req: Request, res: Response) =>
  void res.json(await publicaciones.editar(id(req), req.body as EditarFichaInput, actor(req)));
export const descartar = async (req: Request, res: Response) => {
  await publicaciones.descartar(id(req), actor(req));
  res.status(204).end();
};

/** Enviar, publicar, devolver y archivar: la misma máquina de estados con otra acción. */
export const accion = (a: Accion) => async (req: Request, res: Response) =>
  void res.json(
    await publicaciones.transicionar(id(req), a, actor(req), req.body as DevolverInput),
  );

export const firmaImagen = async (req: Request, res: Response) =>
  void res.json(await imagenes.firmaSubida(id(req), actor(req)));
export const registrarImagen = async (req: Request, res: Response) =>
  void res
    .status(201)
    .json(await imagenes.registrar(id(req), req.body as RegistrarImagenInput, actor(req)));
export const eliminarImagen = async (req: Request, res: Response) => {
  await imagenes.eliminar(id(req), req.params['imagenId'] as string, actor(req));
  res.status(204).end();
};

export const consultarAuditoria = async (req: Request, res: Response) =>
  void res.json(await auditoria.consultar(req.query as unknown as ConsultarAuditoriaInput));
