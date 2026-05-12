// Otsu threshold + bright-region flood-fill → 4 extreme document corners
// Ported from index.html autoDetectDocumentCorners()

export interface Corner { x: number; y: number } // normalised 0-1

export function autoDetectDocumentCorners(
  pixels: Uint8Array, // RGBA flat array
  srcW: number,
  srcH: number,
): [Corner, Corner, Corner, Corner] | null {
  const PW = 300;
  const scale = PW / srcW;
  const PH = Math.round(srcH * scale);
  const N = PW * PH;

  // Downsample + grayscale with 3×3 blur
  const g = new Uint8Array(N);
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const sx = Math.max(0, Math.min(srcW - 1, Math.round((x + dx) / scale)));
          const sy = Math.max(0, Math.min(srcH - 1, Math.round((y + dy) / scale)));
          const si = (sy * srcW + sx) * 4;
          s += (77 * pixels[si] + 150 * pixels[si + 1] + 29 * pixels[si + 2]) >> 8;
          n++;
        }
      }
      g[y * PW + x] = s / n;
    }
  }

  // Otsu threshold
  const hist = new Uint32Array(256);
  for (let i = 0; i < N; i++) hist[g[i]]++;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, maxVar = 0, thresh = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue;
    const wF = N - wB; if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxVar) { maxVar = v; thresh = t; }
  }

  // Bright mask
  const bright = new Uint8Array(N);
  let brightCnt = 0;
  for (let i = 0; i < N; i++) { if (g[i] > thresh) { bright[i] = 1; brightCnt++; } }
  if (brightCnt > N * 0.70) for (let i = 0; i < N; i++) bright[i] = 1 - bright[i];

  // Flood-fill background from all 4 borders
  const bg = new Uint8Array(N);
  const q: number[] = [];
  const mark = (i: number) => { if (!bg[i] && !bright[i]) { bg[i] = 1; q.push(i); } };
  for (let x = 0; x < PW; x++) { mark(x); mark((PH - 1) * PW + x); }
  for (let y = 0; y < PH; y++) { mark(y * PW); mark(y * PW + PW - 1); }
  for (let qi = 0; qi < q.length; qi++) {
    const idx = q[qi], x = idx % PW, y = (idx / PW) | 0;
    if (x > 0) mark(idx - 1); if (x < PW - 1) mark(idx + 1);
    if (y > 0) mark(idx - PW); if (y < PH - 1) mark(idx + PW);
  }

  // Extreme corners of document pixels (bright AND not background)
  let tlI = -1, trI = -1, brI = -1, blI = -1;
  let minS = Infinity, maxD = -Infinity, maxS = -Infinity, minD = Infinity;
  let cnt = 0;
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      const i = y * PW + x;
      if (!bright[i] || bg[i]) continue; cnt++;
      const s = x + y, d = x - y;
      if (s < minS) { minS = s; tlI = i; }
      if (d > maxD) { maxD = d; trI = i; }
      if (s > maxS) { maxS = s; brI = i; }
      if (d < minD) { minD = d; blI = i; }
    }
  }

  if (cnt < N * 0.10 || tlI < 0) return null;

  const toN = (i: number): Corner => ({ x: (i % PW) / PW, y: ((i / PW) | 0) / PH });
  const corners = [toN(tlI), toN(trI), toN(brI), toN(blI)] as [Corner, Corner, Corner, Corner];
  const xs = corners.map(c => c.x), ys = corners.map(c => c.y);
  if (Math.max(...xs) - Math.min(...xs) < 0.25 || Math.max(...ys) - Math.min(...ys) < 0.25) return null;

  // Small inset so handles sit inside the doc edge
  return corners.map(c => ({ x: c.x * 0.96 + 0.02, y: c.y * 0.96 + 0.02 })) as [Corner, Corner, Corner, Corner];
}
