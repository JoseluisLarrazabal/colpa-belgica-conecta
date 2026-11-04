import type { Request, Response } from 'express';
import type { CrearCuentaInput, EditarCuentaInput, Rol } from '@colpa/shared';
import * as cuentas from '../services/cuentas.service';

const id = (req: Request) => req.params['id'] as string;

export const unidades = async (_req: Request, res: Response) =>
  void res.json(await cuentas.listarUnidades());
export const listar = async (_req: Request, res: Response) =>
  void res.json(await cuentas.listarCuentas());
export const crear = async (req: Request, res: Response) =>
  void res.status(201).json(await cuentas.crearCuenta(req.body as CrearCuentaInput));
export const editar = async (req: Request, res: Response) =>
  void res.json(await cuentas.editarCuenta(id(req), req.body as EditarCuentaInput));
export const asignarRol = async (req: Request, res: Response) =>
  void res.json(await cuentas.asignarRol(id(req), (req.body as { rol: Rol }).rol));
