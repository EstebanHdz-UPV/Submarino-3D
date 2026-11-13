"""Texturas PBR procedurales (sin costuras) para el simulador.

Cada material devuelve tres mapas del mismo tamaño:
  albedo (RGB), normal (RGB, convención OpenGL/glTF) y orm (R=oclusión, G=rugosidad, B=metálico).
Herramienta de desarrollo: los PNG resultantes se guardan en el proyecto; el simulador no necesita Python.
"""
import numpy as np
from PIL import Image


def _rng(seed):
    return np.random.default_rng(seed)


def ruido(n, beta=2.0, seed=0, aniso=(1.0, 1.0)):
    """Ruido fractal periódico (filtrado 1/f^beta en frecuencia). aniso estira el grano en x o y."""
    r = _rng(seed)
    f = np.fft.fft2(r.standard_normal((n, n)))
    fy = np.fft.fftfreq(n)[:, None] * aniso[1]
    fx = np.fft.fftfreq(n)[None, :] * aniso[0]
    d = np.sqrt(fx ** 2 + fy ** 2)
    d[0, 0] = 1
    f = f / d ** (beta / 2)
    f[0, 0] = 0
    a = np.real(np.fft.ifft2(f))
    a = (a - a.min()) / (a.max() - a.min() + 1e-9)
    return a


def normal_desde_altura(h, fuerza=2.0):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * fuerza * h.shape[1] / 64
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * fuerza * h.shape[0] / 64
    n = np.stack([-dx, dy, np.ones_like(h)], -1)  # +Y hacia arriba en la imagen (glTF)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


def _u8(a):
    return (np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)


def guardar(ruta, a):
    Image.fromarray(_u8(a)).save(ruta, optimize=True)


def _rejilla(n):
    y, x = np.mgrid[0:n, 0:n]
    return x, y


