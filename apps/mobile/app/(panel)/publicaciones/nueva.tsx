import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CATALOGO, MODULOS, type Modulo, type TipoPublicacion } from '@colpa/shared';
import { ChipElegir } from '../../../components/ChipElegir';
import { Txt } from '../../../components/Txt';
import { ETIQUETA_MODULO, ETIQUETA_TIPO } from '../../../features/publicaciones/etiquetas';
import { FormPublicacion } from '../../../features/publicaciones/FormPublicacion';

/** Nueva publicación: elegir módulo y tipo del catálogo y llenar la ficha genérica. */
export default function NuevaPublicacion() {
  const [modulo, setModulo] = useState<Modulo>('SALUD');
  const [tipo, setTipo] = useState<TipoPublicacion>('CAMPANA_VACUNACION');
  // Con el borrador ya creado, un reintento edita ese: cambiar el tipo aquí no se aplicaría.
  const [bloqueado, setBloqueado] = useState(false);

  const elegirModulo = (m: Modulo) => {
    setModulo(m);
    setTipo(CATALOGO[m][0]);
  };
  const selector = (
    <View>
      <Txt v="t14m" tenue style={s.rotulo}>
        Módulo
      </Txt>
      <View style={s.chips}>
        {MODULOS.map((m) => (
          <ChipElegir
            key={m}
            texto={ETIQUETA_MODULO[m]}
            activo={m === modulo}
            deshabilitado={bloqueado}
            onPress={() => elegirModulo(m)}
          />
        ))}
      </View>
      <Txt v="t14m" tenue style={s.rotulo}>
        Tipo de publicación
      </Txt>
      <View style={s.chips}>
        {CATALOGO[modulo].map((t) => (
          <ChipElegir
            key={t}
            texto={ETIQUETA_TIPO[t]}
            activo={t === tipo}
            deshabilitado={bloqueado}
            onPress={() => setTipo(t)}
          />
        ))}
      </View>
    </View>
  );
  // Sin key: al cambiar de tipo el formulario conserva lo escrito y solo descarta lo que el tipo nuevo no usa.
  return <FormPublicacion tipo={tipo} selector={selector} onCreada={() => setBloqueado(true)} />;
}

const s = StyleSheet.create({
  rotulo: { marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
