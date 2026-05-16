import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';
import { Corner } from '../processing/autoDetect';
import { colors } from '../theme';

interface Props {
  corners: [Corner, Corner, Corner, Corner];
  width: number;   // display px
  height: number;  // display px
  onDrag: (index: number, x: number, y: number) => void;
}

export function CornerOverlay({ corners, width, height, onDrag }: Props) {
  const pts = corners.map(c => ({ x: c.x * width, y: c.y * height }));
  const polyPoints = pts.map(p => `${p.x},${p.y}`).join(' ');
  const R = 22;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]} pointerEvents="box-none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Polygon
          points={polyPoints}
          fill="rgba(27,169,123,0.18)"
          stroke={colors.accent}
          strokeWidth={2.5}
        />
        {pts.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={R}
            fill="rgba(27,169,123,0.35)"
            stroke={colors.white}
            strokeWidth={2.5}
            onStartShouldSetResponder={() => true}
          />
        ))}
      </Svg>
      {/* Invisible touch targets for each handle */}
      {pts.map((p, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: p.x - R * 1.5,
            top: p.y - R * 1.5,
            width: R * 3,
            height: R * 3,
          }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderMove={e => {
            const { locationX, locationY } = e.nativeEvent;
            const newX = Math.max(0, Math.min(1, (p.x - R * 1.5 + locationX) / width));
            const newY = Math.max(0, Math.min(1, (p.y - R * 1.5 + locationY) / height));
            onDrag(i, newX, newY);
          }}
        />
      ))}
    </View>
  );
}
