import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ACCIONES_AUDITORIA } from '@colpa/shared';
import { momento } from '../../../lib/fechas';
import { Boton } from '../../../components/Boton';
import { ChipElegir } from '../../../components/ChipElegir';
import { EstadoChip } from '../../../components/EstadoChip';
import { Cargando, ErrorCarga, Vacio } from '../../../components/Estados';
import { Pantalla } from '../../../components/Pantalla';
import { Txt } from '../../../components/Txt';
import { useAuditoria } from '../../../features/auditoria/hooks';
import type { RegistroDto } from '../../../features/auditoria/tipos';
import { colores } from '../../../theme';

const ETIQUETA_ACCION: Record<(typeof ACCIONES_AUDITORIA)[number], string> = {
  CREAR: 'Creó',
  EDITAR: 'Editó',
  ENVIAR_REVISION: 'Envió a revisión',
  PUBLICAR: 'Publicó',
  DEVOLVER: 'Devolvió',
  ARCHIVAR: 'Archivó',
  DESCARTAR: 'Descartó',
};
const accionEnPalabras = (a: string) => ETIQUETA_ACCION[a as keyof typeof ETIQUETA_ACCION] ?? a;
const tituloDe = (r: RegistroDto) => r.publicacionTitulo ?? 'Publicación eliminada';

/** RF-10: bitácora de acciones sobre publicaciones, en orden cronológico (solo lectura). */
export default function Auditoria() {
  const [accion, setAccion] = useState<string | undefined>();
  const [pub, setPub] = useState<{ id: string; titulo: string } | undefined>();
  const q = useAuditoria({ accion, publicacionId: pub?.id });
  const registros = q.data?.pages.flatMap((p) => p.registros) ?? [];

  return (
    <Pantalla titulo="Auditoría" atras>
      <View style={s.filtros}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
        >
          <ChipElegir texto="Todas" activo={!accion} onPress={() => setAccion(undefined)} />
          {ACCIONES_AUDITORIA.map((a) => (
            <ChipElegir
              key={a}
              texto={accionEnPalabras(a)}
              activo={accion === a}
              onPress={() => setAccion(a)}
            />
          ))}
        </ScrollView>
        {pub && (
          <View style={s.solo}>
            <ChipElegir texto={`Solo: ${pub.titulo}`} activo onPress={() => setPub(undefined)} />
          </View>
        )}
      </View>
      {q.isPending ? (
        <Cargando />
      ) : q.isError ? (
        <ErrorCarga mensaje={q.error.message} onReintentar={() => void q.refetch()} />
      ) : (
        <FlatList
          data={registros}
          keyExtractor={(r) => r.id}
          renderItem={({ item: r }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${tituloDe(r)}. ${accionEnPalabras(r.accion)} por ${r.funcionario.nombreCompleto}, ${momento(r.fecha)}. Toque para ver solo esta publicación`}
              onPress={() => setPub({ id: r.entidadId, titulo: tituloDe(r) })}
              style={s.fila}
            >
              <Txt v="t16m">{tituloDe(r)}</Txt>
              <Txt v="t14">{`${accionEnPalabras(r.accion)} · ${r.funcionario.nombreCompleto}`}</Txt>
              <Txt v="t14" tenue>
                {momento(r.fecha)}
              </Txt>
              {r.estadoResultante && (
                <View style={s.chip}>
                  <EstadoChip estado={r.estadoResultante} />
                </View>
              )}
              {r.detalle && <Txt v="t14">{r.detalle}</Txt>}
            </Pressable>
          )}
          ListEmptyComponent={
            <Vacio
              texto={q.data.pages[0]?.mensaje ?? 'No existen registros para el criterio indicado'}
            />
          }
          ListFooterComponent={
            q.hasNextPage ? (
              <View style={s.mas}>
                <Boton
                  texto="Cargar más"
                  variante="borde"
                  icono="chevron-down"
                  onPress={() => void q.fetchNextPage()}
                  cargando={q.isFetchingNextPage}
                />
              </View>
            ) : undefined
          }
          contentContainerStyle={s.lista}
        />
      )}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  filtros: { paddingVertical: 12 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  solo: { paddingHorizontal: 16, marginTop: 8, alignSelf: 'flex-start' },
  lista: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 },
  fila: {
    minHeight: 72,
    gap: 2,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colores.primaryContainer,
  },
  chip: { marginTop: 4 },
  mas: { paddingVertical: 12 },
});
