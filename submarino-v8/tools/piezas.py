"""Definición geométrica de cada pieza (coordenadas locales aprox. en [-0.5, 0.5]; el cargador las escala a `visual`)."""
import numpy as np
from geom import (Malla, superficie, lathe, cilindro, toro, superelipsoide, caja, esfera, transformar, rot, ala, carena, PI)


def poner(m, mat, prims, R=None, t=(0, 0, 0), s=(1, 1, 1)):
    """Añade una primitiva (o lista) transformada."""
    if isinstance(prims, tuple): prims = [prims]
    for p in prims:
        m.add(mat, transformar(p, R, t, s))
    return m


def cil_y(m, mat, r, y0, y1, t=(0, 0, 0), nu=36, r1=None):
    """Cilindro con eje vertical (y) entre y0 e y1."""
    return poner(m, mat, cilindro(r, y0, y1, nu, True, r1), rot('x', -PI / 2), t)


def cil_x(m, mat, r, x0, x1, t=(0, 0, 0), nu=32):
    """Cilindro con eje horizontal (x) entre x0 e x1."""
    return poner(m, mat, cilindro(r, x0, x1, nu), rot('y', PI / 2), t)


# ------------------------------------------------------------------ cascos
def casco_cilindro():
    m = Malla(); R = 0.5; cl = 0.17
    soldaduras = [-0.36, -0.24, -0.12, 0.0, 0.12, 0.24, 0.36]

    def perfil(V):
        z = -0.5 + V
        d = np.abs(z) - (0.5 - cl)
        r = np.where(d > 0, R * np.sqrt(np.clip(1 - (d / cl) ** 2, 0, 1)), R)
        for a in soldaduras:
            r = r + 0.006 * np.exp(-((z - a) / 0.006) ** 2)   # cordones de soldadura entre secciones
        return np.maximum(r, 1e-4), z
    m.add('acero', lathe(perfil, 64, 360))
    return m


def casco_esfera():
    m = Malla()
    m.add('acero', lathe(lambda V: (0.5 * np.sin(PI * V) + 1e-4, -0.5 * np.cos(PI * V)), 64, 96))
    m.add('oscuro', transformar(toro(0.5, 0.009, 0.0, 96, 10)))                       # costura ecuatorial
    m.add('oscuro', transformar(toro(0.5, 0.007, 0.0, 96, 10), rot('x', PI / 2)))     # costura meridiana
    return m


# ------------------------------------------------------------------ exterior
def modulo_propulsion():
    m = Malla()

    def cuerpo(V):
        z = -0.44 + 0.94 * V
        ogiva = 0.20 * np.sqrt(np.clip(1 - ((z - 0.1) / 0.4) ** 2, 0, 1)) ** 0.9
        return np.maximum(np.where(z < 0.1, 0.20, ogiva), 1e-4), z
    m.add('oscuro', lathe(cuerpo, 40, 80))
    # tobera (duct) con perfil aerodinámico
    m.add('acero_azul', lathe(lambda V: (0.5 - 0.02 * np.sin(PI * V), -0.5 + 0.32 * V), 56, 8))
    m.add('oscuro', lathe(lambda V: (0.455 + 0.03 * np.sin(PI * V), -0.5 + 0.32 * V), 56, 8, volteo=True))
    m.add('acero_azul', transformar(toro(0.485, 0.02, -0.5, 56, 10)))
    m.add('acero_azul', transformar(toro(0.485, 0.02, -0.18, 56, 10)))
    for k in range(4):                                # estatores entre buje y tobera
        a = k * PI / 2 + PI / 4
        m.add('oscuro', transformar(ala(0.28, 0.14, 0.12, 0.12, 0.0), rot('z', a) @ rot('y', -PI / 2), t=(0, 0, -0.24)))
    m.add('cromo', lathe(lambda V: (0.075 * np.cos(0.5 * PI * V) + 1e-4, -0.50 + 0.14 * V), 24, 8))   # buje
    for k in range(5):                                # hélice de 5 palas con torsión
        m.add('laton', transformar(ala(0.43, 0.2, 0.09, 0.10, 0.04, torsion=0.55, nv=16), rot('z', k * 2 * PI / 5), t=(0, 0, -0.40)))
    return m


