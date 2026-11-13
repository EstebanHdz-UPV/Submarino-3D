#!/usr/bin/env python3
"""Biblioteca de geometría procedural y escritor de .glb (materiales PBR con texturas PNG embebidas)."""
import io, json, os, struct, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import texturas as T

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODELOS = os.path.join(RAIZ, 'assets', 'models')
TEX = os.path.join(RAIZ, 'assets', 'textures')
PI = np.pi


# ---------------------------------------------------------------- geometría
class Malla:
    """Acumula primitivas agrupadas por material."""
    def __init__(self):
        self.partes = {}  # material -> lista de (P, N, UV, I)
        self.hijos = []   # [(nombre_nodo, traslacion, Malla)]

    def add(self, mat, prim):
        self.partes.setdefault(mat, []).append(prim)
        return self


def superficie(f, nu, nv, uv=(1, 1), cerrado_u=True, volteo=False):
    """Superficie paramétrica f(u,v)->(...,3) con u,v en [0,1]; normales por diferencias finitas."""
    u = np.linspace(0, 1, nu + 1); v = np.linspace(0, 1, nv + 1)
    U, V = np.meshgrid(u, v, indexing='xy')
    P = f(U, V)
    e = 1e-4
    du = (f(np.clip(U + e, 0, 1.0 + (0 if not cerrado_u else e)), V) - f(U - e, V)) / (2 * e)
    dv = (f(U, np.clip(V + e, 0, 1)) - f(U, np.clip(V - e, 0, 1))) / (2 * e)
    N = np.cross(du, dv)
    if volteo: N = -N
    ln = np.linalg.norm(N, axis=-1, keepdims=True)
    # polos degenerados: usar la dirección radial desde el centroide de la fila
    mal = (ln[..., 0] < 1e-9)
    N = N / np.where(ln < 1e-9, 1, ln)
    if mal.any():
        C = P.mean(axis=1, keepdims=True)
        R = P - C; R /= np.maximum(np.linalg.norm(R, axis=-1, keepdims=True), 1e-9)
        N = np.where(mal[..., None], R, N)
    UV = np.stack([U * uv[0], V * uv[1]], -1)
    idx = []
    W = nu + 1
    for j in range(nv):
        for i in range(nu):
            a = j * W + i; b = a + 1; c = a + W; d = c + 1
            idx += [a, c, b, b, c, d]
    return (P.reshape(-1, 3).astype(np.float32), N.reshape(-1, 3).astype(np.float32),
            UV.reshape(-1, 2).astype(np.float32), np.array(idx, dtype=np.uint32))


def lathe(perfil, nu=48, nv=60, uv=(1, 1), volteo=False):
    """Sólido de revolución alrededor del eje z. perfil(v)->(r, z)."""
    def f(U, V):
        r, z = perfil(V)
        th = 2 * PI * U
        return np.stack([r * np.cos(th), r * np.sin(th), z], -1)
    return superficie(f, nu, nv, uv, volteo=volteo)


def cilindro(r, z0, z1, nu=40, tapas=True, r1=None):
    r1 = r if r1 is None else r1
    out = [lathe(lambda V: (r + (r1 - r) * V, z0 + (z1 - z0) * V), nu, 2)]
    if tapas:
        out.append(lathe(lambda V: (r * V, z0 + 0 * V), nu, 2, volteo=True))
        out.append(lathe(lambda V: (r1 * V, z1 + 0 * V), nu, 2))
    return out


def toro(R, r, z=0.0, nu=48, nv=16):
    def f(U, V):
        a, b = 2 * PI * U, 2 * PI * V
        return np.stack([(R + r * np.cos(b)) * np.cos(a), (R + r * np.cos(b)) * np.sin(a), z + r * np.sin(b)], -1)
    return superficie(f, nu, nv)


