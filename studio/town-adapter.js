// Optional, inactive integration. The production page does not import this file.
// The host must supply an import map resolving `three` before importing it.
import * as T from "three";
import { createCharacter, setAction, animateCharacter } from "./models.js";
export function attachTownCharacters(
  world,
  { x = 880, groundY = 875, pixelsPerMetre = 34 } = {},
) {
  if (!world) throw new Error("A scene-world element is required");
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "1672px",
    height: "941px",
    pointerEvents: "none",
    zIndex: "2",
  });
  const renderer = new T.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(1672, 941, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new T.Scene(),
    camera = new T.OrthographicCamera(-836, 836, 470.5, -470.5, 0.1, 2000);
  camera.position.z = 1000;
  scene.add(new T.HemisphereLight(0xfff0dc, 0x8b8275, 2));
  const light = new T.DirectionalLight(0xffe8cf, 3);
  light.position.set(-300, 600, 800);
  scene.add(light);
  const anchor = new T.Group();
  anchor.position.set(x - 836, 470.5 - groundY, 0);
  anchor.scale.setScalar(pixelsPerMetre);
  scene.add(anchor);
  const characters = [createCharacter("connor"), createCharacter("victoria")];
  characters.forEach((c, i) => {
    c.baseX = i ? 0.58 : -0.58;
    c.root.position.x = c.baseX;
    anchor.add(c.root);
  });
  // The depth plane hides geometry behind the illustrated doorway's surface.
  // Alignment is explicit because an illustration has no inherent depth map.
  const plane = new T.Plane(new T.Vector3(0, 0, 1), pixelsPerMetre * 1.7);
  world.append(canvas);
  let frame,
    last = performance.now(),
    time = 0,
    disposed = false;
  function loop(ms) {
    if (disposed) return;
    time += Math.min((ms - last) / 1000, 0.05);
    last = ms;
    characters.forEach((c, i) => animateCharacter(c, time, characters[1 - i]));
    renderer.clippingPlanes = characters.some((c) => c.mode === "enter")
      ? [plane]
      : [];
    renderer.render(scene, camera);
    frame = requestAnimationFrame(loop);
  }
  frame = requestAnimationFrame(loop);
  return {
    characters,
    canvas,
    play(name, mode) {
      characters
        .filter((c) => name === "both" || name === c.kind)
        .forEach((c) => setAction(c, mode, time));
    },
    setAnchor(nx, ny) {
      anchor.position.set(nx - 836, 470.5 - ny, 0);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      canvas.remove();
      const geometries = new Set(),
        materials = new Set(),
        textures = new Set();
      scene.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        if (o.material) materials.add(o.material);
      });
      materials.forEach((m) => {
        if (m.map) textures.add(m.map);
        if (m.bumpMap) textures.add(m.bumpMap);
        m.dispose();
      });
      textures.forEach((t) => t.dispose());
      geometries.forEach((g) => g.dispose());
      renderer.dispose();
    },
  };
}
