import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { idParamSchema, type Rol } from '@colpa/shared';
import { ApiError } from '../../../lib/api';
import { useSesion } from '../../../lib/sesion';
import { Boton } from '../../../components/Boton';
import { Campo } from '../../../components/Campo';
import { Cargando, CajaError, ErrorCarga } from '../../../components/Estados';
import { Pantalla } from '../../../components/Pantalla';
import { Txt } from '../../../components/Txt';
import {
  useAsignarRol,
  useCuentas,
  useEditarCuenta,
  useUnidades,
} from '../../../features/cuentas/hooks';
import { ElegirRol, ElegirUnidad } from '../../../features/cuentas/Selectores';
import type { CuentaDto, UnidadDto } from '../../../features/cuentas/tipos';
import { colores } from '../../../theme';

/** RF-02 / RF-03: modificar, cambiar el rol y desactivar una cuenta. */
export default function EditarCuenta() {
  const params = idParamSchema.safeParse(useLocalSearchParams());
  const cuentas = useCuentas(); // la API no tiene GET por id: el detalle sale de la lista
  const unidades = useUnidades();
  if (!params.success) return <Redirect href="/(panel)/cuentas" />;

  const cuenta = cuentas.data?.find((c) => c.id === params.data.id);
  if (cuentas.isSuccess && !cuenta) return <Redirect href="/(panel)/cuentas" />;
  const falla = cuentas.isError ? cuentas : unidades.isError ? unidades : null;
  if (!cuenta || !unidades.data) {
    return (
      <Pantalla titulo="Editar cuenta" atras>
        {falla ? (
          <ErrorCarga
            mensaje={falla.error!.message}
            onReintentar={() => {
              void cuentas.refetch();
              void unidades.refetch();
            }}
          />
        ) : (
          <Cargando />
        )}
      </Pantalla>
    );
  }
  return <FormEditar cuenta={cuenta} unidades={unidades.data} />;
}

function FormEditar({ cuenta, unidades }: { cuenta: CuentaDto; unidades: UnidadDto[] }) {
  const { funcionario } = useSesion();
  const editar = useEditarCuenta();
  const asignarRol = useAsignarRol();
  const [nombre, setNombre] = useState(cuenta.nombreCompleto);
  const [unidadId, setUnidadId] = useState(cuenta.unidadId);
  const [rol, setRol] = useState<Rol>(cuenta.rol);
  const [errorNombre, setErrorNombre] = useState<string | undefined>();
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const ocupado = editar.isPending || asignarRol.isPending;
  const propia = funcionario?.id === cuenta.id;

  async function correr(fn: () => Promise<unknown>) {
    setErrorForm(null);
    try {
      await fn();
      router.back();
    } catch (e) {
      setErrorForm(e instanceof ApiError ? e.message : 'No se pudo completar la operación');
    }
  }

  const guardar = () => {
    const nuevoNombre = nombre.trim();
    if (!nuevoNombre) return setErrorNombre('Este campo es obligatorio');
    setErrorNombre(undefined);
    const cambios = {
      ...(nuevoNombre !== cuenta.nombreCompleto && { nombreCompleto: nuevoNombre }),
      ...(unidadId !== cuenta.unidadId && { unidadId }),
    };
    void correr(async () => {
      if (Object.keys(cambios).length) await editar.mutateAsync({ id: cuenta.id, ...cambios });
      if (rol !== cuenta.rol) await asignarRol.mutateAsync({ id: cuenta.id, rol });
    });
  };
  const cambiarActivo = (activo: boolean) =>
    void correr(() => editar.mutateAsync({ id: cuenta.id, activo }));

  return (
    <Pantalla
      titulo="Editar cuenta"
      atras
      acciones={
        <Boton
          texto="Guardar cambios"
          icono="content-save-outline"
          onPress={guardar}
          cargando={ocupado}
          deshabilitado={confirmando}
        />
      }
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {propia && (
          <View style={s.nota}>
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color={colores.onSurfaceVariant}
            />
            <Txt v="t14" style={s.notaTexto}>
              Esta es su cuenta. Si cambia su rol o la desactiva, se cerrará su sesión.
            </Txt>
          </View>
        )}
        <Campo
          rotulo="Identificador de cuenta"
          value={cuenta.identificadorCuenta}
          editable={false}
          ayuda="No se puede cambiar."
        />
        <Campo
          rotulo="Nombre completo"
          value={nombre}
          onChangeText={setNombre}
          error={errorNombre}
          maxLength={120}
        />
        <ElegirUnidad unidades={unidades} valor={unidadId} onChange={setUnidadId} />
        <ElegirRol valor={rol} onChange={setRol} />
        {errorForm && <CajaError mensaje={errorForm} />}

        <View style={s.seccion}>
          {!cuenta.activo ? (
            <Boton
              texto="Reactivar cuenta"
              variante="borde"
              icono="account-check-outline"
              onPress={() => cambiarActivo(true)}
              cargando={editar.isPending}
              deshabilitado={ocupado}
            />
          ) : confirmando ? (
            <>
              <View style={s.nota} accessibilityRole="alert">
                <MaterialCommunityIcons name="alert-outline" size={20} color={colores.warning} />
                <Txt v="t14" style={s.notaTexto}>
                  Esta persona ya no podrá entrar al panel.
                </Txt>
              </View>
              <Boton
                texto="Confirmar desactivación"
                icono="account-off-outline"
                onPress={() => cambiarActivo(false)}
                cargando={editar.isPending}
                deshabilitado={ocupado}
              />
              <Boton
                texto="Cancelar"
                variante="borde"
                onPress={() => setConfirmando(false)}
                deshabilitado={ocupado}
              />
            </>
          ) : (
            <Boton
              texto="Desactivar cuenta"
              variante="borde"
              icono="account-off-outline"
              onPress={() => setConfirmando(true)}
            />
          )}
        </View>
      </ScrollView>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  nota: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 12, marginBottom: 4 },
  notaTexto: { flex: 1 },
  seccion: { marginTop: 24, gap: 12 },
});
