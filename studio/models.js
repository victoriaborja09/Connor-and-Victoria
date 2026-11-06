import * as T from "three";
import { mergeGeometries } from "./vendor/BufferGeometryUtils.js";

// All dimensions are in metres, Y up, face toward +Z. Lofted cross-sections
// provide continuous silhouettes; cubic sweeps form hair, seams and accessories.
const skin = new T.MeshStandardMaterial({ color: 0xe7ae78, roughness: 0.78 });
const white = new T.MeshStandardMaterial({ color: 0xf4eeea, roughness: 0.92 });
const navy = new T.MeshStandardMaterial({ color: 0x20283f, roughness: 0.94 });
const gold = new T.MeshStandardMaterial({
  color: 0xd9a444,
  metalness: 0.72,
  roughness: 0.3,
});
const dark = new T.MeshStandardMaterial({ color: 0x21160f, roughness: 0.55 });
const eyeWhite = new T.MeshStandardMaterial({
  color: 0xfff3dd,
  roughness: 0.42,
});
const iris = new T.MeshStandardMaterial({ color: 0x643819, roughness: 0.45 });
const pupil = new T.MeshStandardMaterial({ color: 0x130e0a, roughness: 0.25 });
const pink = new T.MeshStandardMaterial({ color: 0xb77556, roughness: 0.85 });
const materialCache = new Map();
const mat = (c, r = 0.8) => {
  const k = c + ":" + r;
  if (!materialCache.has(k))
    materialCache.set(
      k,
      new T.MeshStandardMaterial({ color: c, roughness: r }),
    );
  return materialCache.get(k);
};
const V = (x, y, z) => new T.Vector3(x, y, z);
function mesh(g, m, parent, name) {
  g.computeVertexNormals();
  const o = new T.Mesh(g, m);
  o.name = name || "";
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
function oval(parent, m, position, scale, name) {
  const g = new T.SphereGeometry(1, 32, 24);
  g.scale(...scale);
  const o = mesh(g, m, parent, name);
  o.position.set(...position);
  return o;
}
function sweep(parent, points, radius, material, name, segments = 32) {
  const curve = new T.CatmullRomCurve3(points.map((p) => V(...p)));
  return mesh(
    new T.TubeGeometry(curve, segments, radius, 8, false),
    material,
    parent,
    name,
  );
}
function loft(
  parent,
  rings,
  material,
  name,
  { segments = 40, folds = 0, skinFn = null } = {},
) {
  // Interpolate cross sections before triangulating, avoiding stacked-ring silhouettes.
  const source = rings;
  const curve = new T.CatmullRomCurve3(
    source.map((r) => V(r[1], r[0], r[2])),
    false,
    "catmullrom",
    0.25,
  );
  const centers = new T.CatmullRomCurve3(
    source.map((r) => V(r[3] || 0, r[0], r[4] || 0)),
    false,
    "catmullrom",
    0.25,
  );
  rings = Array.from({ length: (source.length - 1) * 3 + 1 }, (_, i) => {
    const t = i / ((source.length - 1) * 3),
      p = curve.getPoint(t),
      c = centers.getPoint(t);
    return [p.y, Math.max(0.001, p.x), Math.max(0.001, p.z), c.x, c.z];
  });
  const pos = [],
    uv = [],
    idx = [];
  rings.forEach(([y, rx, rz, cx = 0, cz = 0], j) => {
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const ripple =
        1 +
        folds *
          (Math.sin(a * 7 + y * 4) * 0.55 + Math.sin(a * 11 - y * 5) * 0.25);
      pos.push(
        cx + Math.cos(a) * rx * ripple,
        y,
        cz + Math.sin(a) * rz * ripple,
      );
      uv.push(i / segments, j / (rings.length - 1));
      if (j < rings.length - 1 && i < segments) {
        const k = j * (segments + 1) + i;
        idx.push(
          k,
          k + segments + 1,
          k + 1,
          k + 1,
          k + segments + 1,
          k + segments + 2,
        );
      }
    }
  });
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  if (!skinFn) return mesh(g, material, parent, name);
  g.computeVertexNormals();
  const si = [],
    sw = [];
  for (let i = 0; i < pos.length; i += 3) {
    const [indices, weights] = skinFn(pos[i], pos[i + 1], pos[i + 2]);
    si.push(...indices);
    sw.push(...weights);
  }
  g.setAttribute("skinIndex", new T.Uint16BufferAttribute(si, 4));
  g.setAttribute("skinWeight", new T.Float32BufferAttribute(sw, 4));
  const o = new T.SkinnedMesh(g, material);
  o.name = name;
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
function fabric(color) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  let seed = 773;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const data = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const k = (y * 256 + x) * 4;
      const n = 150 + rand() * 65 + Math.sin(((x + y) * Math.PI) / 2) * 16;
      data.data[k] = data.data[k + 1] = data.data[k + 2] = n;
      data.data[k + 3] = 255;
    }
  ctx.putImageData(data, 0, 0);
  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(3, 4);
  tex.colorSpace = T.SRGBColorSpace;
  return new T.MeshStandardMaterial({
    color,
    map: tex,
    bumpMap: tex,
    bumpScale: 0.009,
    roughness: 1,
  });
}
function ringPath(cx, cy, cz, rx, ry) {
  return Array.from({ length: 49 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return [
      cx + Math.cos(a) * rx,
      cy + Math.sin(a) * ry,
      cz + 0.018 * Math.cos(a),
    ];
  });
}
function glasses(head, female) {
  const frame = mat(female ? 0x75401f : 0x161513, 0.37);
  for (const s of [-1, 1]) {
    const pts = [];
    const cx = s * 0.185,
      cy = 0.025,
      rz = 0.392;
    // Rounded rectangular rims; temples extend back past the ears.
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const c = Math.cos(a),
        n = Math.sin(a);
      pts.push([
        cx + 0.154 * Math.sign(c) * Math.pow(Math.abs(c), female ? 0.85 : 0.48),
        cy + 0.112 * Math.sign(n) * Math.pow(Math.abs(n), female ? 0.9 : 0.48),
        rz - 0.045 * Math.abs(cx + 0.154 * c),
      ]);
    }
    sweep(head, pts, female ? 0.014 : 0.022, frame, "glasses rim");
    sweep(
      head,
      [
        [s * 0.337, 0.04, 0.375],
        [s * 0.39, 0.05, 0.24],
        [s * 0.398, 0.04, -0.075],
        [s * 0.378, -0.025, -0.12],
      ],
      0.014,
      frame,
      "glasses temple",
    );
  }
  sweep(
    head,
    [
      [-0.033, 0.05, 0.393],
      [0, 0.065, 0.41],
      [0.033, 0.05, 0.393],
    ],
    0.015,
    frame,
    "glasses bridge",
  );
}
function face(head, female) {
  const skinFace = skin.clone();
  if (female) skinFace.color.set(0xe9b282);
  // Sculpted latitude rings: tapered chin, forward cheeks, brow and cranium.
  loft(
    head,
    [
      [-0.405, 0.03, 0.07, 0, 0.01],
      [-0.383, 0.14, 0.15, 0, 0.035],
      [-0.335, 0.235, 0.23, 0, 0.04],
      [-0.25, 0.31, 0.285, 0, 0.015],
      [-0.13, 0.365, 0.31, 0, 0],
      [0, 0.385, 0.327, 0, -0.005],
      [0.13, 0.377, 0.322, 0, -0.02],
      [0.25, 0.33, 0.29, 0, -0.035],
      [0.34, 0.25, 0.23, 0, -0.035],
      [0.39, 0.12, 0.14, 0, -0.03],
      [0.405, 0.005, 0.005, 0, -0.03],
    ],
    skinFace,
    "sculpted face",
  );
  for (const s of [-1, 1]) {
    oval(
      head,
      skinFace,
      [s * 0.373, -0.065, -0.01],
      [0.072, 0.12, 0.067],
      "ear",
    );
    oval(
      head,
      pink,
      [s * 0.405, -0.065, 0.023],
      [0.022, 0.064, 0.025],
      "ear concha",
    );
    oval(
      head,
      eyeWhite,
      [s * 0.171, 0.018, 0.291],
      [0.114, female ? 0.079 : 0.068, 0.042],
      "eye",
    );
    oval(
      head,
      iris,
      [s * 0.171, 0.015, 0.336],
      [0.054, 0.058, 0.014],
      "brown iris",
    );
    oval(
      head,
      pupil,
      [s * 0.171, 0.015, 0.348],
      [0.026, 0.035, 0.008],
      "pupil",
    );
    oval(
      head,
      eyeWhite,
      [s * 0.151, 0.039, 0.358],
      [0.013, 0.016, 0.006],
      "catchlight",
    );
    sweep(
      head,
      [
        [s * 0.065, 0.054, 0.326],
        [s * 0.11, 0.096, 0.338],
        [s * 0.2, 0.103, 0.333],
        [s * 0.275, 0.052, 0.307],
      ],
      0.012,
      dark,
      "upper eyelid",
    );
    sweep(
      head,
      [
        [s * 0.073, 0.17, 0.303],
        [s * 0.16, 0.194, 0.314],
        [s * 0.259, 0.17, 0.286],
      ],
      female ? 0.019 : 0.027,
      mat(0x49301f),
      "eyebrow",
    );
    if (female)
      for (let i = 0; i < 4; i++)
        sweep(
          head,
          [
            [s * (0.22 + i * 0.014), 0.085 - i * 0.01, 0.329],
            [s * (0.24 + i * 0.015), 0.115 - i * 0.008, 0.334],
          ],
          0.004,
          dark,
          "eyelash",
          8,
        );
  }
  // Custom wedge-like nose has an actual bridge, tip and underside.
  loft(
    head,
    [
      [-0.136, 0.026, 0.025, 0, 0.326],
      [-0.12, 0.064, 0.041, 0, 0.357],
      [-0.085, 0.057, 0.062, 0, 0.365],
      [-0.035, 0.038, 0.061, 0, 0.336],
      [0.07, 0.026, 0.025, 0, 0.309],
      [0.1, 0.005, 0.005, 0, 0.3],
    ],
    skinFace,
    "nose bridge and tip",
    { segments: 28 },
  );
  sweep(
    head,
    [
      [-0.115, -0.218, 0.277],
      [-0.062, -0.24, 0.312],
      [0, -0.243, 0.322],
      [0.062, -0.23, 0.311],
      [0.12, -0.202, 0.279],
    ],
    0.009,
    mat(0x895039),
    "smile line",
  );
  sweep(
    head,
    [
      [-0.083, -0.25, 0.294],
      [0, -0.269, 0.316],
      [0.081, -0.24, 0.297],
    ],
    0.011,
    pink,
    "lower lip",
  );
  if (!female) {
    let seed = 43;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const dots = [];
    for (let i = 0; i < 560; i++) {
      const y = -0.22 - random() * 0.14;
      const f = (-y - 0.22) / 0.14,
        rx = 0.33 - f * 0.14,
        rz = 0.28 - f * 0.09;
      const x = (random() - 0.5) * rx * 1.85;
      if (y > -0.28 && Math.abs(x) < 0.13) continue;
      const z = 0.03 + rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
      dots.push(x, y, z + 0.002);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(dots, 3));
    const beard = new T.Points(
      g,
      new T.PointsMaterial({
        color: 0x705039,
        size: 0.006,
        transparent: true,
        opacity: 0.45,
      }),
    );
    beard.name = "subtle stubble";
    head.add(beard);
  }
  glasses(head, female);
}
function hair(head, female) {
  const shades = [0x45291c, 0x513020, 0x603b28, 0x6b432c, 0x563222];
  const materials = shades.map((c) => mat(c, 0.78));
  // A fitted scalp shell stays underneath individually swept locks.
  const capPositions = [],
    capIndices = [],
    capUV = [];
  for (let j = 0; j <= 20; j++)
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2,
        t = ((j / 20) * Math.PI) / 2,
        front = (Math.sin(a) + 1) / 2;
      const base = -0.2 + 0.44 * Math.pow(front, 4),
        r = Math.cos(t);
      capPositions.push(
        0.425 * Math.cos(a) * r,
        base + (0.465 - base) * Math.sin(t),
        0.38 * Math.sin(a) * r - 0.035,
      );
      capUV.push(i / 48, j / 20);
      if (j < 20 && i < 48) {
        const n = j * 49 + i;
        capIndices.push(n, n + 49, n + 1, n + 1, n + 49, n + 50);
      }
    }
  const cap = new T.BufferGeometry();
  cap.setAttribute("position", new T.Float32BufferAttribute(capPositions, 3));
  cap.setAttribute("uv", new T.Float32BufferAttribute(capUV, 2));
  cap.setIndex(capIndices);
  mesh(cap, materials[0], head, "shaped hairline scalp");
  if (female) {
    // Dense rear curtain; open in front to expose cheeks, glasses and neckline.
    for (let i = 0; i < 42; i++) {
      const a = Math.PI * 0.04 + (i / 41) * Math.PI * 0.92;
      const x = Math.cos(a) * 0.4,
        z = -Math.sin(a) * 0.38;
      const bottom = -1.1 + 0.12 * Math.sin(i * 1.73);
      const pts = [
        [x * 0.12, 0.452, -0.025 + z * 0.13],
        [x * 0.9, 0.34, z * 1.04],
        [x * 1.16, 0.0, z * 1.16],
        [x * 1.23 + Math.sin(i * 0.4) * 0.025, -0.33, z * 1.23],
        [x * 1.05, -0.57, z * 1.06],
        [x * 1.22, -0.83, z * 1.16],
        [x * 0.95, bottom, z * 0.84],
      ];
      lock(head, pts, 0.075, materials[i % 5], i);
    }
    // Centre-parted front waves sweep around the glasses, down over shoulders.
    for (const s of [-1, 1])
      for (let i = 0; i < 11; i++) {
        const f = i / 10;
        const pts = [
          [s * (0.012 + f * 0.22), 0.465 - f * 0.1, 0.035 + f * 0.16],
          [s * (0.17 + f * 0.13), 0.38 - f * 0.11, 0.31 + f * 0.02],
          [s * (0.34 + f * 0.028), 0.12 - f * 0.1, 0.29 + f * 0.025],
          [s * (0.395 + f * 0.018), -0.18 - f * 0.12, 0.07 + f * 0.12],
          [s * (0.34 + f * 0.04), -0.48 - f * 0.14, 0.13 + f * 0.08],
          [s * (0.415 + f * 0.01), -0.76 - f * 0.08, 0.17],
          [s * 0.31, -1.02 - f * 0.09, 0.12],
        ];
        lock(head, pts, 0.045, materials[(i + 2) % 5], i);
      }
    sweep(
      head,
      [
        [0, 0.435, 0.02],
        [0, 0.414, 0.16],
        [0, 0.39, 0.235],
      ],
      0.006,
      mat(0xb18360),
      "centre part",
    );
  } else {
    // Overlapping tapered locks arranged over scalp, plus irregular swept fringe.
    for (let row = 0; row < 7; row++)
      for (let i = 0; i < 17; i++) {
        const a = (i / 17) * Math.PI * 2 + row * 0.29;
        const elev = -0.62 + row * 0.305;
        const elevation = Math.sin(a) > 0.15 ? Math.max(0.45, elev) : elev;
        const x = Math.cos(a) * 0.405 * Math.cos(elevation),
          z = Math.sin(a) * 0.365 * Math.cos(elevation),
          y = 0.02 + Math.sin(elevation) * 0.43;
        const pts = [
          [x * 0.92, y - 0.02, z * 0.92],
          [x * 1.12, y + 0.06, z * 1.12],
          [x * 1.18 + Math.cos(a + 1) * 0.065, y + 0.13, z * 1.12],
          [x * 1.12 + Math.cos(a + 1) * 0.09, y + 0.15, z * 1.05],
        ];
        lock(head, pts, 0.066, materials[(i + row) % 5], i + row);
      }
    for (let i = 0; i < 10; i++) {
      const x = -0.34 + i * 0.075;
      lock(
        head,
        [
          [x, 0.31, 0.22],
          [x + 0.045, 0.33, 0.34],
          [x + 0.07, 0.2, 0.38],
          [x + 0.04, 0.12 + (i % 3) * 0.035, 0.345],
        ],
        0.075,
        materials[i % 5],
        i,
      );
    }
  }
}
function lock(parent, points, width, material, seed) {
  const curve = new T.CatmullRomCurve3(points.map((p) => V(...p)));
  const frames = curve.computeFrenetFrames(24, false);
  const p = [],
    idx = [];
  for (let j = 0; j <= 24; j++) {
    const t = j / 24,
      c = curve.getPoint(t);
    const taper = Math.pow(Math.sin(Math.PI * (0.06 + t * 0.94)), 0.48);
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const v = c
        .clone()
        .addScaledVector(frames.normals[j], Math.cos(a) * width * taper)
        .addScaledVector(
          frames.binormals[j],
          Math.sin(a) * width * 0.55 * taper,
        );
      p.push(v.x, v.y, v.z);
      if (j < 24 && k < 10) {
        const n = j * 11 + k;
        idx.push(n, n + 1, n + 11, n + 1, n + 12, n + 11);
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  g.setIndex(idx);
  g.setAttribute(
    "uv",
    new T.Float32BufferAttribute(new Array((p.length / 3) * 2).fill(0), 2),
  );
  mesh(g, material, parent, "tapered hair lock");
  // Fine curved highlights follow the lock surface, rather than painted blobs.
  for (let i = 0; i < 2; i++) {
    const pts = [];
    for (let j = 1; j < 23; j += 2) {
      const c = curve.getPoint(j / 24);
      const w =
        width * Math.pow(Math.sin(Math.PI * (0.06 + (j / 24) * 0.94)), 0.48);
      c.addScaledVector(frames.binormals[j], w * 0.53).addScaledVector(
        frames.normals[j],
        (i - 0.5) * w * 0.6,
      );
      pts.push(c.toArray());
    }
    sweep(
      parent,
      pts,
      0.0018,
      mat(seed % 2 ? 0x79513a : 0x65412c),
      "hair filament",
      20,
    );
  }
}
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
  const skinned = [];
  const index = (b) => bones.indexOf(b);
  const blend = (a, b, t) => [
    [index(a), index(b), 0, 0],
    [1 - T.MathUtils.clamp(t, 0, 1), T.MathUtils.clamp(t, 0, 1), 0, 0],
  ];
  const torsoWeight = (x, y) =>
    y < 1.93
      ? blend(hips, spine, (y - 1.55) / 0.38)
      : blend(spine, chest, (y - 1.93) / 0.38);
  const shirt = female ? navy : white;
  skinned.push(
    loft(
      root,
      [
        [female ? 1.7 : 1.59, 0.31, 0.18],
        [female ? 1.73 : 1.63, 0.337, 0.193],
        [female ? 1.79 : 1.72, 0.33, 0.198],
        [1.85, 0.305, 0.192],
        [2.0, 0.335, 0.207],
        [2.16, 0.38, 0.218],
        [2.29, 0.405, 0.2],
        [2.36, 0.385, 0.177],
        [2.41, 0.22, 0.13],
        [2.43, 0.135, 0.105],
      ],
      shirt,
      "tailored shirt",
      { folds: female ? 0.008 : 0.012, skinFn: torsoWeight },
    ),
  );
  loft(
    neck,
    [
      [-0.13, 0.145, 0.12],
      [0.015, 0.139, 0.115],
      [0.14, 0.14, 0.12],
      [0.23, 0.16, 0.128],
    ],
    skin,
    "continuous neck",
  );
  face(head, female);
  hair(head, female);
  if (female)
    skinned.push(
      loft(
        root,
        [
          [1.56, 0.303, 0.169],
          [1.67, 0.297, 0.17],
          [1.78, 0.295, 0.175],
        ],
        skin,
        "midriff",
        { skinFn: torsoWeight },
      ),
    );
  const denim = fabric(female ? 0xb7c9db : 0x81583d);
  const seam = mat(female ? 0x879db3 : 0xb68a5b);
  skinned.push(
    loft(
      root,
      [
        [1.3, 0.4, 0.215],
        [1.42, 0.39, 0.218],
        [1.56, 0.355, 0.2],
        [1.63, 0.338, 0.19],
      ],
      denim,
      "jeans seat and waistband",
      { folds: 0.02, skinFn: () => blend(hips, hips, 0) },
    ),
  );
  for (const leg of legs) {
    const { s, thigh, knee, ankle } = leg;
    const cx = s * 0.225;
    const weight = (x, y) => blend(thigh, knee, (1.02 - y) / 0.32);
    const rings = [];
    for (let j = 0; j <= 28; j++) {
      const y = 0.16 + (j / 28) * 1.3;
      let rx =
          0.205 +
          Math.sin((j / 28) * Math.PI) * 0.035 +
          Math.max(0, (y - 1.2) / 0.26) * 0.035,
        rz = 0.19 + Math.sin((j / 28) * Math.PI) * 0.025;
      const bunch =
        Math.exp(-(((y - 0.32) / 0.16) ** 2)) * Math.sin(y * 40) * 0.012;
      rings.push([
        y,
        rx + bunch,
        rz + bunch,
        cx + s * 0.006 * Math.sin(y * 9),
        0.018 * Math.sin(y * 8),
      ]);
    }
    skinned.push(
      loft(root, rings, denim, "relaxed jean leg", {
        folds: 0.012,
        skinFn: weight,
      }),
    );
    // Seams are skinned too so they stay attached through knee motion.
    const seamRings = rings.map(([y, rx, rz, x, z]) => [
      y,
      0.003,
      0.003,
      x + s * (rx - 0.008),
      z + 0.03,
    ]);
    skinned.push(
      loft(root, seamRings, seam, "outer stitched seam", {
        segments: 6,
        skinFn: weight,
      }),
    );
    const shoeMat = mat(female ? 0x35543e : 0x67432d, 0.65),
      sole = mat(female ? 0xe2ded0 : 0xc8a46f);
    loft(
      ankle,
      [
        [-0.2, 0.16, 0.29, 0, 0.085],
        [-0.17, 0.188, 0.32, 0, 0.085],
        [-0.105, 0.19, 0.32, 0, 0.085],
        [-0.035, 0.177, 0.3, 0, 0.08],
        [0.05, 0.14, 0.23, 0, 0.035],
        [0.105, 0.1, 0.135, 0, -0.01],
        [0.12, 0.04, 0.05, 0, -0.01],
      ],
      shoeMat,
      "shaped sneaker upper",
    );
    loft(
      ankle,
      [
        [-0.205, 0.174, 0.302, 0, 0.085],
        [-0.19, 0.191, 0.326, 0, 0.085],
        [-0.145, 0.192, 0.327, 0, 0.085],
        [-0.13, 0.19, 0.323, 0, 0.085],
      ],
      sole,
      "rubber outsole",
    );
    for (let i = 0; i < 3; i++)
      for (const side of [-1, 1])
        sweep(
          ankle,
          [
            [side * 0.15, 0.004 - i * 0.015, 0.08 - i * 0.06],
            [side * 0.185, -0.055, 0.12 - i * 0.06],
            [side * 0.188, -0.12, 0.15 - i * 0.06],
          ],
          0.016,
          white,
          "three sneaker stripes",
          12,
        );
    for (let i = 0; i < 4; i++)
      sweep(
        ankle,
        [
          [-0.064, 0.05 - i * 0.02, 0.14 + i * 0.035],
          [0, 0.063 - i * 0.018, 0.155 + i * 0.034],
          [0.064, 0.05 - i * 0.02, 0.14 + i * 0.035],
        ],
        0.008,
        white,
        "shoelace",
        10,
      );
  }
  for (const arm of arms) {
    const { s, shoulder, elbow, wrist } = arm;
    const end = female ? 1.6 : 2.05;
    const weight = (x, y) =>
      y > 2.25
        ? blend(chest, shoulder, (Math.abs(x) - 0.24) / 0.25)
        : blend(shoulder, elbow, (2.05 - y) / 0.22);
    const rings = [];
    for (let j = 0; j <= 20; j++) {
      const y = end + (j / 20) * (2.36 - end),
        t = (y - end) / (2.36 - end),
        cx = s * (0.58 - (y - end) * 0.35);
      rings.push([
        y,
        (female ? 0.095 : 0.136) + t * 0.03,
        0.105 + t * 0.028,
        cx,
        0,
      ]);
    }
    rings.push(
      [2.39, 0.105, 0.09, s * 0.31, 0],
      [2.415, 0.02, 0.025, s * 0.235, 0],
    );
    skinned.push(
      loft(root, rings, shirt, "fitted sleeve", {
        folds: 0.02,
        skinFn: weight,
      }),
    );
    if (!female)
      skinned.push(
        loft(
          root,
          [
            [1.6, 0.082, 0.078, s * 0.58, 0.025],
            [1.7, 0.09, 0.09, s * 0.56, 0.018],
            [1.86, 0.105, 0.1, s * 0.535, 0],
            [2.03, 0.119, 0.11, s * 0.5, 0],
            [2.13, 0.126, 0.115, s * 0.48, 0],
          ],
          skin,
          "continuous bare arm",
          { skinFn: weight },
        ),
      );
    // Palm with separate tapered fingers, attached at the wrist joint.
    loft(
      wrist,
      [
        [-0.18, 0.037, 0.034],
        [-0.14, 0.064, 0.042],
        [-0.055, 0.074, 0.047],
        [0.02, 0.065, 0.043],
        [0.055, 0.053, 0.038],
      ],
      skin,
      "palm",
    );
    for (let i = 0; i < 4; i++)
      loft(
        wrist,
        [
          [
            -0.26 + (i === 0 || i === 3 ? 0.024 : 0),
            0.008,
            0.009,
            (i - 1.5) * 0.029,
            0.015,
          ],
          [-0.23, 0.013, 0.014, (i - 1.5) * 0.029, 0.01],
          [-0.17, 0.016, 0.016, (i - 1.5) * 0.029, 0],
          [-0.12, 0.017, 0.018, (i - 1.5) * 0.029, 0],
        ],
        skin,
        "finger",
      );
    sweep(
      wrist,
      [
        [s * 0.055, -0.02, 0.01],
        [s * 0.085, -0.08, 0.04],
        [s * 0.068, -0.145, 0.055],
      ],
      0.023,
      skin,
      "thumb",
      16,
    );
  }
  // Pocket outlines, belt loops and fly ride the hips.
  for (const s of [-1, 1]) {
    sweep(
      hips,
      [
        [s * 0.08, 0.045, 0.19],
        [s * 0.14, -0.06, 0.21],
        [s * 0.31, -0.13, 0.18],
        [s * 0.36, -0.02, 0.13],
      ],
      0.004,
      seam,
      "front pocket stitching",
    );
    sweep(
      hips,
      [
        [s * 0.11, -0.09, -0.215],
        [s * 0.32, -0.09, -0.19],
        [s * 0.31, -0.32, -0.21],
        [s * 0.19, -0.36, -0.228],
        [s * 0.11, -0.29, -0.23],
        [s * 0.11, -0.09, -0.215],
      ],
      0.004,
      seam,
      "rear pocket stitching",
    );
    for (const x of [s * 0.12, s * 0.29])
      sweep(
        hips,
        [
          [x, 0.06, 0.174],
          [x, -0.015, 0.19],
        ],
        0.012,
        denim,
        "belt loop",
      );
  }
  sweep(
    hips,
    [
      [0.025, 0.055, 0.201],
      [0.025, -0.16, 0.223],
      [0, -0.22, 0.22],
    ],
    0.004,
    seam,
    "fly seam",
  );
  oval(
    hips,
    mat(0xa79773, 0.4),
    [0, 0.032, 0.204],
    [0.025, 0.025, 0.009],
    "jeans button",
  );
  if (female) {
    sweep(
      chest,
      [
        [-0.115, 0.1, 0.1],
        [-0.09, 0.015, 0.207],
        [0, -0.08, 0.233],
        [0.09, 0.015, 0.207],
        [0.115, 0.1, 0.1],
      ],
      0.005,
      gold,
      "gold necklace",
    );
    const pendant = new T.Mesh(new T.OctahedronGeometry(0.025), gold);
    pendant.position.set(0, -0.1, 0.24);
    chest.add(pendant);
  }
  root.updateMatrixWorld(true);
  for (const o of skinned) o.bind(skeleton);
  // Batch rigid meshes per material per bone: retain independent skeletal motion,
  // avoid hundreds of draw calls for individual hair strands and stitches.
  root.traverse((parent) => {
    const groups = new Map();
    for (const o of [...parent.children])
      if (o.isMesh && !o.isSkinnedMesh) {
        const key = o.material.uuid;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(o);
      }
    for (const items of groups.values())
      if (items.length > 1) {
        const geometries = items.map((o) => {
          o.updateMatrix();
          const g = o.geometry.clone().applyMatrix4(o.matrix);
          if (!g.attributes.uv)
            g.setAttribute(
              "uv",
              new T.Float32BufferAttribute(
                new Array(g.attributes.position.count * 2).fill(0),
                2,
              ),
            );
          return g;
        });
        const combined = mergeGeometries(geometries, false);
        if (combined) {
          items.forEach((o) => {
            parent.remove(o);
            o.geometry.dispose();
          });
          mesh(combined, items[0].material, parent, "batched " + items[0].name);
        }
        geometries.forEach((g) => g.dispose());
      }
  });
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
