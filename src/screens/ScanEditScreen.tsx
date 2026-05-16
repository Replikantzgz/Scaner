/**
 * ScanEditScreen
 * Params: { uris: string[]; autoScan: boolean }
 *
 * Flow:
 *  1. Load each image, resize to 300px, run autoDetectDocumentCorners
 *  2. If autoScan && detected → skip UI, process silently
 *     Else → show corner handles for manual adjustment
 *  3. On confirm: warp (max 1600px) + enhance → push to processedPages[]
 *  4. After last image → show name dialog → save to DB → navigate to Viewer
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CornerOverlay } from '../components/CornerOverlay';
import { ScanModeBar } from '../components/ScanModeBar';
import { Corner, autoDetectDocumentCorners } from '../processing/autoDetect';
import { EnhanceMode, enhancePixels } from '../processing/enhance';
import { loadImagePixels, pixelsToFile } from '../processing/imageIO';
import { perspectiveWarp } from '../processing/perspectiveWarp';
import { Scan, db, newScanId } from '../storage/db';
import { colors, font, radius, spacing } from '../theme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CapturedPage {
  processed: string; // file URI
  original: string;  // file URI
}

interface Props {
  navigation: any;
  route: { params: { uris: string[]; autoScan: boolean } };
}

const DEFAULT_CORNERS: [Corner, Corner, Corner, Corner] = [
  { x: 0.05, y: 0.05 }, { x: 0.95, y: 0.05 },
  { x: 0.95, y: 0.95 }, { x: 0.05, y: 0.95 },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ScanEditScreen({ navigation, route }: Props) {
  const { uris, autoScan } = route.params;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [corners, setCorners] = useState<[Corner, Corner, Corner, Corner]>(DEFAULT_CORNERS);
  const [mode, setMode] = useState<EnhanceMode>('mejorar');
  const [processing, setProcessing] = useState(false);
  const [procMsg, setProcMsg] = useState('Analizando...');
  const [autoDetected, setAutoDetected] = useState(false);
  const [displaySize, setDisplaySize] = useState({ w: 300, h: 400 });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [docName, setDocName] = useState('');

  const processedPages = useRef<CapturedPage[]>([]);

  const currentUri = uris[currentIdx];

  // ── Auto-detect on every new image ──────────────────────────────────────────

  useEffect(() => {
    setCorners(DEFAULT_CORNERS);
    setAutoDetected(false);
    runDetection(currentUri);
  }, [currentUri]); // eslint-disable-line react-hooks/exhaustive-deps

  const runDetection = useCallback(async (uri: string) => {
    try {
      setProcMsg('Detectando documento...');
      setProcessing(true);
      // Load at 300px wide for fast detection
      const { data, width, height } = await loadImagePixels(uri, 300);
      const detected = autoDetectDocumentCorners(data, width, height);
      if (detected) {
        setCorners(detected);
        setAutoDetected(true);
        if (autoScan) {
          await processAndAdvance(detected, mode, uri);
          return;
        }
      }
    } catch (e) {
      console.warn('Detection error:', e);
    } finally {
      setProcessing(false);
    }
  }, [autoScan, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Process one page ─────────────────────────────────────────────────────────

  const processAndAdvance = useCallback(async (
    c: [Corner, Corner, Corner, Corner],
    m: EnhanceMode,
    uri: string,
  ) => {
    setProcMsg('Procesando escaneo...');
    setProcessing(true);
    try {
      // Full-res load (max 1600px)
      const { data: px, width: w, height: h } = await loadImagePixels(uri, 1600);

      // Warp
      const { pixels: warped, width: ww, height: wh } = perspectiveWarp(px, w, h, c);

      // Save original (warped, not enhanced)
      const originalUri = await pixelsToFile(warped, ww, wh, 93);

      // Enhance
      const enhanced = new Uint8Array(warped);
      enhancePixels(enhanced, ww, wh, m);
      const processedUri = await pixelsToFile(enhanced, ww, wh, 93);

      processedPages.current.push({ processed: processedUri, original: originalUri });

      if (currentIdx + 1 < uris.length) {
        setCurrentIdx(i => i + 1);
      } else {
        // All pages done — show save dialog
        const defaultName = `Escaneo ${new Date().toLocaleDateString('es-ES')}`;
        setDocName(defaultName);
        setShowSaveDialog(true);
      }
    } catch (err: any) {
      Alert.alert('Error al procesar', err.message);
    } finally {
      setProcessing(false);
    }
  }, [currentIdx, uris.length]);

  const onConfirm = () => processAndAdvance(corners, mode, currentUri);

  const onDrag = (i: number, x: number, y: number) => {
    setCorners(prev => {
      const next = [...prev] as [Corner, Corner, Corner, Corner];
      next[i] = { x, y };
      return next;
    });
  };

  // ── Save to DB ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setShowSaveDialog(false);
    setProcessing(true);
    setProcMsg('Guardando...');
    try {
      const name = docName.trim() || `Escaneo ${new Date().toLocaleDateString('es-ES')}`;
      const scan: Scan = {
        id: newScanId(),
        name,
        category: 'doc',
        ts: Date.now(),
        pages: processedPages.current.map(p => p.processed),
        origPages: processedPages.current.map(p => p.original),
        filter: 'none',
        fav: false,
        folder: '',
      };
      await db.add(scan);
      navigation.replace('Viewer', { scanId: scan.id });
    } finally {
      setProcessing(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Text style={styles.iconText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.pageLabel}>Página {currentIdx + 1} / {uris.length}</Text>
          {autoDetected && !processing && (
            <Text style={styles.badge}>Auto ✓</Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Image area with corner overlay */}
      <View
        style={styles.imageArea}
        onLayout={e => {
          const { width: aW, height: aH } = e.nativeEvent.layout;
          setDisplaySize({ w: aW, h: aH });
        }}
      >
        <Image
          source={{ uri: currentUri }}
          style={{ width: displaySize.w, height: displaySize.h }}
          resizeMode="contain"
        />
        <CornerOverlay
          corners={corners}
          width={displaySize.w}
          height={displaySize.h}
          onDrag={onDrag}
        />
        {processing && (
          <View style={styles.procOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.procText}>{procMsg}</Text>
          </View>
        )}
      </View>

      {/* Mode selector */}
      <View style={styles.modeBar}>
        <ScanModeBar current={mode} onChange={setMode} />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={processing}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} disabled={processing}>
          <Text style={styles.confirmText}>
            {currentIdx + 1 < uris.length ? `Siguiente (${currentIdx + 2}/${uris.length})` : 'Guardar →'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Save name dialog */}
      <Modal visible={showSaveDialog} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Guardar documento</Text>
            <Text style={styles.modalSub}>{processedPages.current.length} página(s)</Text>
            <TextInput
              style={styles.nameInput}
              value={docName}
              onChangeText={setDocName}
              placeholder="Nombre del documento"
              placeholderTextColor={colors.textSub}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowSaveDialog(false); navigation.goBack(); }}
              >
                <Text style={styles.modalCancelText}>Descartar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSave}>
                <Text style={styles.modalSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  iconText: { color: colors.white, fontSize: font.lg },
  pageLabel: { color: colors.text, fontSize: font.md, fontWeight: '600' },
  badge: { color: colors.accent, fontSize: font.sm, fontWeight: '700' },
  imageArea: { flex: 1, position: 'relative', margin: spacing.sm },
  procOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
    borderRadius: radius.md,
  },
  procText: { color: colors.white, marginTop: spacing.md, fontSize: font.md },
  modeBar: { paddingVertical: spacing.md },
  footer: {
    flexDirection: 'row', gap: spacing.md,
    padding: spacing.lg, paddingBottom: spacing.xl,
  },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center',
  },
  cancelText: { color: colors.textSub, fontWeight: '600', fontSize: font.md },
  confirmBtn: {
    flex: 2, paddingVertical: spacing.md, borderRadius: radius.lg,
    backgroundColor: colors.accent, alignItems: 'center',
  },
  confirmText: { color: colors.white, fontWeight: '700', fontSize: font.md },
  // Save dialog
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  modalBox: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md,
  },
  modalTitle: { color: colors.text, fontSize: font.xl, fontWeight: '700' },
  modalSub: { color: colors.textSub, fontSize: font.sm },
  nameInput: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    padding: spacing.md, color: colors.text, fontSize: font.md,
    borderWidth: 1, borderColor: colors.border,
  },
  modalBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  modalCancel: {
    flex: 1, padding: spacing.md, borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center',
  },
  modalCancelText: { color: colors.textSub, fontWeight: '600' },
  modalSave: {
    flex: 2, padding: spacing.md, borderRadius: radius.lg,
    backgroundColor: colors.accent, alignItems: 'center',
  },
  modalSaveText: { color: colors.white, fontWeight: '700' },
});