def _remaches(n, paso, margen, radio, seed=0):
    """Altura de remaches a lo largo de las uniones de paneles."""
    x, y = _rejilla(n)
    h = np.zeros((n, n))
    for cx in range(0, n, paso):
        for cy in range(margen, n, paso // 2):
            for ox in (margen, -margen):
                px, py = (cx + ox) % n, cy
                d = np.minimum.reduce([np.hypot((x - px + k * n), (y - py + m * n)) for k in (-1, 0, 1) for m in (-1, 0, 1)])
                h += np.clip(1 - d / radius_safe(radio), 0, 1) ** 0.5
    return np.clip(h, 0, 1)


def radius_safe(r):
    return max(r, 1.0)


def _juntas(n, paso, ancho=2):
    """Surcos de unión de paneles (1 = surco)."""
    x, y = _rejilla(n)
    g = np.zeros((n, n))
    for k in range(0, n, paso):
        g = np.maximum(g, np.clip(1 - np.abs((x - k + n / 2) % n - n / 2) / ancho, 0, 1))
        g = np.maximum(g, np.clip(1 - np.abs((y - k + n / 2) % n - n / 2) / ancho, 0, 1))
    return g


def acero(n=512, seed=1):
    """Acero pintado/cepillado, neutro y claro (el casco lo tiñe según su material)."""
    cepillado = ruido(n, 1.2, seed, aniso=(0.08, 1.0)) - 0.5
    mancha = ruido(n, 3.0, seed + 1)
    rasguno = ruido(n, 0.8, seed + 2, aniso=(1.0, 0.05))
    juntas = _juntas(n, n // 4, 2.2)
    rem = _remaches(n, n // 4, 8, 3.2, seed)
    sucio = np.clip((mancha - 0.45) * 2.2, 0, 1)
    base = 0.80 + cepillado * 0.12 - sucio * 0.14 - juntas * 0.28 - (rasguno > 0.93) * 0.10
    oxido = np.clip((ruido(n, 2.4, seed + 3) - 0.72) * 4, 0, 1) * (0.5 + 0.5 * juntas)
    alb = np.stack([base + oxido * 0.14, base - oxido * 0.02, base - oxido * 0.12], -1)
    alb = alb * (1 - rem[..., None] * 0.08)
    altura = -juntas * 0.9 + rem * 0.5 + cepillado * 0.12 + ruido(n, 2.0, seed + 4) * 0.08
    nor = normal_desde_altura(altura, 2.2)
    rug = np.clip(0.34 + sucio * 0.28 + oxido * 0.3 + (rasguno > 0.93) * 0.1 + cepillado * 0.12, 0.15, 0.95)
    met = np.clip(0.9 - oxido * 0.5 - sucio * 0.12, 0.2, 1)
    occ = np.clip(1 - juntas * 0.55, 0, 1)
    return alb, nor, np.stack([occ, rug, met], -1)


def metal_oscuro(n=512, seed=11):
    cep = ruido(n, 1.3, seed, aniso=(0.1, 1.0)) - 0.5
    mancha = ruido(n, 3.0, seed + 1)
    juntas = _juntas(n, n // 2, 2.4)
    rem = _remaches(n, n // 2, 10, 3.6, seed)
    gasto = np.clip((ruido(n, 1.6, seed + 2) - 0.74) * 5, 0, 1)
    b = 0.20 + cep * 0.07 + mancha * 0.05 - juntas * 0.1 + gasto * 0.26
    alb = np.stack([b, b * 1.02, b * 1.08], -1)
    altura = -juntas * 0.8 + rem * 0.6 + cep * 0.1
    nor = normal_desde_altura(altura, 2.0)
    rug = np.clip(0.42 + mancha * 0.22 - gasto * 0.12, 0.2, 0.9)
    met = np.clip(0.82 + gasto * 0.15, 0, 1) * np.ones((n, n))
    return alb, nor, np.stack([1 - juntas * 0.5, rug, met], -1)


def pintura_naranja(n=512, seed=21):
    """Pintura naranja de seguridad con desconchones que dejan ver el metal."""
    mancha = ruido(n, 3.2, seed)
    ast = ruido(n, 1.8, seed + 1)
    desc = np.clip((ast - 0.70) * 5, 0, 1) * np.clip((ruido(n, 1.0, seed + 2) - 0.35) * 3, 0, 1)
    juntas = _juntas(n, n // 2, 2.2)
    base = np.array([0.86, 0.34, 0.07])
    pint = base[None, None, :] * (0.88 + mancha[..., None] * 0.22) * (1 - juntas[..., None] * 0.3)
    metal = np.array([0.38, 0.38, 0.40])[None, None, :] * (0.8 + ast[..., None] * 0.4)
    alb = pint * (1 - desc[..., None]) + metal * desc[..., None]
    altura = -juntas * 0.8 - desc * 0.35 + ruido(n, 2.2, seed + 3) * 0.1
    nor = normal_desde_altura(altura, 2.0)
    rug = np.clip(0.38 + mancha * 0.18 + desc * 0.35, 0.2, 0.95)
    met = desc * 0.8
    return alb, nor, np.stack([1 - juntas * 0.5, rug, met], -1)


def espuma(n=512, seed=31):
    """Espuma sintáctica: microesferas huecas en resina naranja-amarilla."""
    r = _rng(seed)
    h = np.zeros((n, n))
    x, y = _rejilla(n)
    for _ in range(2600):
        cx, cy, rad = r.integers(0, n), r.integers(0, n), r.uniform(2.0, 6.5)
        dx = np.minimum(np.abs(x - cx), n - np.abs(x - cx)); dy = np.minimum(np.abs(y - cy), n - np.abs(y - cy))
        d = np.hypot(dx, dy) / rad
        h = np.maximum(h, np.clip(1 - d ** 2, 0, 1) ** 0.5 * r.uniform(0.5, 1))
    mancha = ruido(n, 3.0, seed + 1)
    base = np.array([0.95, 0.62, 0.12]) * (0.82 + mancha[..., None] * 0.3)
    alb = base * (0.7 + h[..., None] * 0.4)
    nor = normal_desde_altura(h * 0.8 + ruido(n, 2, seed + 2) * 0.1, 1.6)
    rug = np.clip(0.78 - h * 0.1, 0.5, 0.95)
    return alb, nor, np.stack([0.55 + h * 0.45, rug, np.zeros((n, n))], -1)


def plomo(n=512, seed=41):
    m = ruido(n, 2.6, seed); fino = ruido(n, 1.0, seed + 1)
    ox = np.clip((ruido(n, 2.2, seed + 2) - 0.6) * 3, 0, 1)
    b = 0.38 + m * 0.12 + (fino - 0.5) * 0.05
    alb = np.stack([b + ox * 0.18, b + ox * 0.17, b + ox * 0.14], -1)
    nor = normal_desde_altura(m * 0.5 + fino * 0.25, 1.5)
    return alb, nor, np.stack([np.ones((n, n)) * 0.9, np.clip(0.62 + ox * 0.25, 0, 1), np.clip(0.65 - ox * 0.4, 0, 1)], -1)


def bateria(n=512, seed=51):
    """Carcasa de módulo de baterías: polímero verde oscuro con nervaduras y banda de etiqueta."""
    x, y = _rejilla(n)
    nerv = (np.sin(x * 2 * np.pi / (n / 16)) * 0.5 + 0.5) ** 3
    m = ruido(n, 2.6, seed)
    b = 0.10 + m * 0.05
    alb = np.stack([b * 0.7, b * 2.5, b * 1.2], -1)
    banda = (np.abs(y - n / 2) < n * 0.12)[..., None]
    alb = np.where(banda, np.array([0.8, 0.82, 0.78]) * (0.8 + m[..., None] * 0.2), alb)
    # franjas de peligro dentro de la banda
    franja = (((x + y) // 22) % 2 == 0) & (np.abs(y - n / 2) < n * 0.035)
    alb = np.where(franja[..., None], np.array([0.95, 0.75, 0.1]), alb)
    nor = normal_desde_altura(nerv * 0.4 + m * 0.15, 1.8)
    return alb, nor, np.stack([np.ones((n, n)) * 0.9, np.clip(0.5 + m * 0.2, 0, 1), np.ones((n, n)) * 0.05], -1)


def placa_antideslizante(n=512, seed=61):
    """Chapa estriada (rombos) para la cubierta interior."""
    x, y = _rejilla(n)
    paso = n / 8
    u = (x % paso) / paso; v = (y % paso) / paso
    a = np.clip(1 - np.abs(((u + v) % 1) - 0.5) * 6, 0, 1) * (1 - (np.abs(u - 0.5) > 0.42))
    b = np.clip(1 - np.abs(((u - v) % 1) - 0.5) * 6, 0, 1)
    rombo = np.maximum(np.clip(1 - np.hypot(u - 0.5, (v - 0.5) * 2.4) * 2.4, 0, 1), 0)
    paso2 = (x // paso + y // paso) % 2
    h = np.where(paso2 == 0, np.clip(1 - np.hypot((u - .5) * 3.5, (v - .5) * 0.9) * 2.2, 0, 1), np.clip(1 - np.hypot((u - .5) * 0.9, (v - .5) * 3.5) * 2.2, 0, 1))
    desg = ruido(n, 2.6, seed)
    b0 = 0.46 + desg * 0.12 - h * 0.05
    alb = np.stack([b0, b0 * 1.02, b0 * 1.05], -1)
    nor = normal_desde_altura(h * 0.9 + desg * 0.06, 2.4)
    return alb, nor, np.stack([1 - h * 0.3, np.clip(0.4 + desg * 0.3 - h * 0.1, 0, 1), np.ones((n, n)) * 0.85], -1)


def panel_interior(n=512, seed=71):
    """Revestimiento interior: paneles de aluminio anodizado gris azulado con juntas y tornillería."""
    juntas = _juntas(n, n // 2, 1.8)
    tor = _remaches(n, n // 2, 14, 2.6, seed)
    cep = ruido(n, 1.3, seed, aniso=(1.0, 0.1)) - 0.5
    m = ruido(n, 3, seed + 1)
    b = 0.50 + cep * 0.07 + m * 0.06 - juntas * 0.25
    alb = np.stack([b * 0.86, b * 0.93, b * 1.05], -1)
    nor = normal_desde_altura(-juntas * 0.8 + tor * 0.5 + cep * 0.1, 2.0)
    return alb, nor, np.stack([1 - juntas * 0.6, np.clip(0.38 + m * 0.2, 0, 1), np.ones((n, n)) * 0.7], -1)


def arena(n=1024, seed=81):
    """Sedimento marino con rizaduras de corriente y granos."""
    x, y = _rejilla(n)
    warp = ruido(n, 3.2, seed) * 16
    rizo = np.sin((x + warp * 2 + y * 0.22) * 2 * np.pi / (n / 12)) * 0.5 + 0.5
    rizo = rizo ** 1.6
    gran = ruido(n, 0.4, seed + 1)
    mancha = ruido(n, 3.0, seed + 2)
    conchas = ruido(n, 0.5, seed + 3) > 0.985
    c0 = np.array([0.66, 0.60, 0.46]); c1 = np.array([0.46, 0.41, 0.31])
    alb = c1 + (c0 - c1) * (rizo[..., None] * 0.5 + mancha[..., None] * 0.5)
    alb *= 0.9 + gran[..., None] * 0.2
    alb = np.where(conchas[..., None], np.array([0.85, 0.82, 0.74]), alb)
    altura = rizo * 0.5 + gran * 0.18 + mancha * 0.1
    nor = normal_desde_altura(altura, 3.0)
    return alb, nor, np.stack([1 - rizo * 0.25, np.clip(0.9 - gran * 0.1, 0, 1), np.zeros((n, n))], -1)


def roca(n=1024, seed=91):
    g = ruido(n, 2.8, seed); f = ruido(n, 1.4, seed + 1); fis = ruido(n, 2.0, seed + 2)
    grieta = np.clip(1 - np.abs(fis - 0.5) * 22, 0, 1)
    alga = np.clip((ruido(n, 2.6, seed + 3) - 0.62) * 4, 0, 1)
    b = 0.22 + g * 0.22 + f * 0.1 - grieta * 0.14
    alb = np.stack([b * 0.95, b, b * 1.02], -1)
    alb = alb * (1 - alga[..., None]) + np.array([0.14, 0.26, 0.12])[None, None, :] * alga[..., None]
    altura = g * 0.7 + f * 0.35 - grieta * 0.5
    nor = normal_desde_altura(altura, 3.6)
    return alb, nor, np.stack([1 - grieta * 0.6, np.clip(0.78 - alga * 0.2, 0, 1), np.zeros((n, n))], -1)


def agua_normal(n=512, seed=101):
    """Mapa normal de oleaje (suma de ondas cruzadas + ondas capilares)."""
    h = ruido(n, 2.2, seed) * 1.0 + ruido(n, 1.2, seed + 1) * 0.35
    x, y = _rejilla(n)
    h += (np.sin(x * 2 * np.pi / (n / 8) + ruido(n, 3, seed + 2) * 6) * 0.5 + 0.5) * 0.12
    return normal_desde_altura(h, 1.4)


def alga(n=256, seed=111):
    """Hoja de alga: gradiente verde-ocre con nervio central (u = ancho de la hoja)."""
    x, y = _rejilla(n)
    u = x / (n - 1); v = y / (n - 1)
    m = ruido(n, 2.6, seed)
    nervio = np.clip(1 - np.abs(u - 0.5) * 18, 0, 1)
    venas = (np.sin((v * 40 + np.abs(u - 0.5) * 30) * np.pi) * 0.5 + 0.5) * 0.18
    base = np.stack([0.30 + v * 0.2, 0.42 - v * 0.04, 0.10 + (1 - v) * 0.04], -1)
    alb = base * (0.8 + m[..., None] * 0.35) + nervio[..., None] * 0.08 + venas[..., None] * 0.1
    nor = normal_desde_altura(nervio * 0.5 + venas * 0.4, 1.6)
    return alb, nor, np.stack([np.ones((n, n)), np.clip(0.55 + m * 0.2, 0, 1), np.zeros((n, n))], -1)


def coral(n=512, seed=121):
    """Coral/esponja: textura porosa rosada-anaranjada."""
    r = _rng(seed)
    h = np.zeros((n, n)); x, y = _rejilla(n)
    for _ in range(1400):
        cx, cy, rad = r.integers(0, n), r.integers(0, n), r.uniform(3, 9)
        dx = np.minimum(np.abs(x - cx), n - np.abs(x - cx)); dy = np.minimum(np.abs(y - cy), n - np.abs(y - cy))
        h = np.maximum(h, np.clip(1 - (np.hypot(dx, dy) / rad), 0, 1))
    m = ruido(n, 2.6, seed + 1)
    c0 = np.array([0.88, 0.30, 0.34]); c1 = np.array([0.95, 0.60, 0.30])
    alb = (c0 + (c1 - c0) * m[..., None]) * (0.55 + h[..., None] * 0.55)
    nor = normal_desde_altura(h * 0.9, 2.4)
    return alb, nor, np.stack([0.5 + h * 0.5, np.clip(0.55 + (1 - h) * 0.25, 0, 1), np.zeros((n, n))], -1)


def rayos_luz(n=512, seed=131):
    """Haces de luz solar en el agua: franjas verticales suaves (canal alfa en gris)."""
    x, y = _rejilla(n)
    r = ruido(n, 1.8, seed, aniso=(1.0, 0.04))
    r = np.clip((r - 0.35) * 2.4, 0, 1) ** 1.5
    fade = np.clip(1 - y / n, 0, 1) ** 0.8
    a = r * fade
    return np.stack([a, a, a], -1)


def pantalla(n=512, seed=141):
    """Pantallas del puesto de mando (emisivo): sonar, perfil de profundidad y telemetría."""
    img = np.zeros((n, n, 3)) + np.array([0.02, 0.05, 0.07])
    x, y = _rejilla(n)
    # sonar circular
    cx, cy, R = n * 0.27, n * 0.5, n * 0.22
    d = np.hypot(x - cx, y - cy)
    ang = np.arctan2(y - cy, x - cx)
    aro = (np.abs(d % (R / 3) - 0) < 1.2) & (d < R)
    img[aro] = np.array([0.1, 0.55, 0.35])
    barrido = (d < R) * np.clip(1 - ((ang - 0.9) % (2 * np.pi)) / 1.6, 0, 1)
    img += barrido[..., None] * np.array([0.0, 0.5, 0.2])
    r = _rng(seed)
    for _ in range(14):
        px, py = r.uniform(cx - R * .7, cx + R * .7), r.uniform(cy - R * .7, cy + R * .7)
        img[np.hypot(x - px, y - py) < 3.2] = np.array([0.6, 1, 0.7])
    # gráfica
    gx0, gx1, gy0, gy1 = int(n * 0.55), int(n * 0.95), int(n * 0.12), int(n * 0.45)
    img[gy0:gy1, gx0:gx1] = np.array([0.03, 0.09, 0.13])
    xs = np.arange(gx0, gx1)
    ys = (gy0 + (gy1 - gy0) * (0.5 + 0.35 * np.sin((xs - gx0) / 18.0) * np.exp(-(xs - gx0) / 220.0))).astype(int)
    for xx, yy in zip(xs, ys):
        img[max(yy - 1, 0):yy + 2, xx] = np.array([0.2, 0.9, 1])
    # barras de telemetría
    for i in range(6):
        y0 = int(n * 0.58 + i * n * 0.062)
        w = int((gx1 - gx0) * r.uniform(0.2, 0.95))
        img[y0:y0 + int(n * 0.03), gx0:gx0 + w] = np.array([1.0, 0.7, 0.2]) if i % 3 == 2 else np.array([0.2, 0.8, 1.0])
    img += (ruido(n, 0.3, seed) - 0.5)[..., None] * 0.02
    return img


def exportar_conjunto(dir_, nombre, trio):
    alb, nor, orm = trio
    guardar(f"{dir_}/{nombre}_albedo.png", alb)
    guardar(f"{dir_}/{nombre}_normal.png", nor)
    guardar(f"{dir_}/{nombre}_orm.png", orm)


def pantalla_tex(n=512, seed=141):
    """Pantalla como conjunto PBR (la imagen es también el emisivo)."""
    img = pantalla(n, seed)
    plano = np.stack([np.full((n, n), 0.5), np.full((n, n), 0.5), np.ones((n, n))], -1)
    orm = np.stack([np.ones((n, n)), np.full((n, n), 0.22), np.zeros((n, n))], -1)
    return img, plano, orm
