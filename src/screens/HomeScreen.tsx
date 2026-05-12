import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList, SafeAreaView, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Scan, db } from '../storage/db';
import { colors, font, radius, spacing } from '../theme';

interface Props {
  navigation: any;
}

export function HomeScreen({ navigation }: Props) {
  const [scans, setScans] = useState<Scan[]>([]);

  const reload = useCallback(async () => {
    setScans(await db.all());
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', reload);
    return unsub;
  }, [navigation, reload]);

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
      base64: false,
    });
    if (result.canceled || !result.assets.length) return;
    navigation.navigate('ScanEdit', { uris: result.assets.map(a => a.uri), autoScan: true });
  };

  const openCamera = () => navigation.navigate('Camera');

  const openViewer = (scan: Scan) => navigation.navigate('Viewer', { scanId: scan.id });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ScanVault</Text>
        </View>

        {/* Quick actions */}
        <View style={styles.qaGrid}>
          <TouchableOpacity style={styles.qaBtn} onPress={openCamera}>
            <Text style={styles.qaIcon}>📷</Text>
            <Text style={styles.qaLabel}>Escanear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qaBtn} onPress={openGallery}>
            <Text style={styles.qaIcon}>🖼️</Text>
            <Text style={styles.qaLabel}>Importar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qaBtn} onPress={() => navigation.navigate('Docs')}>
            <Text style={styles.qaIcon}>📂</Text>
            <Text style={styles.qaLabel}>Documentos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qaBtn}>
            <Text style={styles.qaIcon}>⭐</Text>
            <Text style={styles.qaLabel}>Favoritos</Text>
          </TouchableOpacity>
        </View>

        {/* Recent documents */}
        <Text style={styles.sectionLabel}>Recientes</Text>
        {scans.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin documentos. Pulsa 📷 para empezar.</Text>
          </View>
        ) : (
          <FlatList
            data={scans.slice(0, 10)}
            keyExtractor={s => s.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => openViewer(item)}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardSub}>
                  {item.pages.length} pág. · {new Date(item.ts).toLocaleDateString('es-ES')}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCamera}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 100 },
  header: { marginBottom: spacing.xl },
  title: { color: colors.accent, fontSize: font.xxl, fontWeight: '800' },
  qaGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
    marginBottom: spacing.xl,
  },
  qaBtn: {
    width: '47%', backgroundColor: colors.surface2,
    borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.sm,
  },
  qaIcon: { fontSize: 28 },
  qaLabel: { color: colors.text, fontSize: font.md, fontWeight: '600' },
  sectionLabel: { color: colors.textSub, fontSize: font.sm, fontWeight: '700', marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { color: colors.textSub, fontSize: font.md },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cardName: { color: colors.text, fontSize: font.md, fontWeight: '600' },
  cardSub: { color: colors.textSub, fontSize: font.sm, marginTop: 2 },
  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.lg,
    width: 60, height: 60, borderRadius: radius.full,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
  fabIcon: { color: colors.white, fontSize: 32, lineHeight: 36 },
});
