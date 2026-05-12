import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { EnhanceMode } from '../processing/enhance';
import { colors, radius, spacing } from '../theme';

const MODES: { key: EnhanceMode; label: string }[] = [
  { key: 'mejorar', label: 'Mejorar' },
  { key: 'color',   label: 'Color'   },
  { key: 'bw',      label: 'B&N'     },
  { key: 'original',label: 'Original'},
];

interface Props {
  current: EnhanceMode;
  onChange: (mode: EnhanceMode) => void;
}

export function ScanModeBar({ current, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {MODES.map(m => (
        <TouchableOpacity
          key={m.key}
          style={[styles.pill, current === m.key && styles.pillActive]}
          onPress={() => onChange(m.key)}
        >
          <Text style={[styles.label, current === m.key && styles.labelActive]}>
            {m.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  pill: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm - 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  label: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600' },
  labelActive: { color: colors.white },
});