def tanque_lastre():
    m = Malla(); r = 0.46; cl = 0.12

    def perfil(V):
        z = -0.5 + V; d = np.abs(z) - (0.5 - cl)
        return np.maximum(np.where(d > 0, r * np.sqrt(np.clip(1 - (d / cl) ** 2, 0, 1)), r), 1e-4), z
    m.add('naranja', lathe(perfil, 56, 120))
    for z in (-0.3, 0.0, 0.3):                         # flejes de sujeción con tornillo
        m.add('oscuro', lathe(lambda V, z=z: (r + 0.012 + 0.012 * np.sin(PI * V), z - 0.035 + 0.07 * V), 56, 8))
        m.add('cromo', transformar(esfera((0, 0, 0), 0.02, 12, 8), t=(0, r + 0.03, z)))
    poner(m, 'laton', cilindro(0.045, 0, 0.12, 24), rot('x', -PI / 2), (0, r - 0.02, 0.18))   # válvula de venteo
    m.add('laton', transformar(toro(0.06, 0.012, 0, 24, 8), rot('x', -PI / 2), t=(0, r + 0.1, 0.18)))
    poner(m, 'cromo', cilindro(0.04, 0, 0.08, 20), rot('x', PI / 2), (0, -r + 0.02, -0.18))   # toma de inundación
    return m


def cabina_domo():
    m = Malla()
    m.add('acero', lathe(lambda V: (np.full_like(V, 0.5), -0.5 + 0.2 * V), 56, 6))             # collar
    m.add('acero', lathe(lambda V: (0.5 * V + 1e-4, np.full_like(V, -0.5)), 56, 4, volteo=True))
    m.add('cromo', transformar(toro(0.5, 0.018, -0.3, 56, 10)))
    m.add('cristal', lathe(lambda V: (np.maximum(0.47 * np.cos(0.5 * PI * V), 1e-4), -0.3 + 0.78 * np.sin(0.5 * PI * V)), 56, 40))

    def costilla(a):
        def f(U, V):
            t = 0.5 * PI * V; ph = 2 * PI * U; rc = 0.012
            c = np.stack([0.478 * np.cos(t) * np.cos(a), -0.3 + 0.79 * np.sin(t), 0.478 * np.cos(t) * np.sin(a)], -1)
            normal = np.stack([np.cos(t) * np.cos(a), np.sin(t), np.cos(t) * np.sin(a)], -1)
            tang = np.stack([-np.sin(a) * np.ones_like(t), 0 * t, np.cos(a) * np.ones_like(t)], -1)
            return c + rc * np.cos(ph)[..., None] * normal + rc * np.sin(ph)[..., None] * tang
        return superficie(f, 10, 28)
    for k in range(6):
        m.add('acero', costilla(k * PI / 3))
    m.add('acero', transformar(toro(0.40, 0.014, 0.12, 56, 10), rot('x', 0), t=(0, 0, 0)))
    m.add('acero', transformar(toro(0.22, 0.014, 0.37, 40, 10)))
    return m


def aletas():
    m = Malla()
    for k in range(4):                                 # cuatro superficies en cruz (profundidad y timón)
        m.add('acero_azul', transformar(ala(0.5, 0.42 if k % 2 == 0 else 0.40, 0.18, 0.13, 0.22), rot('z', k * PI / 2)))
    m.add('oscuro', transformar(esfera((0, 0, 0), 1, 24, 14), s=(0.085, 0.085, 0.24)))
    poner(m, 'oscuro', cilindro(0.05, -0.34, 0.2, 24))
    m.add('cromo', transformar(toro(0.055, 0.01, -0.16, 24, 8)))
    return m


