#!/usr/bin/env python3
"""Genera los modelos .glb de las piezas y las texturas del entorno (mar, fondo, interior).

Uso:  python3 tools/generar_assets.py [pieza ...|entorno]     (desde la raíz del proyecto)
Requiere: numpy y Pillow. Es solo una herramienta de desarrollo: el simulador usa los archivos resultantes.
Convención de ejes de cada pieza: +z proa/largo, +x ancho, +y alto. El cargador escala cada pieza a su `visual` de parts.json.
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import texturas as T
from geom import MODELOS, TEX, escribir_glb
from piezas import PIEZAS

def entorno_equirect(w=1024, h=512):
    """Panorama submarino: luz cenital turquesa que se apaga en profundidad, con haces de sol."""
    y = np.linspace(0, 1, h)[:, None]; x = np.linspace(0, 1, w)[None, :]
    top = np.array([0.80, 0.97, 1.0]); mid = np.array([0.24, 0.55, 0.66]); bot = np.array([0.05, 0.12, 0.17])
    t = np.clip(y * 2, 0, 1)[..., None]
    img = np.where(y[..., None] < 0.5, top * (1 - t) + mid * t, mid * (1 - (y[..., None] - .5) * 2) + bot * ((y[..., None] - .5) * 2))
    img = np.broadcast_to(img, (h, w, 3)).copy()
    haces = T.ruido(w, 1.8, 7, aniso=(1.0, 0.03))[:h, :] if h <= w else None
    haces = np.clip((haces - 0.45) * 2.4, 0, 1) ** 1.6
    img += haces[..., None] * np.clip(1 - y * 1.6, 0, 1)[..., None] * np.array([0.7, 0.9, 0.85])
    img += (T.ruido(w, 1.2, 9)[:h, :] - 0.5)[..., None] * 0.03
    return np.clip(img, 0, 1)


def exportar_entorno():
    os.makedirs(TEX, exist_ok=True)
    for nm, n in (('arena', 1024), ('roca', 1024), ('coral', 512), ('placa_antideslizante', 512), ('panel_interior', 512), ('acero', 512), ('metal_oscuro', 512)):
        T.exportar_conjunto(TEX, nm, getattr(T, nm)(n=n))
    T.guardar(f'{TEX}/alga_albedo.png', T.alga()[0]); T.guardar(f'{TEX}/alga_normal.png', T.alga()[1])
    T.guardar(f'{TEX}/agua_normal.png', T.agua_normal())
    T.guardar(f'{TEX}/rayos_luz.png', T.rayos_luz())
    T.guardar(f'{TEX}/pantalla.png', T.pantalla())
    T.guardar(f'{TEX}/entorno_agua.png', entorno_equirect())


if __name__ == '__main__':
    os.makedirs(MODELOS, exist_ok=True)
    solo = sys.argv[1:]
    for nombre, fn in PIEZAS.items():
        if solo and nombre not in solo: continue
        tam = escribir_glb(os.path.join(MODELOS, nombre + '.glb'), fn(), nombre)
        print(f'{nombre}.glb  {tam / 1024:.0f} KB')
    if not solo or 'entorno' in solo:
        exportar_entorno(); print('texturas de entorno listas')
