// Visor de desarrollo: muestra todos los .glb en una cuadrícula con el entorno IBL del simulador. Uso: abrir /tools/visor.html
const B = BABYLON, canvas = document.getElementById('c');
const engine = new B.Engine(canvas, true), scene = new B.Scene(engine);
scene.clearColor = new B.Color4(0.03, 0.12, 0.18, 1);
scene.environmentTexture = new B.EquiRectangularCubeTexture('../assets/textures/entorno_agua.png', scene, 256);
scene.environmentIntensity = parseFloat(new URLSearchParams(location.search).get('env') ?? 2.6);
new B.HemisphericLight('hemi', new B.Vector3(0, 1, 0), scene).intensity = 0.55;
new B.DirectionalLight('sol', new B.Vector3(-0.4, -1, 0.3), scene).intensity = 2.2;
const q = new URLSearchParams(location.search);
const piezas = ['casco-principal', 'casco-esfera', 'modulo-propulsion', 'tanque-lastre', 'cabina-control', 'aletas', 'torre-acceso', 'bateria', 'lastre-fijo', 'espuma', 'focos', 'sonar', 'controles', 'controles-navegacion', 'periscopio', 'portillas', 'escotilla'];
const lista = q.get('solo') ? q.get('solo').split(',') : piezas;
const cam = new B.ArcRotateCamera('cam', parseFloat(q.get('a') ?? -2.2), parseFloat(q.get('b') ?? 1.1), 15, B.Vector3.Zero(), scene);
cam.attachControl(canvas, true); cam.minZ = 0.01;
(async () => {
  const cols = Math.min(4, lista.length);
  for (let i = 0; i < lista.length; i++) {
    const r = await B.ImportMeshAsync(`../assets/models/${lista[i]}.glb`, scene);
    const root = r.meshes[0], cx = (i % cols) - (cols - 1) / 2, cz = Math.floor(i / cols);
    const w = r.meshes.filter(m => m.getTotalVertices?.());
    w.forEach(m => m.computeWorldMatrix(true));
    const mn = w.map(m => m.getBoundingInfo().boundingBox.minimumWorld).reduce((a, c) => B.Vector3.Minimize(a, c));
    const mx = w.map(m => m.getBoundingInfo().boundingBox.maximumWorld).reduce((a, c) => B.Vector3.Maximize(a, c));
    const s = 1.4 / Math.max(mx.x - mn.x, mx.y - mn.y, mx.z - mn.z), centro = mn.add(mx).scale(0.5);
    root.scaling.scaleInPlace(s);
    root.position.set(cx * 1.8 - centro.x * s, -centro.y * s, -cz * 1.8 - centro.z * s);
  }
  const rows = Math.ceil(lista.length / cols);
  cam.target.set(0, 0, -(rows - 1) * 0.9); cam.radius = lista.length > 1 ? 3.2 + rows * 1.6 : 2.6;
  window.__listo = true;
})();
engine.runRenderLoop(() => scene.render()); addEventListener('resize', () => engine.resize());