def torre_acceso():
    m = Malla()

    def perf(V):
        z = -0.5 + V
        env = np.clip(1 - (np.abs(z + 0.03) / 0.5) ** 2.2, 0, 1)
        return 0.5 * env ** 0.55 + 1e-3, 0.5 * env ** 0.6 + 1e-3, z
    p, n, uv, i = carena(perf, 40, 60, e=2.6)
    p = p.copy(); p[:, 1] = np.where(p[:, 1] < -0.18, -0.18 + (p[:, 1] + 0.18) * 0.1, p[:, 1])   # base plana
    m.add('acero', (p, n, uv, i))
    poner(m, 'oscuro', cilindro(0.13, 0, 0.18, 36), rot('x', -PI / 2), (0, 0.28, 0.0))              # escotilla
    m.add('cromo', transformar(toro(0.135, 0.015, 0, 36, 10), rot('x', -PI / 2), t=(0, 0.46, 0.0)))
    m.add('laton', transformar(toro(0.07, 0.012, 0, 20, 8), rot('x', -PI / 2), t=(0, 0.47, 0.0)))
    poner(m, 'cromo', cilindro(0.012, 0, 0.30, 12), rot('x', -PI / 2), (0, 0.2, -0.22))              # mástil
    m.add('goma', transformar(superelipsoide((0, 0, 0), (0.03, 0.025, 0.05), 0.6, 0.6, 16, 10), t=(0, 0.5, -0.22)))
    return m


# ------------------------------------------------------------------ interior / pesos / flotabilidad
def bateria():
    m = Malla()
    m.add('bateria', caja((0, 0, 0), (0.5, 0.5, 0.5), 0.05, 12, 1.6))
    m.add('oscuro', caja((0, 0.47, 0), (0.43, 0.035, 0.46), 0.02, 6))
    for sx in (-0.2, 0.2):
        poner(m, 'cobre', cilindro(0.045, 0, 0.07, 20), rot('x', -PI / 2), (sx, 0.49, 0.30))
        m.add('cromo', transformar(toro(0.05, 0.01, 0, 20, 8), rot('x', -PI / 2), t=(sx, 0.56, 0.30)))
    for z in (-0.28, 0.0, 0.28):
        m.add('oscuro', caja((0, 0, z), (0.515, 0.515, 0.02), 0.012, 6))
    m.add('goma', caja((0, 0.25, 0.505), (0.2, 0.08, 0.015), 0.01, 5))
    return m


def lastre_fijo():
    m = Malla()
    for x in (-0.31, 0.0, 0.31):
        m.add('plomo', caja((x, 0, 0), (0.15, 0.5, 0.5), 0.05, 10, 1.4))
    m.add('oscuro', caja((0, 0.18, 0), (0.5, 0.05, 0.05), 0.02, 5))
    m.add('oscuro', caja((0, 0.18, 0.28), (0.5, 0.05, 0.05), 0.02, 5))
    m.add('cromo', transformar(toro(0.07, 0.014, 0, 24, 8), rot('x', PI / 2), t=(0, 0.28, 0.0)))
    return m


def espuma():
    m = Malla()
    m.add('espuma', caja((0, 0, 0), (0.5, 0.5, 0.5), 0.14, 14, 1.5))
    for z in (-0.28, 0.28):
        m.add('oscuro', caja((0, 0, z), (0.515, 0.515, 0.025), 0.014, 6))
        m.add('cromo', transformar(toro(0.06, 0.012, 0, 20, 8), rot('x', PI / 2), t=(0, 0.52, z)))
    return m


def focos():
    m = Malla()
    m.add('oscuro', lathe(lambda V: (0.44 * np.where(V > 0.7, 1.0, np.sin(PI * 0.5 * (V / 0.7))) + 1e-4, -0.5 + 0.8 * V), 40, 40))
    for z in (-0.3, -0.22, -0.14, -0.06):             # aletas de refrigeración
        m.add('oscuro', transformar(toro(0.46, 0.022, z, 40, 8)))
    m.add('cromo', transformar(toro(0.465, 0.03, 0.3, 40, 10)))
    m.add('lente', lathe(lambda V: (0.42 * V + 1e-4, 0.30 + 0.07 * (1 - V ** 2)), 40, 10))
    return m


