import { Image } from 'expo-image';
import { readAsStringAsync } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList,
  SafeAreaView, StyleSheet, Text,
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
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

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

  const exportPDF = async () => {
    if (!scan) return;
    setBusy(true);
    setBusyMsg('Generando PDF...');
    try {
      const b64s = await Promise.all(
        scan.pages.map(uri => readAsStringAsync(uri, { encoding: 'base64' as any })),
      );
      const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#fff">
        ${b64s.map(b64 =>
          `<div style="page-break-after:always;text-align:center">
            <img src="data:image/jpeg;base64,${b64}" style="max-width:100%;height:auto;display:block"/>
          </div>`,
        ).join('')}
      </body></html>`;
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch (e: any) {
      Alert.alert('Error PDF', e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!scan) return (
    <View style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );

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
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems.length > 0) setCurrentPage(viewableItems[0].index ?? 0);
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
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
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => Alert.alert('OCR', 'Reconocimiento de texto disponible próximamente.')}
        >
          <Text style={styles.toolIcon}>📝</Text>
          <Text style={styles.toolLabel}>OCR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={exportPDF} disabled={busy}>
          <Text style={styles.toolIcon}>📄</Text>
          <Text style={styles.toolLabel}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => Sharing.shareAsync(pages[currentPage] ?? scan.pages[0])}
        >
          <Text style={styles.toolIcon}>↑</Text>
          <Text style={styles.toolLabel}>Compartir</Text>
        </TouchableOpacity>
      </View>

      {/* Busy overlay */}
      {busy && (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.busyText}>{busyMsg}</Text>
        </View>
      )}
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
    borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: spacing.xl,
  },
  toolBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: 4 },
  toolIcon: { fontSize: 20 },
  toolLabel: { color: colors.textSub, fontSize: 11, fontWeight: '600' },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  busyText: { color: colors.white, marginTop: spacing.md, fontSize: font.md },
});
