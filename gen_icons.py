#!/usr/bin/env python3
"""
ScanVault icon — Instagram-style gradient + document scanner motif.
Design: centred document with scan-frame brackets around it + scan line.
"""
import struct, zlib, math, os

def write_png(path, w, h, pixels):
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    raw = b''.join(
        b'\x00' + bytes(v for px in pixels[y*w:(y+1)*w] for v in px)
        for y in range(h)
    )
    data = (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(data)

def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v + 0.5)))

def lerp_color(stops, t):
    t = max(0.0, min(1.0, t))
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        if t <= t1:
            f = (t - t0) / (t1 - t0) if t1 > t0 else 0.0
            return tuple(clamp(c0[j] + (c1[j] - c0[j]) * f) for j in range(3))
    return stops[-1][1]

def blend(bg, rgb, a):
    return (
        clamp(rgb[0]*a + bg[0]*(1-a)),
        clamp(rgb[1]*a + bg[1]*(1-a)),
        clamp(rgb[2]*a + bg[2]*(1-a)),
        clamp(bg[3]*(1-a) + 255*a),
    )

IG = [
    (0.00, (252, 175,  69)),
    (0.25, (247, 119,  55)),
    (0.50, (253,  29,  29)),
    (0.75, (225,  48, 108)),
    (1.00, (131,  58, 180)),
]
W = (255, 255, 255)

def draw_icon(S):
    px = [(0,0,0,0)] * (S*S)

    # ── 1. Gradient rounded-square background ─────────────────────────────
    r = S * 0.22
    for y in range(S):
        for x in range(S):
            cx = max(r, min(S-1-r, x))
            cy = max(r, min(S-1-r, y))
            d  = math.hypot(x-cx, y-cy)
            if d >= r + 1.0:
                continue
            t  = (x/S + (S-1-y)/S) / 2.0
            rgb = lerp_color(IG, t)
            aa  = 1.0 if d <= r-1.0 else (r+1.0-d)
            px[y*S+x] = blend(px[y*S+x], rgb, aa)

    def paint(x, y, rgb, a=1.0):
        xi, yi = int(x+0.5), int(y+0.5)
        if 0<=xi<S and 0<=yi<S and px[yi*S+xi][3]>0:
            px[yi*S+xi] = blend(px[yi*S+xi], rgb, a)

    def hline(x0, x1, y, h, rgb, a=1.0):
        for dy in range(h):
            for x in range(x0, x1):
                paint(x, y+dy, rgb, a)

    def vline(x, y0, y1, w, rgb, a=1.0):
        for dx in range(w):
            for y in range(y0, y1):
                paint(x+dx, y, rgb, a)

    # ── 2. Centred document silhouette ─────────────────────────────────────
    cx_ = S * 0.50
    cy_ = S * 0.50
    dw  = S * 0.42   # doc width
    dh  = S * 0.52   # doc height
    x1  = int(cx_ - dw/2)
    x2  = int(cx_ + dw/2)
    y1  = int(cy_ - dh/2)
    y2  = int(cy_ + dh/2)
    rad = max(3, int(S*0.05))

    # Soft white fill
    for y in range(y1, y2):
        for x in range(x1, x2):
            ccx2 = max(x1+rad, min(x2-rad, x))
            ccy2 = max(y1+rad, min(y2-rad, y))
            d2 = math.hypot(x-ccx2, y-ccy2)
            if d2 <= rad:
                paint(x, y, W, 0.88)

    # Stroke outline
    sw = max(2, int(S*0.030))
    for y in range(max(0,y1-2), min(S,y2+2)):
        for x in range(max(0,x1-2), min(S,x2+2)):
            ccx2 = max(x1+rad, min(x2-rad, x))
            ccy2 = max(y1+rad, min(y2-rad, y))
            d2   = math.hypot(x-ccx2, y-ccy2)
            on_stroke = abs(d2 - rad) <= sw/2
            if on_stroke:
                aa2 = max(0.0, 1.0 - abs(d2-rad)/(sw/2+0.5))
                paint(x, y, W, aa2)

    # ── 3. Text lines ──────────────────────────────────────────────────────
    lx1 = x1 + int(S*0.07)
    lh  = max(1, int(S*0.025))
    lg  = int(S*0.060)
    ly0 = y1 + int(S*0.10)
    for i, (lx2, la) in enumerate([(x2-int(S*.09), 0.65),(x2-int(S*.14),0.50),(x2-int(S*.11),0.45),(x2-int(S*.18),0.38)]):
        for dy in range(lh):
            for x in range(lx1, lx2):
                y = ly0 + i*lg + dy
                t = (x/S+(S-1-y)/S)/2
                rgb = lerp_color(IG, t)
                rgb = tuple(clamp(rgb[j]*0.25 + W[j]*0.75) for j in range(3))
                paint(x, y, rgb, la)

    # ── 4. Scan-frame brackets (larger, wrapping the document) ────────────
    pad   = int(S * 0.08)   # gap outside document edge
    fx1   = x1 - pad
    fx2   = x2 + pad
    fy1   = y1 - pad
    fy2   = y2 + pad
    bl    = max(4, int(S * 0.13))  # bracket arm length
    bw2   = max(2, int(S * 0.038)) # bracket arm width

    # top-left
    hline(fx1, fx1+bl, fy1, bw2, W, 0.97)
    vline(fx1, fy1,    fy1+bl, bw2, W, 0.97)
    # top-right
    hline(fx2-bl, fx2, fy1, bw2, W, 0.97)
    vline(fx2-bw2, fy1, fy1+bl, bw2, W, 0.97)
    # bottom-left
    hline(fx1, fx1+bl, fy2-bw2, bw2, W, 0.97)
    vline(fx1, fy2-bl, fy2, bw2, W, 0.97)
    # bottom-right
    hline(fx2-bl, fx2, fy2-bw2, bw2, W, 0.97)
    vline(fx2-bw2, fy2-bl, fy2, bw2, W, 0.97)

    # ── 5. Horizontal scan line through document ───────────────────────────
    scan_y = (y1 + y2) // 2
    scan_h2 = max(1, int(S * 0.016))
    for dy in range(scan_h2):
        y = scan_y + dy - scan_h2//2
        for x in range(x1+sw+2, x2-sw-2):
            # Fade at left/right edges
            edge = min(x-(x1+sw+2), (x2-sw-2)-x) / max(1, dw*0.15)
            aa3  = min(1.0, edge) * 0.85
            paint(x, y, W, aa3)

    return px


if __name__ == '__main__':
    os.makedirs('icons', exist_ok=True)
    for size in [72, 96, 128, 144, 152, 192, 384, 512]:
        pixels = draw_icon(size)
        write_png(f'icons/icon-{size}.png', size, size, pixels)
        print(f'  icon-{size}.png ✓')
    print('Done.')