def superelipsoide(c, rad, e1=0.3, e2=0.3, nu=40, nv=24):
    """Bloque con aristas redondeadas (e→0 más cuadrado, e=1 elipsoide)."""
    sg = lambda a, p: np.sign(a) * np.abs(a) ** p
    def f(U, V):
        th = 2 * PI * U; ph = -PI / 2 + PI * V
        x = sg(np.cos(ph), e1) * sg(np.cos(th), e2)
        y = sg(np.cos(ph), e1) * sg(np.sin(th), e2)
        z = sg(np.sin(ph), e1)
        return np.stack([c[0] + rad[0] * x, c[1] + rad[1] * y, c[2] + rad[2] * z], -1)
    return superficie(f, nu, nv)


def caja(c, half, r=0.03, n=10, uv_por_unidad=1.0):
    """Caja de aristas redondeadas: seis caras con UV planos (sin deformar la textura) y normales continuas."""
    half = np.array(half, float); c = np.array(c, float); r = min(r, half.min() * 0.99)
    Ps, Ns, UVs, Is = [], [], [], []
    base = 0
    u = np.linspace(-1, 1, n + 1)
    U, V = np.meshgrid(u, u, indexing='xy')
    for a in range(3):
        b, d = (a + 1) % 3, (a + 2) % 3
        for s in (-1, 1):
            p = np.zeros(U.shape + (3,)); p[..., a] = s; p[..., b] = U; p[..., d] = V
            q = p * half
            inner = np.clip(q, -(half - r), half - r)
            dv = q - inner
            ln = np.linalg.norm(dv, axis=-1, keepdims=True)
            nr = dv / np.maximum(ln, 1e-9)
            pos = inner + r * nr
            uv = np.stack([(q[..., b] + half[b]) * uv_por_unidad, (q[..., d] + half[d]) * uv_por_unidad], -1)
            idx = []
            W = n + 1
            for j in range(n):
                for i in range(n):
                    a0 = j * W + i; a1 = a0 + 1; a2 = a0 + W; a3 = a2 + 1
                    idx += [a0, a2, a1, a1, a2, a3] if s * ((-1) ** a) > 0 else [a0, a1, a2, a1, a3, a2]
            Ps.append((pos + c).reshape(-1, 3)); Ns.append(nr.reshape(-1, 3)); UVs.append(uv.reshape(-1, 2))
            Is.append(np.array(idx, dtype=np.uint32) + base); base += (n + 1) ** 2
    return (np.concatenate(Ps).astype(np.float32), np.concatenate(Ns).astype(np.float32),
            np.concatenate(UVs).astype(np.float32), np.concatenate(Is))


def esfera(c, r, nu=40, nv=24):
    return superelipsoide(c, (r, r, r), 1.0, 1.0, nu, nv)


def transformar(prim, R=None, t=(0, 0, 0), s=(1, 1, 1)):
    P, N, UV, I = prim
    P = P * np.array(s, dtype=np.float32)
    Nn = N / np.array(s, dtype=np.float32)
    if R is not None:
        P = P @ R.T; Nn = Nn @ R.T
    Nn /= np.maximum(np.linalg.norm(Nn, axis=1, keepdims=True), 1e-9)
    return (P + np.array(t, dtype=np.float32)).astype(np.float32), Nn.astype(np.float32), UV, I


def rot(eje, ang):
    c, s = np.cos(ang), np.sin(ang)
    if eje == 'x': return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    if eje == 'y': return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def perfil_naca(x, t=0.14):
    return 5 * t * (0.2969 * np.sqrt(np.clip(x, 0, 1)) - 0.1260 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1015 * x ** 4)


def ala(envergadura=0.5, cuerda=0.5, cuerda_punta=0.25, grosor=0.14, barrido=0.25, torsion=0.0, nu=40, nv=14):
    """Superficie sustentadora recta a lo largo de +x. Cuerda en z, espesor en y."""
    def f(U, V):
        s = V
        c = cuerda + (cuerda_punta - cuerda) * s
        phi = 2 * PI * U
        xc = (1 + np.cos(phi)) / 2
        y = np.sign(np.sin(phi)) * perfil_naca(xc, grosor) * c
        z = (0.5 - xc) * c - barrido * s
        a = torsion * s
        zz = z * np.cos(a) - y * np.sin(a); yy = z * np.sin(a) + y * np.cos(a)
        return np.stack([envergadura * s, yy, zz], -1)
    return superficie(f, nu, nv)