def sonar():
    m = Malla()
    m.add('oscuro', lathe(lambda V: (np.full_like(V, 0.5), -0.5 + 0.3 * V), 48, 4))
    m.add('oscuro', lathe(lambda V: (0.5 * V + 1e-4, np.full_like(V, -0.5)), 48, 4, volteo=True))
    m.add('cromo', transformar(toro(0.5, 0.025, -0.2, 48, 10)))
    m.add('sonar_cupula', lathe(lambda V: (0.44 * np.cos(0.5 * PI * V) + 1e-4, -0.2 + 0.65 * np.sin(0.5 * PI * V)), 48, 24))
    for a in np.linspace(0, 2 * PI, 8, endpoint=False):
        m.add('cromo', transformar(esfera((0, 0, 0), 0.012, 8, 6), t=(0.41 * np.cos(a), 0.41 * np.sin(a), -0.28)))
    return m


# ------------------------------------------------------------------ piezas nuevas (antes procedurales)
def _plano(c, ex, ey, w, h, nu=2, nv=2):
    """Rectángulo orientado: centro c, ejes ex/ey (unitarios), ancho w, alto h."""
    c = np.array(c, float); ex = np.array(ex, float); ey = np.array(ey, float)
    return superficie(lambda U, V: c + (U - 0.5)[..., None] * w * ex + (V - 0.5)[..., None] * h * ey, nu, nv, cerrado_u=False)


def controles():
    """Puesto de mando interior: consola inclinada con pantalla, relojes, palancas y timón de rueda."""
    m = Malla()
    m.add('panel_int', caja((0, -0.33, 0), (0.5, 0.17, 0.5), 0.05, 10, 1.4))        # peana
    ang = -0.55                                                                                     # inclinación del panel
    R = rot('x', ang)
    m.add('oscuro', transformar(caja((0, 0, 0), (0.46, 0.085, 0.27), 0.03, 8), R, t=(0, -0.08, 0.17)))
    ey = R @ np.array([0, 0, -1.0]); ex = np.array([1.0, 0, 0]); nrm = R @ np.array([0, 1.0, 0])
    c0 = np.array([0, -0.08, 0.17]) + nrm * 0.087
    m.add('pantalla', _plano(c0 + ex * -0.10 + ey * 0.0, ex, -ey, 0.34, 0.26))                      # pantalla principal (sonar + telemetría)
    for k, x in enumerate((0.24, 0.35)):                                                           # relojes de profundidad y presión
        cc = c0 + ex * x
        m.add('laton', transformar(toro(0.055, 0.011, 0, 28, 10), R, t=tuple(cc + nrm * 0.004)))
        m.add('cristal', transformar(lathe(lambda V: (0.052 * V + 1e-4, np.zeros_like(V)), 28, 2), R, t=tuple(cc + nrm * 0.012)))
    # timón de rueda con ocho empuñaduras, frente al piloto (mira hacia popa)
    cw = np.array([0, 0.14, -0.14])
    m.add('laton', transformar(toro(0.20, 0.022, 0, 56, 12), t=tuple(cw)))
    m.add('laton', transformar(toro(0.05, 0.03, 0, 24, 10), t=tuple(cw)))
    for k in range(8):
        a = k * PI / 4
        poner(m, 'laton', cilindro(0.012, 0.0, 0.2, 10), rot('z', a) @ rot('y', PI / 2), tuple(cw))      # radios
        poner(m, 'cromo', cilindro(0.022, -0.05, 0.05, 12), None, tuple(cw + np.array([0.25 * np.cos(a), 0.25 * np.sin(a), 0])))
    cil_y(m, 'oscuro', 0.045, -0.2, 0.14, (0, 0, -0.14))                                            # columna del timón
    for s in (-1, 1):                                                                               # palancas de potencia
        x = s * 0.33
        cil_y(m, 'cromo', 0.055, -0.15, -0.09, (x, 0, -0.05))
        poner(m, 'cromo', cilindro(0.014, 0, 0.26, 10), rot('x', -PI / 2), (x, -0.09, -0.05))
        m.add('goma', transformar(esfera((0, 0, 0), 0.04, 12, 8), t=(x, 0.17, -0.05)))
    return m


