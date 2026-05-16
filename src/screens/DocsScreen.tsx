import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList, SafeAreaView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Scan, db } from '../storage/db';
import { colors, font, radius, spacing } from '../theme';

type Filter = 'all' | 'fav' | 'doc' | 'id' | 'receipt';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',     label: 'Todos'    },
  { key: 'fav',     label: '⭐ Favs'   },
  { key: 'doc',     label: '📄 Docs'   },
  { key: 'id',      label: '🪪 IDs'    },
  { key: 'receipt', label: '🧾 Facturas'},
];

const CAT_ICON: Record<string, string> = {
  doc: '📄', id: '🪪', receipt: '🧾', book: '📚',
};

interface Props { navigation: any }

export function DocsScreen({ navigation }: Props) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const reload = useCallback(async () => setScans(await db.all()), []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', reload);
    return unsub;
  }, [navigation, reload]);

  const filtered = scans.filter(s => {
    if (query && !s.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'fav') return s.fav;
    if (filter === 'doc') return s.category === 'doc';
    if (filter === 'id') return s.category === 'id';
    if (filter === 'receipt') return s.category === 'receipt';
    return true;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Text style={styles.iconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Documentos</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
          <Text style={styles.iconText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Buscar documento..."
          placeholderTextColor={colors.textSub}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.list}
        onRefresh={reload}
        refreshing={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {query ? 'Sin resultados para "' + query + '"' : 'Sin documentos'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Viewer', { scanId: item.id })}
          >
            <Text style={styles.cardIcon}>{CAT_ICON[item.category] ?? '📄'}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.cardSub}>
                {item.pages.length} pág. · {new Date(item.ts).toLocaleDateString('es-ES')}
              </Text>
            </View>
            {item.fav && <Text style={{ fontSize: 14 }}>⭐</Text>}
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  iconBtn: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: colors.text, fontSize: font.lg },
  title: { color: colors.text, fontSize: font.xl, fontWeight: '700' },
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  search: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    color: colors.text, fontSize: font.md, borderWidth: 1, borderColor: colors.border,
  },
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textSub, fontSize: font.sm, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  empty: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyText: { color: colors.textSub, fontSize: font.md },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cardIcon: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardName: { color: colors.text, fontSize: font.md, fontWeight: '600' },
  cardSub: { color: colors.textSub, fontSize: font.sm, marginTop: 2 },
  chevron: { color: colors.textSub, fontSize: 20 },
});
