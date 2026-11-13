import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CONTRASENA_MIN, crearCuentaSchema, type CrearCuentaInput } from '@colpa/shared';
import { ApiError } from '../../../lib/api';
import { Boton } from '../../../components/Boton';
import { Campo } from '../../../components/Campo';
import { Cargando, CajaError, ErrorCarga } from '../../../components/Estados';
import { Pantalla } from '../../../components/Pantalla';
import { useCrearCuenta, useUnidades } from '../../../features/cuentas/hooks';
import { ElegirRol, ElegirUnidad } from '../../../features/cuentas/Selectores';

// Mismo schema del servidor, con mensajes que un usuario no técnico entiende.
const esquema = crearCuentaSchema.extend({
  unidadId: z.uuid('Elija la unidad municipal'),
  contrasena: z.string().min(CONTRASENA_MIN, `Use al menos ${CONTRASENA_MIN} caracteres`).max(128),
});

/** RF-02 / RF-03: alta de una cuenta de funcionario. */
export default function NuevaCuenta() {
  const unidades = useUnidades();
  const crear = useCrearCuenta();
  const [verClave, setVerClave] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<CrearCuentaInput>({
    resolver: zodResolver(esquema) as never,
    defaultValues: {
      nombreCompleto: '',
      identificadorCuenta: '',
      unidadId: '',
      rol: 'PUBLICADOR',
      contrasena: '',
    },
    mode: 'onTouched',
  });

  const enviar = handleSubmit(async (v) => {
    setErrorForm(null);
    try {
      await crear.mutateAsync(v);
      router.back();
    } catch (e) {
      if (!(e instanceof ApiError)) return setErrorForm('No se pudo completar la operación');
      for (const [campo, msgs] of Object.entries(e.campos))
        setError(campo as never, { type: 'server', message: msgs[0] });
      if (e.status === 409) setError('identificadorCuenta', { type: 'server', message: e.message });
      else setErrorForm(Object.keys(e.campos).length ? 'Revise los campos marcados' : e.message);
    }
  });

  const campo = (
    name: 'nombreCompleto' | 'identificadorCuenta' | 'contrasena',
    rotulo: string,
    props: Record<string, unknown> = {},
    ayuda?: string,
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Campo
          rotulo={rotulo}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          ayuda={ayuda}
          {...props}
        />
      )}
    />
  );

  return (
    <Pantalla
      titulo="Nueva cuenta"
      atras
      acciones={
        <Boton
          texto="Crear cuenta"
          icono="account-plus-outline"
          onPress={() => void enviar()}
          cargando={crear.isPending}
        />
      }
    >
      {unidades.isPending ? (
        <Cargando />
      ) : unidades.isError ? (
        <ErrorCarga mensaje={unidades.error.message} onReintentar={() => void unidades.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {campo('nombreCompleto', 'Nombre completo', { maxLength: 120 })}
          {campo(
            'identificadorCuenta',
            'Identificador de cuenta',
            { autoCapitalize: 'none', autoCorrect: false, maxLength: 60 },
            'Con este nombre la persona entra al panel. Ejemplo: maria.quispe',
          )}
          <Controller
            control={control}
            name="unidadId"
            render={({ field, fieldState }) => (
              <ElegirUnidad
                unidades={unidades.data}
                valor={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="rol"
            render={({ field, fieldState }) => (
              <ElegirRol
                valor={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          {campo(
            'contrasena',
            'Contraseña inicial',
            {
              secureTextEntry: !verClave,
              autoCapitalize: 'none',
              autoCorrect: false,
              maxLength: 128,
            },
            `Mínimo ${CONTRASENA_MIN} caracteres. Entréguela a la persona de forma segura.`,
          )}
          <Boton
            texto={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            variante="borde"
            icono={verClave ? 'eye-off-outline' : 'eye-outline'}
            onPress={() => setVerClave((v) => !v)}
          />
          {errorForm && <CajaError mensaje={errorForm} />}
        </ScrollView>
      )}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 24, gap: 0 },
});