def periscopio():
    m = Malla()
    cil_y(m, 'acero', 0.17, -0.45, 0.33, nu=40)                                                     # tubo
    cil_y(m, 'laton', 0.27, -0.45, -0.37)
    cil_y(m, 'laton', 0.24, 0.30, 0.37)
    cil_y(m, 'oscuro', 0.21, -0.28, -0.22)
    m.add('oscuro', caja((0, 0.43, 0.1), (0.46, 0.09, 0.4), 0.05, 8))          # cabezal óptico
    m.add('cristal', transformar(lathe(lambda V: (0.15 * V + 1e-4, np.zeros_like(V)), 28, 2), None, t=(0, 0.43, 0.5)))
    m.add('cromo', transformar(toro(0.16, 0.02, 0.0, 28, 10), None, t=(0, 0.43, 0.5)))
    m.add('laton', transformar(toro(0.2, 0.02, 0, 36, 10), rot('x', PI / 2), t=(0, 0.2, 0)))
    for k in (-1, 1):
        poner(m, 'goma', cilindro(0.035, 0, 0.12, 14), rot('x', PI / 2), (k * 0.1, 0.46, -0.28))   # oculares
    return m


def portillas():
    """Portilla pasacascos con eje en x (hacia afuera = +x)."""
    m = Malla()
    cil_x(m, 'oscuro', 0.46, -0.5, 0.35)
    m.add('laton', transformar(toro(0.44, 0.05, 0.0, 56, 14), rot('y', PI / 2), t=(0.40, 0, 0)))
    m.add('cromo', transformar(toro(0.36, 0.022, 0.0, 56, 10), rot('y', PI / 2), t=(0.34, 0, 0)))
    m.add('cristal', transformar(lathe(lambda V: (0.36 * V + 1e-4, 0.06 * (1 - V ** 2)), 40, 8), rot('y', PI / 2), t=(0.36, 0, 0)))
    for k in range(8):
        a = k * PI / 4
        poner(m, 'cromo', cilindro(0.027, 0, 0.07, 12), rot('y', PI / 2), (0.42, 0.40 * np.sin(a), 0.40 * np.cos(a)))
    return m


def escotilla():
    """Escotilla circular hermética. El nodo 'bisagra-escotilla' es el pivote que anima el cargador."""
    m = Malla()
    cil_y(m, 'oscuro', 0.5, -0.5, 0.0, nu=48)                                                      # brocal soldado al casco
    m.add('goma', transformar(toro(0.40, 0.03, 0, 48, 10), rot('x', -PI / 2), t=(0, 0.02, 0)))      # junta
    m.add('cromo', transformar(toro(0.5, 0.03, 0, 48, 10), rot('x', -PI / 2), t=(0, 0.0, 0)))
    poner(m, 'laton', cilindro(0.03, -0.12, 0.12, 12), None, (-0.42, 0.3, 0))
    tapa = Malla()
    poner(tapa, 'acero', cilindro(0.44, 0.0, 0.14, 48), rot('x', -PI / 2), (0.42, 0.0, 0))
    tapa.add('goma', transformar(toro(0.34, 0.025, 0, 48, 10), rot('x', -PI / 2), t=(0.42, -0.005, 0)))
    tapa.add('laton', transformar(toro(0.15, 0.02, 0, 36, 10), rot('x', -PI / 2), t=(0.42, 0.20, 0)))
    for k in range(3):
        a = k * 2 * PI / 3
        poner(tapa, 'laton', cilindro(0.012, 0.0, 0.15, 10), rot('y', a) @ rot('z', PI / 2), (0.42, 0.20, 0))
    poner(tapa, 'oscuro', cilindro(0.025, 0.14, 0.20, 12), rot('x', -PI / 2), (0.42, 0.0, 0))
    m.hijos.append(('bisagra-escotilla', (-0.42, 0.30, 0.0), tapa))
    return m


