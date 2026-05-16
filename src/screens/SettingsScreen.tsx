import Constants from 'expo-constants';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, SafeAreaView,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { db } from '../storage/db';
import { colors, font, radius, spacing } from '../theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

interface Props { navigation: any }

export function SettingsScreen({ navigation }: Props) {
  const [checking, setChecking] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  const checkUpdates = async () => {
    setChecking(true);
    setUpdateMsg('');
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(
        'https://api.github.com/repos/Replikantzgz/Scaner/releases/latest',
        { signal: ctrl.signal },
      );
      clearTimeout(timer);
      const data = await res.json();
      const tag: string = data.tag_name ?? '';
      const latest = tag.replace(/^native-v/, '');
      const parse = (v: string) => v.split('.').map(Number);
      const [la = 0, lb = 0, lc = 0] = parse(latest);
      const [ca = 0, cb = 0, cc = 0] = parse(APP_VERSION);
      const hasUpdate = la > ca || (la === ca && lb > cb) || (la === ca && lb === cb && lc > cc);
      if (hasUpdate) {
        setUpdateMsg(`🟢 Nueva versión: ${latest}`);
        Alert.alert(
          'Actualización disponible',
          `Versión ${latest} disponible.\nActual: ${APP_VERSION}`,
          [
            { text: 'Ver descarga', onPress: () => Linking.openURL(data.html_url ?? 'https://github.com/Replikantzgz/Scaner/releases') },
            { text: 'Cerrar' },
          ],
        );
      } else {
        setUpdateMsg('✅ Ya tienes la última versión.');
      }
    } catch (e: any) {
      setUpdateMsg('❌ No se pudo verificar: ' + (e.message ?? 'Error de red'));
    } finally {
      setChecking(false);
    }
  };

  const clearAll = () => {
    Alert.alert(
      'Borrar todo',
      '¿Eliminar todos los documentos? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo', style: 'destructive', onPress: async () => {
            const all = await db.all();
            for (const s of all) await db.remove(s.id);
            Alert.alert('Hecho', 'Todos los documentos eliminados.');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Text style={styles.iconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ajustes</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>APP</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Versión</Text>
            <Text style={styles.rowValue}>{APP_VERSION}</Text>
          </View>
          <TouchableOpacity style={styles.row} onPress={checkUpdates} disabled={checking}>
            <Text style={styles.rowLabel}>Buscar actualizaciones</Text>
            {checking
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <Text style={styles.rowChevron}>›</Text>}
          </TouchableOpacity>
          {!!updateMsg && (
            <View style={styles.msgWrap}>
              <Text style={styles.msgText}>{updateMsg}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATOS</Text>
          <TouchableOpacity style={styles.row} onPress={clearAll}>
            <Text style={[styles.rowLabel, { color: colors.danger }]}>Borrar todos los documentos</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACERCA DE</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>ScanVault</Text>
            <Text style={styles.rowValue}>Open source</Text>
          </View>
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('https://github.com/Replikantzgz/Scaner')}
          >
            <Text style={styles.rowLabel}>Repositorio GitHub</Text>
            <Text style={[styles.rowValue, { color: colors.accent }]}>Ver ›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: { padding: spacing.lg, gap: spacing.xl },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  sectionLabel: { color: colors.textSub, fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { color: colors.text, fontSize: font.md },
  rowValue: { color: colors.textSub, fontSize: font.sm },
  rowChevron: { color: colors.textSub, fontSize: 20 },
  msgWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  msgText: { color: colors.textSub, fontSize: font.sm },
});
