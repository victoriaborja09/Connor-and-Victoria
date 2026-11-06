import * as T from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { GLTFExporter } from "./vendor/GLTFExporter.js";
import { createCharacter, setAction, animateCharacter } from "./models.js";

const canvas = document.querySelector("#viewport"),
  stage = document.querySelector("#stage"),
  notice = document.querySelector("#notice");
let renderer;
try {
  renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
} catch (error) {
  notice.textContent =
    "WebGL is unavailable. Please enable hardware acceleration or try a WebGL-capable browser.";
  document.body.classList.add("error");
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.24;
const scene = new T.Scene();
scene.fog = new T.Fog(0xeee8df, 16, 35);
const camera = new T.PerspectiveCamera(35, 1, 0.1, 70);
camera.position.set(0, 2.9, 9.5);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.65, 0);
controls.enableDamping = true;
controls.minDistance = 3;
controls.maxDistance = 15;
controls.maxPolarAngle = Math.PI * 0.52;
scene.add(new T.HemisphereLight(0xfff5e8, 0xa59b8c, 2));
const key = new T.DirectionalLight(0xffead6, 3.3);
key.position.set(-3, 6, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -5;
key.shadow.camera.right = 5;
key.shadow.camera.top = 6;
key.shadow.camera.bottom = -5;
key.shadow.normalBias = 0.006;
key.shadow.bias = -0.0001;
key.shadow.radius = 4;
scene.add(key);
const fill = new T.DirectionalLight(0xe5edff, 1.5);
fill.position.set(4, 3, 2);
scene.add(fill);
const rim = new T.DirectionalLight(0xffe4c5, 2.3);
rim.position.set(1, 5, -4);
scene.add(rim);
const floor = new T.Mesh(
  new T.PlaneGeometry(200, 200),
  new T.ShadowMaterial({ opacity: 0.16 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.005;
floor.receiveShadow = true;
scene.add(floor);
const characters = [createCharacter("connor"), createCharacter("victoria")];
characters.forEach((c, i) => {
  c.baseX = i ? 0.65 : -0.65;
  c.root.position.x = c.baseX;
  scene.add(c.root);
});
// Doorway is deliberately a separate studio prop, never part of the town artwork.
const doorway = new T.Group();
doorway.visible = false;
doorway.position.set(0, 0, -3);
const frameMat = new T.MeshStandardMaterial({
  color: 0x807367,
  roughness: 0.9,
});
for (const x of [-1.35, 1.35]) {
  const m = new T.Mesh(new T.BoxGeometry(0.11, 3.6, 0.15), frameMat);
  m.position.set(x, 1.8, 0);
  doorway.add(m);
}
const lintel = new T.Mesh(new T.BoxGeometry(2.8, 0.11, 0.15), frameMat);
lintel.position.y = 3.6;
doorway.add(lintel);
// Opaque interior and side walls provide physical depth occlusion as they enter.
const interior = new T.Mesh(
  new T.BoxGeometry(2.6, 3.5, 0.15),
  new T.MeshStandardMaterial({ color: 0x3c3733 }),
);
interior.position.set(0, 1.75, -0.8);
doorway.add(interior);
for (const x of [-2.7, 2.7]) {
  const wall = new T.Mesh(
    new T.BoxGeometry(2.6, 3.7, 1.8),
    new T.MeshStandardMaterial({ color: 0xd7cfc4 }),
  );
  wall.position.set(x, 1.8, -0.8);
  doorway.add(wall);
}
scene.add(doorway);
let selected = "both",
  now = 0,
  paused = false;
const chosen = () =>
  characters.filter((c) => selected === "both" || selected === c.kind);
function action(mode) {
  chosen().forEach((c) => setAction(c, mode, now));
  doorway.visible = characters.some((c) => c.mode === "enter");
  document
    .querySelectorAll("[data-action]")
    .forEach((b) => b.classList.toggle("active", b.dataset.action === mode));
  updateLabels();
}
function updateLabels() {
  characters.forEach(
    (c) =>
      (document.querySelector("#" + c.kind + "-state").textContent =
        c.kind[0].toUpperCase() +
        c.kind.slice(1) +
        " · " +
        c.mode[0].toUpperCase() +
        c.mode.slice(1)),
  );
}
document.querySelectorAll("[data-select]").forEach(
  (b) =>
    (b.onclick = () => {
      selected = b.dataset.select;
      document.querySelectorAll("[data-select]").forEach((v) => {
        v.classList.toggle("active", v === b);
        v.setAttribute("aria-pressed", String(v === b));
      });
    }),
);
document
  .querySelectorAll("[data-action]")
  .forEach((b) => (b.onclick = () => action(b.dataset.action)));
function preset(which) {
  document.querySelector(".names").innerHTML =
    which === "front"
      ? "<span>CONNOR <small>01</small></span><span>VICTORIA <small>02</small></span>"
      : "<span>VICTORIA <small>02</small></span><span>CONNOR <small>01</small></span>";
  characters.forEach((c, i) => {
    c.baseZ = which === "side" ? (i ? 0.75 : -0.75) : 0;
    c.root.position.z = c.baseZ;
  });
  const target = V(0, 1.65, 0);
  controls.target.copy(target);
  camera.position.copy(
    { front: V(0, 2.7, 9.3), side: V(9.3, 2.6, 0.05), back: V(0, 2.7, -9.3) }[
      which
    ],
  );
  controls.update();
  document
    .querySelectorAll("[data-camera]")
    .forEach((b) => b.classList.toggle("active", b.dataset.camera === which));
}
function V(x, y, z) {
  return new T.Vector3(x, y, z);
}
document
  .querySelectorAll("[data-camera]")
  .forEach((b) => (b.onclick = () => preset(b.dataset.camera)));
document.querySelector("#zoom-in").onclick = () => {
  camera.position
    .sub(controls.target)
    .multiplyScalar(0.85)
    .add(controls.target);
  controls.update();
};
document.querySelector("#zoom-out").onclick = () => {
  camera.position
    .sub(controls.target)
    .multiplyScalar(1.15)
    .add(controls.target);
  controls.update();
};
document.querySelector("#half-turn").onclick = () => {
  chosen().forEach((c) => {
    setAction(c, "turn", now);
    c.turnTo = c.turnFrom + Math.PI;
  });
  updateLabels();
};
document.querySelector("#reset").onclick = () => {
  selected = "both";
  characters.forEach((c) => {
    c.root.rotation.y = 0;
    setAction(c, "idle", now);
  });
  doorway.visible = false;
  preset("front");
  document.querySelector('[data-select="both"]').click();
  action("idle");
};
document.querySelector("#wireframe").onchange = (e) =>
  scene.traverse((o) => {
    if (o.isMesh && o !== floor && o.material)
      o.material.wireframe = e.target.checked;
  });
const resize = () => {
  const w = stage.clientWidth,
    h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe(stage);
resize();
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let last = 0;
function render(ms) {
  requestAnimationFrame(render);
  const dt = Math.min((ms - last) / 1000, 0.05);
  last = ms;
  if (!paused) now += dt;
  if (!paused)
    characters.forEach((c, i) => {
      if (!reduce || c.mode !== "idle")
        animateCharacter(c, now, characters[1 - i]);
    });
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(render);
notice.textContent = "";
// Sample the exact same skeleton poses into portable glTF animation tracks.
function clipsFor(c, other) {
  c.baseZ = 0;
  const clips = [];
  for (const mode of ["idle", "walk", "wave", "turn", "look", "enter"]) {
    c.root.rotation.y = 0;
    setAction(c, mode, 0);
    const duration = {
        idle: Math.PI,
        walk: Math.PI / 3,
        wave: 4,
        turn: 3,
        look: 3,
        enter: 4,
      }[mode],
      times = [],
      values = c.bones.map(() => []),
      hip = [],
      rootPos = [],
      rootQuat = [];
    for (let f = 0; f <= Math.ceil(duration * 30); f++) {
      const t = Math.min(duration, f / 30);
      times.push(t);
      animateCharacter(c, t, other);
      c.bones.forEach((b, i) => values[i].push(...b.quaternion.toArray()));
      hip.push(...c.hips.position.toArray());
      rootPos.push(...c.root.position.toArray());
      rootQuat.push(...c.root.quaternion.toArray());
    }
    const tracks = c.bones.map(
      (b, i) =>
        new T.QuaternionKeyframeTrack(b.name + ".quaternion", times, values[i]),
    );
    tracks.push(
      new T.VectorKeyframeTrack(c.hips.name + ".position", times, hip),
      new T.VectorKeyframeTrack(c.root.name + ".position", times, rootPos),
      new T.QuaternionKeyframeTrack(
        c.root.name + ".quaternion",
        times,
        rootQuat,
      ),
    );
    clips.push(new T.AnimationClip(c.kind + "_" + mode, duration, tracks));
  }
  c.root.rotation.y = 0;
  setAction(c, "idle", now);
  animateCharacter(c, now, other);
  return clips;
}
async function exportGLB() {
  const button = document.querySelector("#export");
  button.disabled = true;
  notice.textContent = "Packaging meshes, skeletons and animation clips…";
  try {
    const clips = characters.flatMap((c, i) => clipsFor(c, characters[1 - i]));
    const exporter = new GLTFExporter();
    const result = await exporter.parseAsync(
      characters.map((c) => c.root),
      { binary: true, animations: clips, onlyVisible: false },
    );
    const url = URL.createObjectURL(
      new Blob([result], { type: "model/gltf-binary" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "connor-and-victoria-study.glb";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    notice.textContent = "GLB exported with 12 skeletal animation clips.";
  } catch (error) {
    notice.textContent = "Export failed: " + error.message;
    console.error(error);
  } finally {
    characters.forEach((c) => scene.add(c.root));
    button.disabled = false;
    updateLabels();
  }
}
document.querySelector("#export").onclick = exportGLB;
// Small public API for future town integration and deterministic visual tests.
window.characterStudio = {
  characters,
  scene,
  camera,
  renderer,
  controls,
  action,
  preset,
  exportGLB,
  select(name) {
    selected = name;
  },
  pose(mode, time = 1) {
    characters.forEach((c, i) => {
      setAction(c, mode, 0);
      animateCharacter(c, time, characters[1 - i]);
    });
    renderer.render(scene, camera);
  },
  pause(value = true) {
    paused = value;
  },
};
