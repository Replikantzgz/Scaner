/**
 * imageIO.ts — real JPEG pixel I/O for React Native
 *
 * loadImagePixels(uri, maxSide?)  → { data: Uint8Array RGBA, width, height }
 * pixelsToFile(pixels, w, h)     → file URI (JPEG in cache dir)
 */
import { Paths, readAsStringAsync, writeAsStringAsync } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import jpegJs from 'jpeg-js';

export interface ImagePixels {
  data: Uint8Array;
  width: number;
  height: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function uint8ToBase64(buf: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...(buf.subarray(i, i + chunk) as any));
  }
  return btoa(binary);
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Load an image URI and decode to raw RGBA pixels.
 * @param maxSide Optional max width — image is resized before decoding (faster for large photos)
 */
export async function loadImagePixels(uri: string, maxSide?: number): Promise<ImagePixels> {
  let workUri = uri;
  let b64: string | undefined;

  // Optionally resize first so jpeg-js doesn't have to decode a 12MP image
  if (maxSide) {
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxSide } }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9, base64: true },
    );
    if (resized.base64) {
      b64 = resized.base64;
    } else {
      workUri = resized.uri;
    }
  }

  if (!b64) {
    if (workUri.startsWith('data:')) {
      b64 = workUri.split(',')[1];
    } else {
      b64 = await readAsStringAsync(workUri, { encoding: 'base64' });
    }
  }

  const bytes = base64ToUint8Array(b64);
  const raw = jpegJs.decode(bytes, { useTArray: true });
  return { data: raw.data as Uint8Array, width: raw.width, height: raw.height };
}

// ── Write ─────────────────────────────────────────────────────────────────────

/** Encode RGBA pixels as JPEG and write to a temp file, return its URI. */
export async function pixelsToFile(
  pixels: Uint8Array,
  width: number,
  height: number,
  quality = 93,
): Promise<string> {
  const encoded = jpegJs.encode(
    { data: Buffer.from(pixels.buffer), width, height },
    quality,
  );
  const b64 = uint8ToBase64(new Uint8Array(encoded.data));
  const filename = `sv_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const path = Paths.cache.uri + filename;
  await writeAsStringAsync(path, b64, { encoding: 'base64' });
  return path;
}