def carena(perfil_xz, nu=36, nv=48, e=2.4):
    """Sólido alargado en z con sección superelíptica; perfil_xz(v)->(semiancho, semialto, z)."""
    sg = lambda a, p: np.sign(a) * np.abs(a) ** p
    def f(U, V):
        w, h, z = perfil_xz(V)
        th = 2 * PI * U
        return np.stack([w * sg(np.cos(th), 2 / e), h * sg(np.sin(th), 2 / e), z], -1)
    return superficie(f, nu, nv)


# ---------------------------------------------------------------- materiales y GLB
MATERIALES = {
    'acero':      dict(tex='acero', base=[1, 1, 1, 1], metal=1.0, rough=1.0),
    'acero_azul': dict(tex='acero', base=[0.62, 0.72, 0.88, 1], metal=1.0, rough=1.0),
    'oscuro':     dict(tex='metal_oscuro', base=[1, 1, 1, 1], metal=1.0, rough=1.0),
    'naranja':    dict(tex='pintura_naranja', base=[1, 1, 1, 1], metal=1.0, rough=1.0),
    'espuma':     dict(tex='espuma', base=[1, 1, 1, 1], metal=1.0, rough=1.0),
    'plomo':      dict(tex='plomo', base=[1, 1, 1, 1], metal=1.0, rough=1.0),
    'bateria':    dict(tex='bateria', base=[1, 1, 1, 1], metal=1.0, rough=1.0),
    'arena':      dict(tex='arena', base=[1, 1, 1, 1], metal=1.0, rough=1.0),
    'panel_int':  dict(tex='panel_interior', base=[1, 1, 1, 1], metal=1.0, rough=1.0),
    'pantalla':   dict(tex='pantalla_tex', base=[0.02, 0.03, 0.04, 1], metal=0.0, rough=0.25, emisiva_tex=True),
    'laton':      dict(base=[0.80, 0.56, 0.22, 1], metal=1.0, rough=0.32),
    'cobre':      dict(base=[0.86, 0.45, 0.30, 1], metal=1.0, rough=0.28),
    'cromo':      dict(base=[0.86, 0.88, 0.90, 1], metal=1.0, rough=0.12),
    'goma':       dict(base=[0.025, 0.027, 0.03, 1], metal=0.0, rough=0.78),
    'cristal':    dict(base=[0.62, 0.84, 0.95, 0.20], metal=0.0, rough=0.04, blend=True),
    'lente':      dict(base=[1, 0.96, 0.82, 1], metal=0.0, rough=0.08, emissive=[1, 0.95, 0.78]),
    'sonar_cupula': dict(base=[0.05, 0.06, 0.07, 1], metal=0.0, rough=0.52),
    'luz_roja':   dict(base=[1, 0.1, 0.08, 1], metal=0.0, rough=0.2, emissive=[1, 0.1, 0.06]),
    'luz_verde':  dict(base=[0.1, 1, 0.3, 1], metal=0.0, rough=0.2, emissive=[0.1, 1, 0.3]),
}
_cache_tex = {}


def textura_png(nombre, n):
    if nombre not in _cache_tex:
        fn = getattr(T, nombre)
        res = []
        for m in fn(n=n):
            b = io.BytesIO(); Image.fromarray(T._u8(m)).save(b, 'PNG', optimize=True); res.append(b.getvalue())
        _cache_tex[nombre] = res
    return _cache_tex[nombre]


