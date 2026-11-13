import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Switch } from 'react-native-paper';
import { Controller, useForm, useWatch, type UseFormSetError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  camposExtra,
  editarFichaSchema,
  fichaCompletaSchema,
  fichaSchema,
  hoyLaPaz,
  TIPOS_DESTACABLES,
  type FichaInput,
  type TipoPublicacion,
} from '@colpa/shared';
import { ApiError } from '../../lib/api';
import { momento } from '../../lib/fechas';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { CampoSelector } from '../../components/CampoSelector';
import { EstadoChip, estadoVisual } from '../../components/EstadoChip';
import { CajaError } from '../../components/Estados';
import { Pantalla } from '../../components/Pantalla';
import { Txt } from '../../components/Txt';
import { RADIO, colores } from '../../theme';
import { AYUDA_CAMPO, ETIQUETA_CAMPO } from './etiquetas';
import { MSG_VACIO_EDICION, moduloDeTipo, parche, progresoFicha, vaciados } from './ficha';
import { useAccion, useCrear, useEditar } from './hooks';
import { ImagenesFicha } from './ImagenesFicha';
import type { PublicacionDto } from './tipos';

type Nombre =
  | 'titulo'
  | 'detalle'
  | 'fechaInicio'
  | 'fechaFin'
  | 'hora'
  | 'lugar'
  | 'poblacionObjetivo'
  | 'requisitos';

interface Props {
  tipo: TipoPublicacion;
  /** Presente al editar; ausente al crear. */
  publicacion?: PublicacionDto;
  /** Selector de módulo/tipo (solo al crear), se dibuja tras el progreso. */
  selector?: ReactNode;
  /** Se llama al crearse el borrador: desde ahí módulo/tipo ya no pueden cambiar. */
  onCreada?: () => void;
}

const valoresIniciales = (tipo: TipoPublicacion, p?: PublicacionDto) => {
  const v: Record<string, string | boolean> = {
    modulo: moduloDeTipo(tipo),
    tipo,
    titulo: p?.titulo ?? '',
    detalle: p?.detalle ?? '',
    fechaInicio: p?.fechaInicio ?? '',
    fechaFin: p?.fechaFin ?? '',
    hora: p?.hora ?? '',
    lugar: p?.lugar ?? '',
    poblacionObjetivo: p?.poblacionObjetivo ?? '',
    requisitos: p?.requisitos ?? '',
    destacado: p?.destacado ?? false,
  };
  for (const k of camposExtra(tipo))
    v[k] = (p as unknown as Record<string, string | null>)?.[k] ?? '';
  return v as unknown as FichaInput;
};

/** Errores del servidor `{ campos, errores }` -> errores por campo del formulario. */
function aplicarErrores(e: unknown, setError: UseFormSetError<FichaInput>): string | null {
  if (!(e instanceof ApiError)) return 'No se pudo completar la operación';
  for (const [campo, msgs] of Object.entries(e.campos)) {
    setError(campo as never, { type: 'server', message: msgs[0] });
  }
  if (Object.keys(e.campos).length) return e.errores[0] ?? 'Revise los campos marcados';
  return e.message;
}

