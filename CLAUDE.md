# ScanVault — CLAUDE.md

## Estado actual
PWA single-file (`index.html`) envuelta en Capacitor 6.1.2 para Android.
CI en `.github/workflows/deploy.yml` → GitHub Pages + APK en Releases.
Repo: `Replikantzgz/Scaner` | Branch desarrollo: `claude/review-repo-activate-skill-y8YSE`

## PRÓXIMA TAREA: Migración a Expo (React Native)

El usuario ha pedido migrar a Expo para tener una app nativa de nivel superior.

### Por qué Expo
- Cámara nativa real (`expo-camera`) — vista previa fluida, control de enfoque/flash/resolución
- Procesamiento de imagen en hilo JS separado (no bloquea UI)
- Acceso a `expo-file-system` → guardar documentos como archivos reales en el dispositivo
- `expo-media-library` → importar directamente del carrete sin FileReader
- Build limpio con `eas build` → APK/AAB firmado listo para Play Store
- Sin WebView quirks (sin bugs de SVG coords, sin historial de back button)

### Stack objetivo
```
expo (SDK 52+, bare workflow o managed)
react-native
expo-camera          → vista previa + captura
expo-image-picker    → galería
expo-file-system     → almacenamiento local de docs
expo-media-library   → permisos galería
expo-sharing         → compartir/exportar
react-native-vision-camera (opcional, mejor rendimiento)
@shopify/react-native-skia  → perspectiva warp nativa
react-navigation     → stack navigator
AsyncStorage / MMKV  → base de datos local
react-native-pdf     → visor PDF
```

### Estructura de carpetas a crear
```
ScanVaultNative/
├── app/                    (expo-router) o src/screens/
│   ├── HomeScreen.tsx
│   ├── CameraScreen.tsx
│   ├── ScanEditScreen.tsx  ← detección + handles + warp
│   ├── ViewerScreen.tsx
│   └── SettingsScreen.tsx
├── src/
│   ├── processing/
│   │   ├── autoDetect.ts   ← Otsu + flood-fill (portar de index.html)
│   │   ├── perspectiveWarp.ts ← homografía + bilinear (portar)
│   │   └── enhance.ts      ← adaptive threshold (portar)
│   ├── storage/
│   │   └── db.ts           ← AsyncStorage/MMKV scan DB
│   └── components/
│       ├── CornerOverlay.tsx ← SVG handles sobre imagen
│       └── ScanModeBar.tsx
├── assets/icons/           ← iconos actuales (gen_icons.py ya los tiene)
├── app.json
├── eas.json
└── package.json
```

### Algoritmos a portar (ya implementados en JS en index.html, portar a TS)
1. `autoDetectDocumentCorners` — línea ~1130 del index.html actual
2. `perspectiveWarp` + `solveLinear8` — línea ~1224
3. `enhanceScanImage` (mejorar/bw/color) — línea ~1271

Estos corren en JS puro sobre `Uint8Array` — funcionan igual en RN.
Para rendimiento, envolver en `runOnJS` de reanimated o un worker.

### Funcionalidades a mantener (paridad con PWA actual)
- [ ] Captura de cámara multi-página
- [ ] Import desde galería con auto-scan
- [ ] Detección automática de esquinas (Otsu)
- [ ] Corrección de perspectiva (homografía)
- [ ] Modos: Mejorar (adaptive threshold) / Color / B&N / Original
- [ ] Almacenamiento local de documentos con nombre
- [ ] Visor multi-página con reordenación
- [ ] Exportar PDF
- [ ] OCR (Tesseract.js → react-native-tesseract-ocr o ML Kit)
- [ ] Favoritos, carpetas, filtros
- [ ] Checker de actualizaciones (fetch GitHub releases/latest)
- [ ] Tema claro/oscuro

### CI/CD con EAS
Reemplazar `deploy.yml` con:
```yaml
# .github/workflows/eas-build.yml
- uses: expo/expo-github-action@v8
- run: eas build --platform android --profile preview --non-interactive
- Subir APK a Releases igual que ahora
```

### Comando de inicio para la próxima sesión
```bash
cd /home/user
npx create-expo-app ScanVaultNative --template blank-typescript
cd ScanVaultNative
# instalar dependencias del stack objetivo
# portar algoritmos de /home/user/Scaner/index.html
```

### Notas
- El `index.html` actual tiene TODO el código de referencia
- Los iconos están en `/home/user/Scaner/icons/` (generados por gen_icons.py)
- El workflow CI está en `.github/workflows/deploy.yml` — adaptar para EAS
- GH_REPO = `Replikantzgz/Scaner` (misma repo, nueva carpeta o nuevo repo)
- APP_VERSION se inyecta por CI con el run number
