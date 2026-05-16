import struct, zlib, os

def chunk(t, d):
    crc = zlib.crc32(t + d) & 0xffffffff
    return struct.pack('>I', len(d)) + t + d + struct.pack('>I', crc)

def make_png(w, h, r, g, b):
    sig = bytes([137, 80, 78, 71, 13, 10, 26, 10])
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    raw = b''.join(bytes([0]) + bytes([r, g, b] * w) for _ in range(h))
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

os.makedirs('assets', exist_ok=True)
for name, r, g, b in [
    ('icon.png',          27, 169, 123),
    ('adaptive-icon.png', 27, 169, 123),
    ('splash-icon.png',   12,  14,  26),
    ('favicon.png',       27, 169, 123),
]:
    data = make_png(64, 64, r, g, b)
    with open('assets/' + name, 'wb') as f:
        f.write(data)
    print(f'assets/{name} ok ({len(data)}b)')
