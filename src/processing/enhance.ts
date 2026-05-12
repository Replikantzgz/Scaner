// Image enhancement modes — ported from index.html enhanceScanImage()

export type EnhanceMode = 'mejorar' | 'color' | 'bw' | 'original';

export function enhancePixels(
  pixels: Uint8Array, // RGBA, mutated in-place
  w: number,
  h: number,
  mode: EnhanceMode,
): void {
  if (mode === 'original') return;

  if (mode === 'mejorar') {
    // Adaptive threshold via integral image — identical to CamScanner "Mejorar"
    const gv = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++)
      gv[i] = (77 * pixels[i * 4] + 150 * pixels[i * 4 + 1] + 29 * pixels[i * 4 + 2]) >> 8;

    const ii = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        ii[(y + 1) * (w + 1) + (x + 1)] =
          gv[i] + ii[y * (w + 1) + (x + 1)] + ii[(y + 1) * (w + 1) + x] - ii[y * (w + 1) + x];
      }
    }
    const half = (Math.max(20, (Math.min(w, h) * 0.07) | 0) | 1) >> 1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const x1 = Math.max(0, x - half), y1 = Math.max(0, y - half);
        const x2 = Math.min(w - 1, x + half), y2 = Math.min(h - 1, y + half);
        const cnt = (x2 - x1 + 1) * (y2 - y1 + 1);
        const s =
          ii[(y2 + 1) * (w + 1) + (x2 + 1)] -
          ii[y1 * (w + 1) + (x2 + 1)] -
          ii[(y2 + 1) * (w + 1) + x1] +
          ii[y1 * (w + 1) + x1];
        const v = gv[y * w + x] < (s / cnt) * 0.82 ? 15 : 250;
        const oi = (y * w + x) * 4;
        pixels[oi] = pixels[oi + 1] = pixels[oi + 2] = v;
      }
    }
    return;
  }

  if (mode === 'bw') {
    for (let i = 0; i < pixels.length; i += 4) {
      const g = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      const v = g > 128
        ? Math.min(255, (160 + (g - 128) * 1.2) | 0)
        : Math.max(0, (g * 0.55) | 0);
      pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
    }
    return;
  }

  if (mode === 'color') {
    let mxR = 0, mxG = 0, mxB = 0, mnR = 255, mnG = 255, mnB = 255;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > mxR) mxR = pixels[i]; if (pixels[i] < mnR) mnR = pixels[i];
      if (pixels[i + 1] > mxG) mxG = pixels[i + 1]; if (pixels[i + 1] < mnG) mnG = pixels[i + 1];
      if (pixels[i + 2] > mxB) mxB = pixels[i + 2]; if (pixels[i + 2] < mnB) mnB = pixels[i + 2];
    }
    const rR = Math.max(1, mxR - mnR), rG = Math.max(1, mxG - mnG), rB = Math.max(1, mxB - mnB);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.min(255, Math.max(0, (((pixels[i] - mnR) / rR * 255 - 128) * 1.25 + 150) | 0));
      pixels[i + 1] = Math.min(255, Math.max(0, (((pixels[i + 1] - mnG) / rG * 255 - 128) * 1.25 + 150) | 0));
      pixels[i + 2] = Math.min(255, Math.max(0, (((pixels[i + 2] - mnB) / rB * 255 - 128) * 1.25 + 150) | 0));
    }
  }
}
