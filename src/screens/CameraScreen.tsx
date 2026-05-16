/**
 * CameraScreen — multi-page scan session
 *
 * Flow:
 *  - Capture N photos in sequence
 *  - Each photo goes through ScanEdit (auto-scan)
 *  - After each processed page, user returns here to add more or finalize
 *  - "Finalizar (N)" → ScanEdit receives all uris at once → saves as one document
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, font, radius, spacing } from '../theme';

interface Props {
  navigation: any;
}

export function CameraScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [capturing, setCapturing] = useState(false);
  const [capturedUris, setCapturedUris] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
        base64: false,
        exif: false,
      });
      if (photo?.uri) {
        // Go to ScanEdit for this single photo (auto-scan)
        navigation.navigate('ScanEdit', {
          uris: [photo.uri],
          autoScan: true,
          onPageProcessed: (processedUri: string, originalUri: string) => {
            setCapturedUris(prev => [...prev, processedUri]);
          },
        });
      }
    } catch (e) {
      console.warn('Capture error:', e);
    } finally {
      setCapturing(false);
    }
  }, [capturing, navigation]);

  const finalize = () => {
    // nothing to finalize — each photo already saved individually
    navigation.goBack();
  };

  // ── Permissions ────────────────────────────────────────────────────────────

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.center}>
          <Text style={styles.permTitle}>Acceso a cámara</Text>
          <Text style={styles.permText}>
            ScanVault necesita la cámara para escanear documentos.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Permitir acceso</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.textSub, fontSize: font.md }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Camera UI ──────────────────────────────────────────────────────────────

  return (
    <View style={styles.safe}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
      />

      {/* Top controls */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.icon}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}
        >
          <Text style={styles.icon}>{flash === 'on' ? '⚡' : '🔦'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
        >
          <Text style={styles.icon}>🔄</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom: session strip + shutter + finalize */}
      <View style={styles.bottomArea}>
        {/* Thumbnails of captured pages */}
        {capturedUris.length > 0 && (
          <ScrollView horizontal style={styles.strip} contentContainerStyle={styles.stripContent}>
            {capturedUris.map((uri, i) => (
              <View key={i} style={styles.thumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                <Text style={styles.thumbNum}>{i + 1}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.controls}>
          {/* Finalize button (shows when pages captured) */}
          {capturedUris.length > 0 ? (
            <TouchableOpacity style={styles.finalizeBtn} onPress={finalize}>
              <Text style={styles.finalizeText}>Ver documentos</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 90 }} />
          )}

          {/* Shutter */}
          <TouchableOpacity
            style={styles.shutter}
            onPress={takePhoto}
            disabled={capturing}
          >
            {capturing
              ? <ActivityIndicator color={colors.white} />
              : <View style={styles.shutterInner} />}
          </TouchableOpacity>

          <View style={{ width: 90 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  icon: { color: colors.white, fontSize: 18 },
  bottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  strip: { maxHeight: 90 },
  stripContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  thumb: { width: 60, height: 80, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 2, borderColor: colors.accent },
  thumbImg: { width: '100%', height: '100%' },
  thumbNum: { position: 'absolute', bottom: 2, right: 4, color: colors.white, fontSize: 10, fontWeight: '700' },
  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingBottom: 48, paddingTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  shutter: {
    width: 76, height: 76, borderRadius: radius.full,
    borderWidth: 4, borderColor: colors.white,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 60, height: 60, borderRadius: radius.full, backgroundColor: colors.white },
  finalizeBtn: {
    backgroundColor: colors.accent, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: radius.full,
  },
  finalizeText: { color: colors.white, fontWeight: '700', fontSize: font.sm },
  permTitle: { color: colors.text, fontSize: font.xl, fontWeight: '700', marginBottom: spacing.md },
  permText: { color: colors.textSub, fontSize: font.md, textAlign: 'center', marginBottom: spacing.xl },
  permBtn: {
    backgroundColor: colors.accent, paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md, borderRadius: radius.full,
  },
  permBtnText: { color: colors.white, fontWeight: '700', fontSize: font.md },
});
