#!/usr/bin/env python3
import struct, zlib, math, os

def write_png(path, w, h, pixels):
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    raw = b''.join(
        b'\x00' + bytes(v for px in pixels[y*w:(y+1)*w] for v in px)
        for y in range(h)
    )
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + \
           chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(data)

def lerp(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))

def alpha_over(dst, src):
    sa = src[3] / 255.0
    da = dst[3] / 255.0
    oa = sa + da * (1 - sa)
    if oa < 1e-6:
        return (0, 0, 0, 0)
    r = int((src[0]*sa + dst[0]*da*(1-sa)) / oa)
    g = int((src[1]*sa + dst[1]*da*(1-sa)) / oa)
    b = int((src[2]*sa + dst[2]*da*(1-sa)) / oa)
    return (r, g, b, int(oa * 255))

def draw_icon(size):
    S = size
    BG    = (11, 12, 18, 255)
    CYAN  = (99, 226, 255, 255)
    TRANS = (0, 0, 0, 0)

    px = [TRANS] * (S * S)

    def set_px(x, y, c):
        if 0 <= x < S and 0 <= y < S:
            px[y*S + x] = alpha_over(px[y*S + x], c)

    # ── Rounded square background ──
    r = S * 22 // 100
    for y in range(S):
        for x in range(S):
            cx = max(r, min(S - 1 - r, x))
            cy = max(r, min(S - 1 - r, y))
            dist = math.hypot(x - cx, y - cy)
            if dist < r - 0.5:
                px[y*S + x] = BG
            elif dist < r + 0.5:
                aa = r + 0.5 - dist
                px[y*S + x] = lerp(TRANS, BG, aa)

    # ── Document rectangle ──
    dm = int(S * 0.13)
    dr = int(S * 0.60)
    dt = int(S * 0.11)
    db = int(S * 0.80)
    drad = max(3, int(S * 0.04))
    sw = max(2, int(S * 0.030))

    def in_rrect(x, y, x1, y1, x2, y2, rad):
        cx2 = max(x1 + rad, min(x2 - rad, x))
        cy2 = max(y1 + rad, min(y2 - rad, y))
        return math.hypot(x - cx2, y - cy2) <= rad

    for y in range(S):
        for x in range(S):
            if px[y*S + x][3] == 0:
                continue
            outer = in_rrect(x, y, dm, dt, dr, db, drad)
            inner = in_rrect(x, y, dm+sw, dt+sw, dr-sw, db-sw, max(1, drad-sw))
            if outer and not inner:
                # anti-alias edge
                # Compute dist to outer boundary (approx)
                ccx = max(dm+drad, min(dr-drad, x))
                ccy = max(dt+drad, min(db-drad, y))
                d = math.hypot(x-ccx, y-ccy)
                aa = min(1.0, drad - d + 0.5) if d > drad - 0.5 else 1.0
                c = (CYAN[0], CYAN[1], CYAN[2], int(255*aa))
                px[y*S + x] = alpha_over(px[y*S + x], c)

    # ── Text lines inside doc ──
    lx1 = int(S * 0.20)
    lh  = max(1, int(S * 0.028))
    lines = [
        (int(S*0.295), int(S*0.57), 220),
        (int(S*0.370), int(S*0.48), 160),
        (int(S*0.445), int(S*0.53), 140),
        (int(S*0.520), int(S*0.38), 110),
    ]
    for (ly, lx2, alpha) in lines:
        for dy in range(lh):
            for x in range(lx1, lx2):
                y = ly + dy
                if 0 <= y < S and 0 <= x < S and px[y*S+x][3] > 0:
                    px[y*S+x] = alpha_over(px[y*S+x], (CYAN[0], CYAN[1], CYAN[2], alpha))

    # ── Plus circle bottom-right ──
    ccx = int(S * 0.745)
    ccy = int(S * 0.745)
    cr  = int(S * 0.185)
    psw = max(2, int(S * 0.030))

    for y in range(S):
        for x in range(S):
            if px[y*S + x][3] == 0:
                continue
            d = math.hypot(x - ccx, y - ccy)
            if d < cr - psw - 0.5:
                # inner fill — slight cyan tint on bg
                px[y*S+x] = alpha_over(px[y*S+x], (CYAN[0], CYAN[1], CYAN[2], 25))
            elif d < cr + 0.5:
                aa = min(1.0, cr - d + 0.5) if d > cr - 0.5 else 1.0
                px[y*S+x] = alpha_over(px[y*S+x], (CYAN[0], CYAN[1], CYAN[2], int(255*aa)))

    # ── Plus sign ──
    pa  = int(cr * 0.50)
    pt  = max(1, int(S * 0.028))
    half = pt // 2
    for k in range(-pa, pa+1):
        for t in range(-half, half+1):
            # horizontal
            x, y = ccx+k, ccy+t
            if 0 <= x < S and 0 <= y < S and px[y*S+x][3] > 0:
                px[y*S+x] = alpha_over(px[y*S+x], (BG[0], BG[1], BG[2], 245))
            # vertical
            x, y = ccx+t, ccy+k
            if 0 <= x < S and 0 <= y < S and px[y*S+x][3] > 0:
                px[y*S+x] = alpha_over(px[y*S+x], (BG[0], BG[1], BG[2], 245))

    return px

os.makedirs('icons', exist_ok=True)
for size in [72, 96, 128, 144, 152, 192, 384, 512]:
    pixels = draw_icon(size)
    write_png(f'icons/icon-{size}.png', size, size, pixels)
    print(f'  icon-{size}.png ✓')
print('Icons generated.')
