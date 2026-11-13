// Escena base de Babylon.js: motor, cámaras, luces y niebla. Usa el global BABYLON (vendor/babylon/babylon.js).
import { SLog } from '../../core/SLog.js';

export class SceneModule {
  constructor(canvas) {
    const B = BABYLON;
    this.canvas = canvas;
    this.engine = new B.Engine(canvas, true, { antialias: true, stencil: false });
    this.scene = new B.Scene(this.engine);
    this.scene.clearColor = new B.Color4(0.04, 0.2, 0.3, 1);
    this.scene.fogMode = B.Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.02;
    this.scene.fogColor = new B.Color3(0.04, 0.2, 0.3);
    this.ambient = new B.HemisphericLight('ambiente', new B.Vector3(0, 1, 0), this.scene);
    this.ambient.groundColor = new B.Color3(0.05, 0.1, 0.15);
    this.sun = new B.DirectionalLight('sol', new B.Vector3(-0.3, -1, 0.25), this.scene);
    this.arc = new B.ArcRotateCamera('camara', -Math.PI / 2, 1.2, 9, B.Vector3.Zero(), this.scene);
    this.arc.minZ = 0.1; this.arc.maxZ = 2000; this.arc.lowerRadiusLimit = 2; this.arc.upperRadiusLimit = 60;
    this.arc.wheelPrecision = 20; this.arc.panningSensibility = 0;
    this.proa = new B.UniversalCamera('proa', B.Vector3.Zero(), this.scene);
    this.proa.minZ = 0.05; this.proa.maxZ = 2000; this.proa.fov = 1.0;
    this.scene.activeCamera = this.arc;
    SLog.info('Scene', `Babylon.js ${B.Engine.Version} inicializado`, { webgl: this.engine.webGLVersion });
  }
  get camera() { return this.scene.activeCamera; }
  resize() { this.engine.resize(); }
  /** Bucle de render. onFrame(dtSegundos) se llama antes de cada fotograma. */
  run(onFrame) {
    this.engine.runRenderLoop(() => { onFrame(Math.min(0.1, this.engine.getDeltaTime() / 1000)); this.scene.render(); });
  }
}
