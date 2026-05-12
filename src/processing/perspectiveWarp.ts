// Perspective warp via homography (inverse mapping + bilinear interpolation)
// Ported from index.html solveLinear8() + perspectiveWarp()

import { Corner } from './autoDetect';

function solveLinear8(A: number[][], b: number[]): number[] {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let mx = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[mx][c])) mx = r;
    [M[c], M[mx]] = [M[mx], M[c]];
    if (Math.abs(M[c][c]) < 1e-10) continue;
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(M[i][i]) < 1e-10) continue;
    x[i] = M[i][n] / M[i][i];
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j] / M[i][i];
  }
  return x;
}

export function perspectiveWarp(
  srcPixels: Uint8Array,   // RGBA
  srcW: number,
  srcH: number,
  corners: [Corner, Corner, Corner, Corner], // TL TR BR BL (normalised)
): { pixels: Uint8Array; width: number; height: number } {
  const [tl, tr, br, bl] = corners.map(c => ({ x: c.x * srcW, y: c.y * srcH }));
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(b.x - a.x, b.y - a.y);

  const outW = Math.round(Math.max(dist(tl, tr), dist(bl, br)));
  const outH = Math.round(Math.max(dist(tl, bl), dist(tr, br)));
  if (outW < 4 || outH < 4) return { pixels: srcPixels, width: srcW, height: srcH };

  const dst = [{ x: 0, y: 0 }, { x: outW, y: 0 }, { x: outW, y: outH }, { x: 0, y: outH }];
  const srcCorners = [tl, tr, br, bl];
  const Av: number[][] = [], bv: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x: dx, y: dy } = dst[i], { x: sx, y: sy } = srcCorners[i];
    Av.push([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy]); bv.push(sx);
    Av.push([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy]); bv.push(sy);
  }
  const h = solveLinear8(Av, bv);
  const H = [...h, 1];

  const out = new Uint8Array(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const w_ = H[6] * x + H[7] * y + H[8];
      const sx = (H[0] * x + H[1] * y + H[2]) / w_;
      const sy = (H[3] * x + H[4] * y + H[5]) / w_;
      // Bilinear interpolation
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = x0 + 1, y1 = y0 + 1;
      const fx = sx - x0, fy = sy - y0;
      const oi = (y * outW + x) * 4;
      for (let ch = 0; ch < 4; ch++) {
        const s = (px: number, py: number) => {
          const cx = Math.max(0, Math.min(srcW - 1, px));
          const cy = Math.max(0, Math.min(srcH - 1, py));
          return srcPixels[(cy * srcW + cx) * 4 + ch];
        };
        out[oi + ch] = Math.round(
          s(x0, y0) * (1 - fx) * (1 - fy) +
          s(x1, y0) * fx * (1 - fy) +
          s(x0, y1) * (1 - fx) * fy +
          s(x1, y1) * fx * fy,
        );
      }
    }
  }
  return { pixels: out, width: outW, height: outH };
}
