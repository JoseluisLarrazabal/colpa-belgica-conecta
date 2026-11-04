import { Fragment, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Controller, useForm, useWatch, type UseFormSetError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  camposExtra,
  editarFichaSchema,
  fichaSchema,
  type FichaInput,
  type TipoPublicacion,
} from '@colpa/shared';
import { ApiError } from '../../lib/api';
import { momento } from '../../lib/fechas';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { EstadoChip, estadoVisual } from '../../components/EstadoChip';
import { Pantalla } from '../../components/Pantalla';
import { Txt } from '../../components/Txt';
import { RADIO, colores } from '../../theme';
import { ETIQUETA_CAMPO } from './etiquetas';
import { moduloDeTipo, parche, progresoFicha } from './ficha';
import { useAccion, useCrear, useEditar } from './hooks';
import { ImagenesFicha } from './ImagenesFicha';
import type { PublicacionDto } from './tipos';

type Nombre =
  'titulo' | 'detalle' | 'fechaInicio' | 'hora' | 'lugar' | 'poblacionObjetivo' | 'requisitos';

interface Props {
  tipo: TipoPublicacion;
  /** Presente al editar; ausente al crear. */
  publicacion?: PublicacionDto;
  /** Selector de módulo/tipo (solo al crear), se dibuja tras el progreso. */
  selector?: ReactNode;
}

const valoresIniciales = (tipo: TipoPublicacion, p?: PublicacionDto) => {
  const v: Record<string, string> = {
    modulo: moduloDeTipo(tipo),
    tipo,
    titulo: p?.titulo ?? '',
    detalle: p?.detalle ?? '',
    fechaInicio: p?.fechaInicio ?? '',
    hora: p?.hora ?? '',
    lugar: p?.lugar ?? '',
    poblacionObjetivo: p?.poblacionObjetivo ?? '',
    requisitos: p?.requisitos ?? '',
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
export function FormPublicacion({ tipo, publicacion, selector }: Props) {
  const extras = camposExtra(tipo);
  const crear = useCrear();
  const editar = useEditar(publicacion?.id ?? '');
  const enviar = useAccion('ENVIAR_REVISION');
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<Date | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const { control, handleSubmit, getValues, setError } = useForm<FichaInput>({
    resolver: zodResolver(fichaSchema) as never,
    defaultValues: valoresIniciales(tipo, publicacion) as never,
    mode: 'onTouched',
  });
  const progreso = progresoFicha(useWatch({ control }) as Partial<FichaInput>);
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
          {...props}
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
    if (!publicacion) return crear.mutateAsync(v);
    const cambios = parche(v as unknown as Record<string, unknown>, publicacion, extras);
    return Object.keys(cambios).length ? editar.mutateAsync(cambios) : publicacion;
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
      const cambios = parche(
        getValues() as unknown as Record<string, unknown>,
        publicacion,
        extras,
      );
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
      router.replace('/(panel)/publicaciones');
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
              <Txt v="t14" tenue>{`Aprobador · ${momento(publicacion!.actualizadoEn)}`}</Txt>
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
        <View style={s.dos}>
          <View style={s.mitad}>
            {campo('fechaInicio', 'Fecha', {
              placeholder: 'AAAA-MM-DD',
              keyboardType: 'numbers-and-punctuation',
            })}
          </View>
          <View style={s.mitad}>
            {campo('hora', 'Hora', {
              placeholder: 'HH:MM',
              keyboardType: 'numbers-and-punctuation',
            })}
          </View>
        </View>
        {campo('lugar', 'Lugar', { maxLength: 150 })}
        {campo('poblacionObjetivo', 'Público objetivo', { maxLength: 150 })}
        {campo('requisitos', 'Requisitos', { multiline: true })}
        {campo('detalle', 'Descripción', { multiline: true })}
        {extras.map((k) => (
          <Fragment key={k}>{campo(k, ETIQUETA_CAMPO[k] ?? k, { maxLength: 100 })}</Fragment>
        ))}

        <ImagenesFicha publicacionId={publicacion?.id} imagenes={publicacion?.imagenes ?? []} />

        {guardado && !errorForm && (
          <View style={s.guardado} accessibilityRole="alert">
            <MaterialCommunityIcons name="check-circle" size={24} color={colores.success} />
            <Txt v="t14m">Borrador guardado</Txt>
          </View>
        )}
        {errorForm && (
          <View style={s.errorForm} accessibilityRole="alert">
            <MaterialCommunityIcons name="alert-circle" size={24} color={colores.error} />
            <Txt v="t14m" style={s.notaTexto}>
              {errorForm}
            </Txt>
          </View>
        )}
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
  dos: { flexDirection: 'row', gap: 8 },
  mitad: { flex: 1 },
  guardado: { ...caja, borderColor: colores.success },
  errorForm: { ...caja, borderColor: colores.error },
  acciones: { flexDirection: 'row', gap: 8 },
});
