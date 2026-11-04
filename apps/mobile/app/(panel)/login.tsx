import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@colpa/shared';
import { ApiError } from '../../lib/api';
import { useSesion } from '../../lib/sesion';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { Pantalla } from '../../components/Pantalla';
import { Txt } from '../../components/Txt';
import { RADIO, colores } from '../../theme';

/** RF-01: inicio de sesión del funcionario. */
export default function Login() {
  const { entrar } = useSesion();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const { control, handleSubmit } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identificadorCuenta: '', contrasena: '' },
  });

  const enviar = handleSubmit(async (d) => {
    setEnviando(true);
    setError(null);
    try {
      await entrar(d);
      router.replace('/(panel)/inicio');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setEnviando(false);
    }
  });

  return (
    <Pantalla titulo="Acceso funcionarios" atras>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.intro}>
          <MaterialCommunityIcons name="lock-outline" size={24} color={colores.primary} />
          <Txt v="t16" style={s.introTexto}>
            Ingrese con la cuenta que le entregó la administración.
          </Txt>
        </View>
        <Controller
          control={control}
          name="identificadorCuenta"
          render={({ field, fieldState }) => (
            <Campo
              rotulo="Cuenta"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              autoComplete="username"
            />
          )}
        />
        <Controller
          control={control}
          name="contrasena"
          render={({ field, fieldState }) => (
            <Campo
              rotulo="Contraseña"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              autoComplete="password"
              onSubmitEditing={() => void enviar()}
            />
          )}
        />
        {error && (
          <View style={s.error} accessibilityRole="alert">
            <MaterialCommunityIcons name="alert-circle" size={24} color={colores.error} />
            <Txt v="t14m" style={s.introTexto}>
              {error}
            </Txt>
          </View>
        )}
        <View style={s.boton}>
          <Boton texto="Entrar" icono="login" onPress={() => void enviar()} cargando={enviando} />
        </View>
      </ScrollView>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  intro: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 16 },
  introTexto: { flex: 1 },
  error: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: RADIO,
    borderWidth: 1,
    borderColor: colores.error,
    backgroundColor: colores.surface,
  },
  boton: { marginTop: 24 },
});