def _suave(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def relieve_lecho(x, z):
    """Relieve (m, relativo al fondo) en coordenadas de Babylon. Copia EXACTA de Seabed._relieve() en
    src/modules/environment/Seabed.js: el choque del casco usa esa fórmula, así que el modelo debe coincidir."""
    base = np.sin(x * 0.045) * np.cos(z * 0.037) * 3 + np.sin(x * 0.12 + z * 0.09) * 1.2 + np.sin(z * 0.2) * 0.4
    n = np.sin(x * 0.011 + 0.7) * np.cos(z * 0.009 + 0.3) + 0.5 * np.sin(x * 0.023 + z * 0.017 + 1.3) + 0.25 * np.sin(x * 0.051 - z * 0.043)
    meseta = 38 * _suave(0.34, 0.4, n)                                       # meseta con acantilado
    d1 = z - 70 * np.sin(x * 0.007 + 1) - 40; d2 = x - 60 * np.sin(z * 0.006 + 2) + 90
    dorsal1 = 24 * np.exp(-((d1 / 16) ** 2)) * (0.65 + 0.35 * np.sin(x * 0.05))  # dorsales de arrecife
    dorsal2 = 18 * np.exp(-((d2 / 14) ** 2)) * (0.7 + 0.3 * np.sin(z * 0.06 + 1))
    dx = x + z * 0.3 - 120
    canon = -24 * np.exp(-((dx / 13) ** 2)) * _suave(-0.2, 0.1, n)              # cañón
    return base + meseta + dorsal1 + dorsal2 + canon


LECHO_LADO_M = 800      # mismo tamaño que Seabed.size
LECHO_DIVISIONES = 260  # mismos nodos que la rejilla de choque de Seabed (261 x 261)


def lecho():
    """Lecho marino de 800 x 800 m a escala real (1 unidad = 1 m) con meseta, acantilados, dorsales y cañón.
    glTF es diestro y Babylon zurdo: el cargador refleja el eje x, por eso aquí se escribe -x."""
    m = Malla(); L = LECHO_LADO_M

    def f(U, V):
        x = (U - 0.5) * L; z = (V - 0.5) * L
        return np.stack([-x, relieve_lecho(x, z), z], -1)
    P, N, UV, I = superficie(f, LECHO_DIVISIONES, LECHO_DIVISIONES, uv=(1, 1), cerrado_u=False)
    # Al escribir -x el orden de los vértices queda en sentido horario: se invierte cada triángulo para que la cara
    # frontal (antihoraria en glTF) mire hacia arriba. Las normales ya apuntan a +y.
    I = np.ascontiguousarray(I.reshape(-1, 3)[:, ::-1].reshape(I.shape))
    m.add('arena', (P, N, UV, I))
    return m


def controles_navegacion():
    """Puesto de navegación: mesa con carta electrónica, bitácora con compás, rueda de seis radios, joystick de
    empuje vectorial, panel trasero con tres relojes (profundidad, presión, rumbo) y pilotos de estado."""
    m = Malla()
    m.add('panel_int', caja((0, -0.36, 0.02), (0.42, 0.14, 0.40), 0.04, 10, 1.4))           # pedestal
    m.add('oscuro', caja((0, -0.17, 0.04), (0.50, 0.05, 0.42), 0.02, 8))                   # tablero
    # carta electrónica casi horizontal (mesa de navegación)
    R = rot('x', -0.22)
    m.add('oscuro', transformar(caja((0, 0, 0), (0.30, 0.02, 0.22), 0.015, 6), R, t=(-0.06, -0.10, 0.08)))
    nrm = R @ np.array([0, 1.0, 0]); ex = np.array([1.0, 0, 0]); ey = R @ np.array([0, 0, -1.0])
    m.add('pantalla', _plano(np.array([-0.06, -0.10, 0.08]) + nrm * 0.022, ex, -ey, 0.54, 0.38))
    # panel trasero vertical con tres relojes y pilotos
    m.add('oscuro', caja((0, 0.16, 0.40), (0.48, 0.20, 0.03), 0.02, 8))
    for x in (-0.28, 0.0, 0.28):
        m.add('laton', transformar(toro(0.085, 0.014, 0, 32, 10), rot('x', PI), t=(x, 0.20, 0.365)))
        m.add('cristal', transformar(lathe(lambda V: (0.08 * V + 1e-4, np.zeros_like(V)), 32, 2), rot('x', PI), t=(x, 0.20, 0.36)))
        poner(m, 'luz_roja', cilindro(0.004, 0, 0.07, 6), rot('z', 0.6) @ rot('x', PI), (x, 0.20, 0.355))   # aguja
    for k, x in enumerate(np.linspace(-0.36, 0.36, 7)):
        m.add('luz_verde' if k % 3 else 'luz_roja', transformar(esfera((0, 0, 0), 0.016, 10, 8), t=(x, 0.04, 0.37)))
    # bitácora con compás (cúpula de cristal sobre aro de latón)
    cil_y(m, 'laton', 0.075, -0.15, -0.09, (0.33, 0, -0.02))
    m.add('laton', transformar(toro(0.075, 0.012, 0, 32, 10), rot('x', -PI / 2), t=(0.33, -0.09, -0.02)))
    m.add('cristal', transformar(lathe(lambda V: (0.07 * np.cos(0.5 * PI * V) + 1e-4, 0.07 * np.sin(0.5 * PI * V)), 28, 12), rot('x', -PI / 2), t=(0.33, -0.09, -0.02)))
    m.add('luz_roja', transformar(caja((0, 0, 0), (0.006, 0.004, 0.05), 0.002, 2), t=(0.33, -0.085, -0.02)))   # rosa del compás
    # rueda de seis radios frente al piloto (mira hacia popa, -z)
    cw = np.array([0, 0.08, -0.30])
    m.add('laton', transformar(toro(0.15, 0.016, 0, 48, 10), t=tuple(cw)))
    m.add('cromo', transformar(toro(0.035, 0.022, 0, 20, 8), t=tuple(cw)))
    for k in range(6):
        a = k * PI / 3
        poner(m, 'laton', cilindro(0.009, 0.0, 0.15, 8), rot('z', a) @ rot('y', PI / 2), tuple(cw))
        poner(m, 'goma', cilindro(0.016, -0.035, 0.035, 10), None, tuple(cw + np.array([0.185 * np.cos(a), 0.185 * np.sin(a), 0])))
    cil_y(m, 'oscuro', 0.028, -0.12, 0.08, (0, 0, -0.27))                                             # columna desde el tablero
    # joystick de empuje vectorial y palanca de lastre
    cil_y(m, 'cromo', 0.05, -0.14, -0.11, (-0.34, 0, -0.10))
    m.add('goma', transformar(toro(0.04, 0.012, 0, 20, 8), rot('x', -PI / 2), t=(-0.34, -0.11, -0.10)))       # fuelle del joystick
    poner(m, 'cromo', cilindro(0.011, 0, 0.16, 10), rot('x', -PI / 2) @ rot('x', 0.18), (-0.34, -0.11, -0.10))
    m.add('goma', transformar(superelipsoide((0, 0, 0), (0.032, 0.05, 0.032), 0.6, 0.6, 18, 12), t=(-0.34, 0.08, -0.07)))
    for s_, x in ((1, -0.2), (-1, 0.2)):
        poner(m, 'cromo', cilindro(0.008, 0, 0.12, 8), rot('x', -PI / 2) @ rot('x', 0.35 * s_), (x, -0.12, -0.14))
        m.add('luz_roja' if s_ > 0 else 'luz_verde', transformar(esfera((0, 0, 0), 0.022, 12, 8), t=(x, 0.0, -0.14 - 0.04 * s_)))
    return m


PIEZAS = {
    'casco-principal': casco_cilindro, 'casco-esfera': casco_esfera, 'modulo-propulsion': modulo_propulsion,
    'tanque-lastre': tanque_lastre, 'cabina-control': cabina_domo, 'aletas': aletas, 'torre-acceso': torre_acceso,
    'bateria': bateria, 'lastre-fijo': lastre_fijo, 'espuma': espuma, 'focos': focos, 'sonar': sonar,
    'controles': controles, 'controles-navegacion': controles_navegacion, 'periscopio': periscopio, 'portillas': portillas,
    'escotilla': escotilla, 'lecho-marino': lecho
}
