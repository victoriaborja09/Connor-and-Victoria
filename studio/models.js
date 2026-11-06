import * as T from "three";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
const V = (x, y, z) => new T.Vector3(x, y, z);
// Blender authors surfaces; the existing rig and action functions remain intact.
// Top-level loading retains the synchronous createCharacter API after module readiness.
const source = await new GLTFLoader().loadAsync(
  new URL("./assets/character-surfaces.glb", import.meta.url).href,
);
source.scene.updateMatrixWorld(true);
const surfaces = { connor: [], victoria: [] };
source.scene.traverse((o) => {
  if (!o.isMesh) return;
  let meta = o;
  while (meta && !meta.userData.character) meta = meta.parent;
  if (!meta) return;
  const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
  surfaces[meta.userData.character].push({
    geometry: g,
    material: o.material,
    role: meta.userData.role,
    name: o.name,
  });
});
export function createCharacter(kind) {
  const female = kind === "victoria",
    root = new T.Group();
  root.name = kind;
  root.userData.character = kind;
  const bones = [],
    add = (name, parent, pos) => {
      const b = new T.Bone();
      b.name = kind + "_" + name;
      b.position.set(...pos);
      (parent || root).add(b);
      bones.push(b);
      return b;
    };
  const hips = add("hips", null, [0, 1.55, 0]);
  const spine = add("spine", hips, [0, 0.38, 0]);
  const chest = add("chest", spine, [0, 0.38, 0]);
  const neck = add("neck", chest, [0, 0.21, 0]);
  const head = add("head", neck, [0, 0.37, 0]);
  const arms = [],
    legs = [];
  for (const s of [-1, 1]) {
    const shoulder = add(s < 0 ? "right_upper_arm" : "left_upper_arm", chest, [
      s * 0.405,
      0.025,
      0,
    ]);
    const elbow = add(s < 0 ? "right_forearm" : "left_forearm", shoulder, [
      s * 0.12,
      -0.38,
      0,
    ]);
    const wrist = add(s < 0 ? "right_hand" : "left_hand", elbow, [
      s * 0.055,
      -0.34,
      0.025,
    ]);
    arms.push({ shoulder, elbow, wrist, s });
    const thigh = add(s < 0 ? "right_thigh" : "left_thigh", hips, [
      s * 0.225,
      -0.02,
      0,
    ]);
    const knee = add(s < 0 ? "right_shin" : "left_shin", thigh, [0, -0.68, 0]);
    const ankle = add(
      s < 0 ? "right_foot" : "left_foot",
      knee,
      [0, -0.65, 0.01],
    );
    legs.push({ thigh, knee, ankle, s });
  }
  root.updateMatrixWorld(true);
  const skeleton = new T.Skeleton(bones);
  const index = (b) => bones.indexOf(b);
  const blend = (a, b, t) => {
    t = T.MathUtils.clamp(t, 0, 1);
    return [
      [index(a), index(b), 0, 0],
      [1 - t, t, 0, 0],
    ];
  };
  const armWeight = (x, y) => {
    const a = arms[x > 0 ? 1 : 0];
    if (y < 1.78) return blend(a.elbow, a.wrist, (1.78 - y) / 0.18);
    if (y < 2.09) return blend(a.shoulder, a.elbow, (2.09 - y) / 0.22);
    return blend(chest, a.shoulder, (Math.abs(x) - 0.29) / 0.16);
  };
  const weight = (role, x, y, z) => {
    if (role === "pants") {
      const l = legs[x > 0 ? 1 : 0];
      if (y > 1.18) {
        const amount = T.MathUtils.clamp((1.54 - y) / 0.32, 0, 1);
        const side = T.MathUtils.smoothstep(x, -0.16, 0.16);
        return [
          [index(hips), index(legs[0].thigh), index(legs[1].thigh), 0],
          [1 - amount, amount * (1 - side), amount * side, 0],
        ];
      }
      return blend(l.thigh, l.knee, (1.02 - y) / 0.32);
    }
    if (role === "armL" || role === "armR") return armWeight(x, y);
    const torso =
      y < 1.93
        ? blend(hips, spine, (y - 1.55) / 0.38)
        : blend(spine, chest, (y - 1.93) / 0.38);
    // Continuous four-weight blending across the remeshed armpit. A binary
    // torso/arm boundary creates discontinuous displacement when waving.
    const drop = T.MathUtils.clamp(2.3 - y, 0, 0.6);
    const amount = T.MathUtils.smoothstep(
      Math.abs(x),
      0.28 + drop * 0.25,
      0.44 + drop * 0.08,
    );
    const arm = armWeight(x, y);
    return [
      [torso[0][0], torso[0][1], arm[0][0], arm[0][1]],
      [
        torso[1][0] * (1 - amount),
        torso[1][1] * (1 - amount),
        arm[1][0] * amount,
        arm[1][1] * amount,
      ],
    ];
  };
  const rigid = {
    head,
    neck,
    hips,
    chest,
    footL: legs[1].ankle,
    footR: legs[0].ankle,
  };
  for (const surface of surfaces[kind]) {
    const geometry = surface.geometry.clone(),
      material = surface.material.clone();
    const attach = rigid[surface.role];
    let o;
    if (attach) {
      geometry.applyMatrix4(attach.matrixWorld.clone().invert());
      o = new T.Mesh(geometry, material);
      attach.add(o);
    } else {
      const pos = geometry.attributes.position,
        si = [],
        sw = [];
      for (let i = 0; i < pos.count; i++) {
        const [indices, weights] = weight(
          surface.role,
          pos.getX(i),
          pos.getY(i),
          pos.getZ(i),
        );
        si.push(...indices);
        sw.push(...weights);
      }
      geometry.setAttribute("skinIndex", new T.Uint16BufferAttribute(si, 4));
      geometry.setAttribute("skinWeight", new T.Float32BufferAttribute(sw, 4));
      o = new T.SkinnedMesh(geometry, material);
      root.add(o);
      o.bind(skeleton);
    }
    o.name = kind + "_" + surface.role + "_" + surface.name;
    o.castShadow = !/acetate|catchlight|stubble|almond eye/.test(material.name);
    o.receiveShadow = !/sculpted skin|almond eye/.test(material.name);
  }
  if (female) root.scale.setScalar(0.91);
  return {
    root,
    kind,
    bones,
    skeleton,
    hips,
    spine,
    chest,
    neck,
    head,
    arms,
    legs,
    mode: "idle",
    phase: 0,
    turnFrom: 0,
    turnTo: 0,
    turnStart: 0,
    baseX: 0,
    entrance: null,
  };
}
export function setAction(c, mode, time) {
  c.mode = mode;
  c.phase = time;
  c.entrance = null;
  c.root.visible = true;
  c.root.position.x = c.baseX;
  c.root.position.z = c.baseZ || 0;
  if (mode === "turn") {
    c.turnFrom = c.root.rotation.y;
    c.turnTo = c.turnFrom + Math.PI * 2;
    c.turnStart = time;
  }
  if (mode === "enter") {
    c.entrance = {
      start: time,
      from: c.root.position.clone(),
      to: V(c.baseX, 0, -4.7),
    };
  }
}
export function animateCharacter(c, time, other) {
  const t = time - c.phase,
    walk = c.mode === "walk" || c.mode === "enter",
    step = walk ? Math.sin(t * 6) : 0;
  for (const b of c.bones) b.rotation.set(0, 0, 0);
  c.hips.position.y =
    1.55 + Math.sin(time * 2) * 0.006 + (walk ? Math.abs(step) * 0.035 : 0);
  c.spine.rotation.z = Math.sin(time * 0.7) * 0.012;
  c.chest.scale.set(
    1 + Math.sin(time * 2) * 0.006,
    1,
    1 + Math.sin(time * 2) * 0.012,
  );
  c.head.rotation.y = Math.sin(time * 0.6) * 0.035;
  c.head.rotation.z = Math.sin(time * 0.8) * 0.012;
  c.legs.forEach((l, i) => {
    const phase = t * 6 + i * Math.PI;
    l.thigh.rotation.x = walk ? Math.sin(phase) * 0.38 : 0;
    l.knee.rotation.x = walk ? Math.max(0, -Math.sin(phase)) * 0.6 : 0;
    l.ankle.rotation.x = walk ? -Math.sin(phase) * 0.12 : 0;
  });
  c.arms.forEach((a, i) => {
    a.shoulder.rotation.x = walk
      ? -step * (i ? 1 : -1) * 0.27
      : Math.sin(time * 1.4 + i) * 0.016;
    a.elbow.rotation.x = -0.1;
  });
  if (c.mode === "wave") {
    const a = c.arms[0],
      raise = T.MathUtils.smoothstep(t, 0, 0.7);
    a.shoulder.rotation.z = -1.95 * raise;
    a.shoulder.rotation.x = -0.12 * raise;
    a.elbow.rotation.z = -0.48 * raise;
    a.wrist.rotation.z = Math.sin(t * 9) * 0.24 * raise;
  }
  if (c.mode === "look" && other) {
    const dx = other.root.position.x - c.root.position.x;
    c.head.rotation.y = Math.sign(dx) * 0.6;
    c.neck.rotation.y = Math.sign(dx) * 0.16;
    c.head.rotation.z = -Math.sign(dx) * 0.07;
  }
  if (c.mode === "turn") {
    const u = T.MathUtils.smoothstep(t, 0, 3);
    c.root.rotation.y = c.turnFrom + (c.turnTo - c.turnFrom) * u;
  }
  if (c.mode === "enter" && c.entrance) {
    const u = T.MathUtils.smoothstep(t, 0, 1);
    c.root.rotation.y = Math.PI * u;
    const p = T.MathUtils.clamp((t - 0.8) / 3, 0, 1);
    c.root.position.lerpVectors(c.entrance.from, c.entrance.to, p);
    if (p === 1) c.root.visible = false;
  }
}