def escribir_glb(ruta, malla, nombre, tam_tex=512):
    """Escribe un .glb. `malla.hijos` = [(nombre_nodo, traslacion, Malla)] añade nodos hijos (p. ej. una bisagra)."""
    binario = bytearray(); vistas = []; accesores = []; materiales = []; imagenes = []; texturas = []
    def vista(datos, target=None):
        while len(binario) % 4: binario.append(0)
        vistas.append(dict(buffer=0, byteOffset=len(binario), byteLength=len(datos), **({'target': target} if target else {})))
        binario.extend(datos)
        return len(vistas) - 1
    def acc(vw, comp, count, tipo, mn=None, mx=None):
        a = dict(bufferView=vw, componentType=comp, count=count, type=tipo)
        if mn is not None: a['min'] = mn; a['max'] = mx
        accesores.append(a); return len(accesores) - 1
    idx_mat = {}
    def material(nm):
        if nm in idx_mat: return idx_mat[nm]
        spec = MATERIALES[nm]
        m = {'name': nm, 'pbrMetallicRoughness': {'baseColorFactor': spec['base'], 'metallicFactor': spec['metal'], 'roughnessFactor': spec['rough']}, 'doubleSided': True}
        if spec.get('blend'): m['alphaMode'] = 'BLEND'
        if spec.get('emissive'): m['emissiveFactor'] = spec['emissive']
        if spec.get('tex'):
            png3 = textura_png(spec['tex'], 1024 if spec['tex'] == 'arena' else tam_tex)
            ids = []
            for png in png3:
                imagenes.append({'bufferView': vista(png), 'mimeType': 'image/png'}); ids.append(len(imagenes) - 1)
            for i in ids: texturas.append({'sampler': 0, 'source': i})
            t0 = len(texturas) - 3
            m['pbrMetallicRoughness']['baseColorTexture'] = {'index': t0}
            m['pbrMetallicRoughness']['metallicRoughnessTexture'] = {'index': t0 + 2}
            m['normalTexture'] = {'index': t0 + 1}
            m['occlusionTexture'] = {'index': t0 + 2}
            if spec.get('emisiva_tex'):
                m['emissiveTexture'] = {'index': t0}; m['emissiveFactor'] = [1, 1, 1]
        idx_mat[nm] = len(materiales); materiales.append(m)
        return idx_mat[nm]
    mallas_glb = []
    def mesh_de(ml, nom):
        prims = []
        for nm, lista in ml.partes.items():
            mi = material(nm)
            P = np.concatenate([p[0] for p in lista]); N = np.concatenate([p[1] for p in lista]); UV = np.concatenate([p[2] for p in lista])
            base = 0; I = []
            for p in lista:
                I.append(p[3] + base); base += len(p[0])
            I = np.concatenate(I).astype(np.uint32)
            a_p = acc(vista(P.tobytes(), 34962), 5126, len(P), 'VEC3', P.min(0).tolist(), P.max(0).tolist())
            a_n = acc(vista(N.tobytes(), 34962), 5126, len(N), 'VEC3')
            a_t = acc(vista(UV.tobytes(), 34962), 5126, len(UV), 'VEC2')
            a_i = acc(vista(I.tobytes(), 34963), 5125, len(I), 'SCALAR')
            prims.append({'attributes': {'POSITION': a_p, 'NORMAL': a_n, 'TEXCOORD_0': a_t}, 'indices': a_i, 'material': mi})
        mallas_glb.append({'name': nom, 'primitives': prims}); return len(mallas_glb) - 1
    nodos = [{'mesh': mesh_de(malla, nombre), 'name': nombre}]
    for nom, tr, sub in getattr(malla, 'hijos', []):
        nodos.append({'name': nom, 'translation': [float(x) for x in tr], 'mesh': mesh_de(sub, nom + '-malla')})
        nodos[0].setdefault('children', []).append(len(nodos) - 1)
    while len(binario) % 4: binario.append(0)
    j = {'asset': {'version': '2.0', 'generator': 'tools/generar_assets.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}],
         'nodes': nodos, 'meshes': mallas_glb, 'materials': materiales,
         'accessors': accesores, 'bufferViews': vistas, 'buffers': [{'byteLength': len(binario)}],
         'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]}
    if imagenes: j['images'] = imagenes; j['textures'] = texturas
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    total = 12 + 8 + len(js) + 8 + len(binario)
    with open(ruta, 'wb') as fh:
        fh.write(struct.pack('<4sII', b'glTF', 2, total))
        fh.write(struct.pack('<II', len(js), 0x4E4F534A)); fh.write(js)
        fh.write(struct.pack('<II', len(binario), 0x004E4942)); fh.write(binario)
    return total
