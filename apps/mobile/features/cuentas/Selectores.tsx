import { StyleSheet, View } from 'react-native';
import { ROLES, type Rol } from '@colpa/shared';
import { Campo } from '../../components/Campo';
import { ChipElegir } from '../../components/ChipElegir';
import { ETIQUETA_ROL } from './etiquetas';
import type { UnidadDto } from './tipos';

interface Elegir<T> {
  valor: T;
  onChange: (v: T) => void;
  error?: string;
}

/** Unidad municipal: una opción por unidad (RF-02). Compartido por Nueva y Editar. */
export function ElegirUnidad({
  unidades,
  valor,
  onChange,
  error,
}: Elegir<string> & { unidades: UnidadDto[] }) {
  return (
    <Campo rotulo="Unidad municipal" error={error}>
      <View style={s.chips}>
        {unidades.map((u) => (
          <ChipElegir
            key={u.id}
            texto={u.nombre}
            activo={u.id === valor}
            onPress={() => onChange(u.id)}
          />
        ))}
      </View>
    </Campo>
  );
}

/** Rol de la cuenta (RF-03). */
export function ElegirRol({ valor, onChange, error }: Elegir<Rol>) {
  return (
    <Campo rotulo="Rol" error={error}>
      <View style={s.chips}>
        {ROLES.map((r) => (
          <ChipElegir
            key={r}
            texto={ETIQUETA_ROL[r]}
            activo={r === valor}
            onPress={() => onChange(r)}
          />
        ))}
      </View>
    </Campo>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