/** Ficha genérica (P-14) guiada por el catálogo y el schema compartido: sirve a cualquier tipo. */
export function FormPublicacion({ tipo, publicacion, selector, onCreada }: Props) {
  const extras = camposExtra(tipo);
  const crear = useCrear();
  // Al crear, la ficha recién creada pasa a ser la base: un reintento edita esa, no crea otra.
  const [creada, setCreada] = useState<PublicacionDto | null>(null);
  const base = publicacion ?? creada;
  const editar = useEditar(base?.id ?? '');
  const enviar = useAccion('ENVIAR_REVISION');
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<Date | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const { control, handleSubmit, getValues, setError, reset } = useForm<FichaInput>({
    resolver: zodResolver(publicacion ? fichaCompletaSchema : fichaSchema) as never,
    defaultValues: valoresIniciales(tipo, publicacion) as never,
    mode: 'onTouched',
  });

  // Cambio de tipo/módulo al crear: se conserva lo escrito y se descarta lo que el tipo no usa.
  const tipoPrevio = useRef(tipo);
  useEffect(() => {
    if (publicacion || tipoPrevio.current === tipo) return;
    tipoPrevio.current = tipo;
    const previo = getValues() as unknown as Record<string, unknown>;
    const nuevo: Record<string, unknown> = { ...valoresIniciales(tipo) };
    for (const k of Object.keys(nuevo))
      if (k !== 'modulo' && k !== 'tipo' && k in previo) nuevo[k] = previo[k];
    if (!TIPOS_DESTACABLES.includes(tipo)) nuevo.destacado = false;
    reset(nuevo as never);
  }, [tipo, publicacion, getValues, reset]);

  const valores = useWatch({ control }) as Partial<FichaInput>;
  const progreso = progresoFicha(valores);
  const fechaInicio = String(valores.fechaInicio ?? '');
  const devuelta = publicacion?.estado === 'BORRADOR' && !!publicacion.observaciones;

  const campo = (
    name: Nombre | string,
    rotulo: string,
    props: Omit<TextInputProps, 'style'> = {},
  ) => (
    <Controller
      control={control}
      name={name as never}
      render={({ field, fieldState }) => (
        <Campo
          rotulo={rotulo}
          value={String(field.value ?? '')}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          ayuda={AYUDA_CAMPO[name]}
          {...props}
        />
      )}
    />
  );

  const selectorFecha = (
    name: 'fechaInicio' | 'fechaFin' | 'hora',
    rotulo: string,
    minimo?: string,
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <CampoSelector
          rotulo={rotulo}
          modo={name === 'hora' ? 'time' : 'date'}
          valor={String(field.value ?? '')}
          onChange={field.onChange}
          onBlur={field.onBlur}
          minimo={minimo}
          error={fieldState.error?.message}
          ayuda={AYUDA_CAMPO[name]}
          quitarRotulo={name === 'fechaFin' ? 'Quitar fecha de fin' : undefined}
        />
      )}
    />
  );

  async function ejecutar(fn: () => Promise<void>) {
    setOcupado(true);
    setErrorForm(null);
    try {
      await fn();
    } catch (e) {
      setErrorForm(aplicarErrores(e, setError));
    } finally {
      setOcupado(false);
    }
  }

  // La API exige la ficha completa al crear; al editar acepta cambios parciales.
  const persistir = async (v: FichaInput): Promise<PublicacionDto> => {
    if (!base) {
      const p = await crear.mutateAsync(v);
      setCreada(p);
      onCreada?.();
      return p;
    }
    const cambios = parche(v as unknown as Record<string, unknown>, base, extras);
    return Object.keys(cambios).length ? editar.mutateAsync(cambios) : base;
  };

  // Para añadir imágenes a una ficha nueva: valida (pinta errores), crea el borrador y devuelve su id.
  // null = ficha inválida; si el servidor falla, el error se pinta y se propaga.
  const asegurarBorrador = async (): Promise<string | null> => {
    let id: string | null = null;
    let fallo: unknown;
    await handleSubmit(async (v) => {
      setOcupado(true);
      setErrorForm(null);
      try {
        id = (await persistir(v)).id;
        setGuardado(new Date());
      } catch (e) {
        setErrorForm(aplicarErrores(e, setError));
        fallo = e;
      } finally {
        setOcupado(false);
      }
    })();
    if (fallo) throw fallo;
    return id;
  };

  const guardarBorrador = async () => {
    if (!publicacion) {
      await handleSubmit((v) =>
        ejecutar(async () => {
          const p = await persistir(v);
          router.replace({ pathname: '/(panel)/publicaciones/[id]', params: { id: p.id } });
        }),
      )();
      return;
    }
    // Borrador existente: guardado parcial; solo se valida el formato de lo que se envía.
    await ejecutar(async () => {
      const valores = getValues() as unknown as Record<string, unknown>;
      const vacios = vaciados(valores, publicacion, extras);
      for (const k of vacios) setError(k as never, { type: 'manual', message: MSG_VACIO_EDICION });
      if (vacios.length) throw new ApiError(400, 'Revise los campos marcados', {}, []);
      const cambios = parche(valores, publicacion, extras);
      if (!Object.keys(cambios).length) return setGuardado(new Date());
      const r = editarFichaSchema.safeParse(cambios);
      if (!r.success) {
        for (const i of r.error.issues) setError(i.path[0] as never, { message: i.message });
        throw new ApiError(400, 'Revise los campos marcados', {}, ['Revise los campos marcados']);
      }
      await editar.mutateAsync(r.data);
      setGuardado(new Date());
    });
  };

  const enviarARevision = handleSubmit((v) =>
    ejecutar(async () => {
      const p = await persistir(v);
      await enviar.mutateAsync({ id: p.id });
      router.dismissTo('/(panel)/publicaciones');
    }),
  );

  const titulo = publicacion ? 'Editar ficha' : 'Nueva publicación';
  return (
    <Pantalla
      titulo={titulo}
      atras
      acciones={
        <View style={s.acciones}>
          <Boton
            texto="Guardar borrador"
            variante="borde"
            onPress={() => void guardarBorrador()}
            deshabilitado={ocupado}
          />
          <Boton
            texto="Enviar a revisión"
            icono="send"
            expandir
            onPress={() => void enviarARevision()}
            cargando={ocupado}
          />
        </View>
      }
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.estado}>
          <EstadoChip estado={publicacion ? estadoVisual(publicacion) : 'BORRADOR'} />
          {(guardado || publicacion) && (
            <View style={s.byline}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={20}
                color={colores.onSurfaceVariant}
              />
              <Txt
                v="t14"
                tenue
              >{`Guardado ${momento(guardado ?? publicacion!.actualizadoEn)}`}</Txt>
            </View>
          )}
        </View>

        {devuelta && (
          <View style={s.nota} accessibilityRole="alert">
            <MaterialCommunityIcons name="alert-outline" size={24} color={colores.warning} />
            <View style={s.notaTexto}>
              <Txt v="t16m">Devuelta con observaciones</Txt>
              <Txt v="t14">{publicacion!.observaciones}</Txt>
            </View>
          </View>
        )}

        <View style={s.progreso}>
          <View style={s.progresoTop}>
            <MaterialCommunityIcons
              name={progreso.completos === progreso.total ? 'check-circle' : 'progress-check'}
              size={20}
              color={
                progreso.completos === progreso.total ? colores.success : colores.onSurfaceVariant
              }
            />
            <Txt v="t14m" accessibilityLiveRegion="polite">
              {`${progreso.completos} de ${progreso.total} completos`}
            </Txt>
          </View>
          <View
            style={s.segs}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {Array.from({ length: progreso.total }, (_, i) => (
              <View key={i} style={[s.seg, i < progreso.completos && s.segOn]} />
            ))}
          </View>
        </View>

        {selector}

        {campo('titulo', 'Título', { maxLength: 150 })}
        {selectorFecha('fechaInicio', 'Fecha de inicio', hoyLaPaz())}
        {selectorFecha('fechaFin', 'Fecha de fin (opcional)', fechaInicio || hoyLaPaz())}
        {selectorFecha('hora', 'Hora')}
        {campo('lugar', 'Lugar', { maxLength: 150 })}
        {campo('poblacionObjetivo', 'Público objetivo', { maxLength: 150 })}
        {campo('requisitos', 'Requisitos', { multiline: true })}
        {campo('detalle', 'Descripción', { multiline: true })}
        {extras.map((k) => (
          <Fragment key={k}>{campo(k, ETIQUETA_CAMPO[k] ?? k, { maxLength: 100 })}</Fragment>
        ))}

        {TIPOS_DESTACABLES.includes(tipo) && (
          <Controller
            control={control}
            name="destacado"
            render={({ field }) => (
              <View style={s.destacar}>
                <Txt v="t16" style={s.notaTexto}>
                  Destacar en Inicio
                </Txt>
                <Switch
                  value={!!field.value}
                  onValueChange={field.onChange}
                  accessibilityLabel="Destacar en Inicio"
                />
              </View>
            )}
          />
        )}

        <ImagenesFicha
          publicacionId={publicacion?.id}
          imagenes={publicacion?.imagenes ?? []}
          asegurarBorrador={publicacion ? undefined : asegurarBorrador}
          onBorradorCreado={(id) =>
            router.replace({ pathname: '/(panel)/publicaciones/[id]', params: { id } })
          }
        />

        {guardado && !errorForm && (
          <View style={s.guardado} accessibilityRole="alert">
            <MaterialCommunityIcons name="check-circle" size={24} color={colores.success} />
            <Txt v="t14m">Borrador guardado</Txt>
          </View>
        )}
        {errorForm && <CajaError mensaje={errorForm} />}
      </ScrollView>
    </Pantalla>
  );
}

const caja = {
  flexDirection: 'row',
  gap: 12,
  alignItems: 'center',
  minHeight: 48,
  marginTop: 12,
  padding: 12,
  borderRadius: RADIO,
  backgroundColor: colores.surface,
  borderWidth: 1,
} as const;

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12 },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nota: { ...caja, alignItems: 'flex-start', borderColor: colores.warning },
  notaTexto: { flex: 1, gap: 2 },
  progreso: { marginTop: 16 },
  progresoTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  segs: { flexDirection: 'row', gap: 4, marginTop: 6 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colores.primaryContainer },
  segOn: { backgroundColor: colores.primary },
  guardado: { ...caja, borderColor: colores.success },
  destacar: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, marginTop: 12 },
  acciones: { flexDirection: 'row', gap: 8 },
});
