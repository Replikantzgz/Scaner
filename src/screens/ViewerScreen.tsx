import * as Sharing from 'expo-sharing';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, FlatList, SafeAreaView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Scan, db } from '../storage/db';
import { colors, font, radius, spacing } from '../theme';

interface Props {
  navigation: any;
  route: { params: { scanId: string } };
}

export function ViewerScreen({ navigation, route }: Props) {
  const { scanId } = route.params;
  const [scan, setScan] = useState<Scan | null>(null);
  const [showOrig, setShowOrig] = useState(false);

  const load = useCallback(async () => {
    const s = await db.get(scanId);
    if (s) setScan(s);
  }, [scanId]);

  useEffect(() => { load(); }, [load]);

  const toggleFav = async () => {
    if (!scan) return;
    await db.update(scanId, { fav: !scan.fav });
    setScan(s => s ? { ...s, fav: !s.fav } : s);
  };

  const deleteScan = () => {
    Alert.alert('Eliminar', '¿Eliminar este documento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await db.remove(scanId);
          navigation.goBack();
        },
      },
    ]);
  };

  const sharePage = async (uri: string) => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      Alert.alert('Compartir no disponible en este dispositivo');
    }
  };

  if (!scan) return <View style={styles.safe}><Text style={{ color: colors.textSub }}>Cargando...</Text></View>;

  const pages = (showOrig && scan.origPages?.length === scan.pages.length)
    ? scan.origPages
    : scan.pages;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Text style={styles.iconText}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{scan.name}</Text>
          <Text style={styles.sub}>{scan.pages.length} pág. · {new Date(scan.ts).toLocaleDateString('es-ES')}</Text>
        </View>
        <TouchableOpacity onPress={toggleFav} style={styles.iconBtn}>
          <Text style={styles.iconText}>{scan.fav ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={deleteScan} style={styles.iconBtn}>
          <Text style={[styles.iconText, { color: colors.danger }]}>🗑</Text>
        </TouchableOpacity>
      </View>

      {/* Pages */}
      <FlatList
        data={pages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View style={styles.page}>
            <Image source={{ uri: item }} style={styles.pageImg} contentFit="contain" />
            <Text style={styles.pageNum}>{index + 1} / {pages.length}</Text>
          </View>
        )}
      />

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolBtn} onPress={() => setShowOrig(v => !v)}>
          <Text style={styles.toolIcon}>🔍</Text>
          <Text style={styles.toolLabel}>{showOrig ? 'Procesado' : 'Original'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={() => navigation.navigate('ScanEdit', { uris: [scan.pages[0]], autoScan: false })}>
          <Text style={styles.toolIcon}>✂️</Text>
          <Text style={styles.toolLabel}>Recortar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={() => sharePage(scan.pages[0])}>
          <Text style={styles.toolIcon}>↑</Text>
          <Text style={styles.toolLabel}>Compartir</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: colors.text, fontSize: font.lg },
  titleWrap: { flex: 1, marginHorizontal: spacing.sm },
  title: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  sub: { color: colors.textSub, fontSize: font.sm },
  list: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 100 },
  page: { backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden' },
  pageImg: { width: '100%', aspectRatio: 0.707 },
  pageNum: { textAlign: 'center', color: colors.textSub, fontSize: font.sm, paddingVertical: spacing.xs },
  toolbar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingBottom: spacing.xl,
  },
  toolBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: 4 },
  toolIcon: { fontSize: 20 },
  toolLabel: { color: colors.textSub, fontSize: 11, fontWeight: '600' },
});
