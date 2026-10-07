import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/*
 * A little gym diorama: four mats running bouts in parallel, a line of queued
 * bouts (yellow chips) that fly to whichever mat frees up first, a scoreboard,
 * and bleachers. It is the queue model the calculator simulates, drawn live.
 */

export interface MatSceneOptions {
  reduced: boolean;
  startBout: number;
  onCall: (bout: number, mat: number) => void;
}

export interface MatSceneHandle {
  setScroll(p: number): void;
  dispose(): void;
}

const C = {
  ink: 0x161615,
  red: 0xef4130,
  blue: 0x2c62f0,
  yellow: 0xffd23c,
  green: 0x2fae5c,
  base: 0xe9e5db,
  base2: 0xd6d1c4,
  cream: 0xf6f4ee,
};

const MAT = 5.4;
const MAT_CENTERS = [
  new THREE.Vector3(-5.0, 0, -2.9),
  new THREE.Vector3(0.9, 0, -2.9),
  new THREE.Vector3(-5.0, 0, 3.0),
  new THREE.Vector3(0.9, 0, 3.0),
];
const LANE_X = 6.7;
const QUEUE_LEN = 9;
const slotPos = (slot: number) => new THREE.Vector3(LANE_X, 0.17, 4.9 - slot * 1.0);

function boutSeconds() {
  // lognormal around ~6.5s so the diorama feels busy but readable
  const u1 = Math.max(1e-6, Math.random());
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
  return Math.min(15, Math.max(3, Math.exp(Math.log(6.5) - 0.09 + 0.42 * z)));
}

const easeOutBack = (k: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

function matTexture(n: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#5a85f3';
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#2c5fe8';
  g.fillRect(22, 22, 468, 468);
  g.fillStyle = '#386af0';
  g.beginPath();
  g.arc(256, 256, 196, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#ffffff';
  g.lineWidth = 12;
  g.beginPath();
  g.arc(256, 256, 200, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 6;
  g.beginPath();
  g.arc(256, 256, 36, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#ef4130';
  g.fillRect(238, 240, 7, 32);
  g.fillStyle = '#2fae5c';
  g.fillRect(267, 240, 7, 32);
  g.fillStyle = '#ffffff';
  g.font = '700 70px "Google Sans", Arial, sans-serif';
  g.fillText(String(n), 46, 112);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function drawBoard(canvas: HTMLCanvasElement, bout: number) {
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#161615';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#9b978c';
  g.font = '500 34px "Google Sans", Arial, sans-serif';
  g.fillText('NOW CALLING', 34, 58);
  g.fillStyle = '#ffd23c';
  g.font = '700 150px "Google Sans", Arial, sans-serif';
  g.fillText(String(bout), 30, 210);
}

export function createMatScene(canvas: HTMLCanvasElement, opts: MatSceneOptions): MatSceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 300);
  const target = new THREE.Vector3(0.4, 0, 0.6);

  // light
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc8b8, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(9, 18, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -15;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0006;
  sun.shadow.radius = 5;
  scene.add(sun);

  const disposables: { dispose(): void }[] = [];
  const std = (color: number, roughness = 0.85) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    disposables.push(m);
    return m;
  };

  // platform
  const platformGeo = new RoundedBoxGeometry(21.5, 1, 16.6, 4, 0.5);
  disposables.push(platformGeo);
  const platform = new THREE.Mesh(platformGeo, std(C.base, 1));
  platform.position.set(0.7, -0.5, 0.2);
  platform.receiveShadow = true;
  scene.add(platform);

  // mats
  const matSide = std(0x2552cf, 0.9);
  const matGeo = new THREE.BoxGeometry(MAT, 0.22, MAT);
  disposables.push(matGeo);
  MAT_CENTERS.forEach((c, i) => {
    const tex = matTexture(i + 1);
    disposables.push(tex);
    const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
    disposables.push(top);
    const mesh = new THREE.Mesh(matGeo, [matSide, matSide, top, matSide, matSide, matSide]);
    mesh.position.set(c.x, 0.11, c.z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  // queue lane
  const laneGeo = new RoundedBoxGeometry(1.5, 0.08, QUEUE_LEN * 1.0 + 0.6, 2, 0.04);
  disposables.push(laneGeo);
  const lane = new THREE.Mesh(laneGeo, std(C.base2, 1));
  lane.position.set(LANE_X, 0.04, 4.9 - ((QUEUE_LEN - 1) * 1.0) / 2);
  lane.receiveShadow = true;
  scene.add(lane);

  // bleachers + crowd
  const crowd: { mesh: THREE.Group; base: number; phase: number; cheer: number }[] = [];
  const stepMat = std(0xcbc5b6, 1);
  const bodyGeoS = new THREE.CapsuleGeometry(0.17, 0.22, 4, 10);
  const headGeoS = new THREE.SphereGeometry(0.15, 12, 10);
  disposables.push(bodyGeoS, headGeoS);
  const crowdColors = [C.red, C.blue, C.yellow, C.green, C.cream, C.ink];
  const crowdMats = crowdColors.map((c) => std(c, 0.9));
  const headMat = std(0x3a2a20, 0.8);
  for (let i = 0; i < 3; i += 1) {
    const h = 0.38 * (i + 1);
    const geo = new THREE.BoxGeometry(12.2, h, 0.62);
    disposables.push(geo);
    const step = new THREE.Mesh(geo, stepMat);
    step.position.set(-2.1, h / 2, -6.35 - i * 0.6);
    step.castShadow = true;
    step.receiveShadow = true;
    scene.add(step);
    for (let k = 0; k < 6; k += 1) {
      if (Math.random() < 0.25) continue;
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeoS, crowdMats[(i * 5 + k * 3) % crowdMats.length]);
      body.position.y = 0.28;
      const head = new THREE.Mesh(headGeoS, headMat);
      head.position.y = 0.68;
      body.castShadow = head.castShadow = true;
      g.add(body, head);
      const x = -7.6 + k * 2.05 + (Math.random() - 0.5) * 0.7;
      g.position.set(x, h, -6.35 - i * 0.6);
      scene.add(g);
      crowd.push({ mesh: g, base: h, phase: Math.random() * 6, cheer: 0 });
    }
  }

  // scoreboard
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 512;
  boardCanvas.height = 256;
  let calling = opts.startBout;
  drawBoard(boardCanvas, calling);
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  disposables.push(boardTex);
  const boardFace = new THREE.MeshBasicMaterial({ map: boardTex });
  disposables.push(boardFace);
  const boardBody = std(C.ink, 0.6);
  const boardGeo = new THREE.BoxGeometry(3.4, 1.7, 0.22);
  disposables.push(boardGeo);
  const board = new THREE.Mesh(boardGeo, [boardBody, boardBody, boardBody, boardBody, boardFace, boardBody]);
  board.position.set(LANE_X - 0.2, 3.0, -6.4);
  board.rotation.y = -0.18;
  board.castShadow = true;
  scene.add(board);
  const postGeo = new THREE.BoxGeometry(0.16, 2.2, 0.16);
  disposables.push(postGeo);
  [-1.2, 1.2].forEach((dx) => {
    const p = new THREE.Mesh(postGeo, boardBody);
    p.position.set(LANE_X - 0.2 + dx * Math.cos(0.18), 1.1, -6.4 + dx * Math.sin(0.18));
    p.castShadow = true;
    scene.add(p);
  });
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      drawBoard(boardCanvas, calling);
      boardTex.needsUpdate = true;
    });
  }

  // wrestlers
  const bodyGeo = new THREE.CapsuleGeometry(0.3, 0.5, 6, 14);
  const headGeo = new THREE.SphereGeometry(0.24, 16, 12);
  disposables.push(bodyGeo, headGeo);
  const redMat = std(C.red, 0.7);
  const whiteMat = std(0xffffff, 0.7);
  const gearMat = std(C.ink, 0.5);

  const makeWrestler = (mat: THREE.Material) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.77;
    const head = new THREE.Mesh(headGeo, gearMat);
    head.position.y = 1.52;
    body.castShadow = head.castShadow = true;
    g.add(body, head);
    return g;
  };

  type Bout = { group: THREE.Group; a: THREE.Group; b: THREE.Group; ends: number; phase: number; state: 'in' | 'live' | 'out'; t0: number };
  type Chip = { mesh: THREE.Mesh; slot: number; fly: null | { from: THREE.Vector3; to: THREE.Vector3; t0: number; mat: number } };

  const chipGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.18, 28);
  disposables.push(chipGeo);
  const chipMat = std(C.yellow, 0.55);

  let now = 0;
  const mats: { bout: Bout | null; incoming: Chip | null }[] = MAT_CENTERS.map(() => ({ bout: null, incoming: null }));
  const queue: Chip[] = [];

  const spawnChip = (slot: number, instant = false) => {
    const mesh = new THREE.Mesh(chipGeo, chipMat);
    mesh.castShadow = true;
    mesh.position.copy(slotPos(slot));
    mesh.scale.setScalar(instant ? 1 : 0.001);
    scene.add(mesh);
    const chip: Chip = { mesh, slot, fly: null };
    queue.push(chip);
    return chip;
  };
  for (let s = 0; s < QUEUE_LEN; s += 1) spawnChip(s, true);

  const startBout = (i: number, residual: number, instant = false) => {
    const group = new THREE.Group();
    const a = makeWrestler(redMat);
    const b = makeWrestler(whiteMat);
    group.add(a, b);
    group.position.copy(MAT_CENTERS[i]);
    group.position.y = 0.22;
    group.scale.setScalar(instant ? 1 : 0.001);
    scene.add(group);
    mats[i].bout = { group, a, b, ends: now + residual, phase: Math.random() * 10, state: instant ? 'live' : 'in', t0: now };
  };
  MAT_CENTERS.forEach((_, i) => startBout(i, boutSeconds() * (0.2 + Math.random() * 0.8), true));

  const callNext = (i: number) => {
    const chip = queue.shift();
    if (!chip) return;
    chip.fly = { from: chip.mesh.position.clone(), to: MAT_CENTERS[i].clone().setY(0.3), t0: now, mat: i };
    mats[i].incoming = chip;
    queue.forEach((c) => (c.slot -= 1));
    spawnChip(QUEUE_LEN - 1);
    calling += 1;
    drawBoard(boardCanvas, calling);
    boardTex.needsUpdate = true;
    opts.onCall(calling, i + 1);
  };

  const posA = new THREE.Vector3();
  const posB = new THREE.Vector3();

  const animateBout = (bt: Bout, i: number) => {
    const c = MAT_CENTERS[i];
    const ang = now * 1.05 + bt.phase;
    const d = 0.5 + 0.14 * Math.sin(now * 2.2 + bt.phase);
    posA.set(Math.cos(ang) * d, 0, Math.sin(ang) * d);
    posB.set(-posA.x, 0, -posA.z);
    bt.a.position.set(posA.x, Math.abs(Math.sin(now * 5 + bt.phase)) * 0.06, posA.z);
    bt.b.position.set(posB.x, Math.abs(Math.cos(now * 5 + bt.phase)) * 0.06, posB.z);
    bt.a.lookAt(c.x + posB.x, bt.a.position.y + 0.22, c.z + posB.z);
    bt.b.lookAt(c.x + posA.x, bt.b.position.y + 0.22, c.z + posA.z);
    // lean in
    bt.a.rotateX(0.18);
    bt.b.rotateX(0.18);
  };

  const update = (dt: number) => {
    now += dt;
    mats.forEach((m, i) => {
      const bt = m.bout;
      if (bt) {
        if (bt.state === 'in') {
          const k = Math.min(1, (now - bt.t0) / 0.4);
          bt.group.scale.setScalar(Math.max(0.001, easeOutBack(k)));
          if (k >= 1) bt.state = 'live';
        } else if (bt.state === 'live' && now >= bt.ends) {
          bt.state = 'out';
          bt.t0 = now;
          crowd.forEach((p) => {
            if (Math.random() < 0.45) p.cheer = 0.6;
          });
        }
        if (bt.state === 'out') {
          const k = Math.min(1, (now - bt.t0) / 0.45);
          bt.group.scale.setScalar(Math.max(0.001, 1 - k));
          bt.group.position.y = 0.22 + Math.sin(k * Math.PI) * 0.9;
          if (k >= 1) {
            scene.remove(bt.group);
            m.bout = null;
          }
        } else {
          animateBout(bt, i);
        }
      }
      if (!m.bout && !m.incoming) callNext(i);
      const chip = m.incoming;
      if (chip?.fly) {
        const k = Math.min(1, (now - chip.fly.t0) / 0.95);
        const e = easeInOut(k);
        chip.mesh.position.lerpVectors(chip.fly.from, chip.fly.to, e);
        chip.mesh.position.y += Math.sin(Math.PI * e) * 2.6;
        chip.mesh.rotation.x = e * Math.PI * 2;
        if (k >= 1) {
          scene.remove(chip.mesh);
          m.incoming = null;
          startBout(i, 0.4 + boutSeconds());
        }
      }
    });

    const lerp = 1 - Math.exp(-dt * 9);
    queue.forEach((c) => {
      c.mesh.position.lerp(slotPos(c.slot), lerp);
      const s = c.mesh.scale.x + (1 - c.mesh.scale.x) * lerp;
      c.mesh.scale.setScalar(Math.max(0.001, s));
    });

    crowd.forEach((p) => {
      p.cheer = Math.max(0, p.cheer - dt);
      const hop = p.cheer > 0 ? Math.sin((0.6 - p.cheer) / 0.6 * Math.PI) * 0.35 : 0;
      p.mesh.position.y = p.base + hop + Math.sin(now * 1.6 + p.phase) * 0.015;
    });
  };

  // camera rig
  let scroll = 0;
  let mx = 0;
  let my = 0;
  const cam = { theta: 0.72, phi: 0.98, r: 36 };
  let baseR = 36;
  const place = (dt: number, snap = false) => {
    const tTheta = 0.72 - scroll * 0.5 + mx * 0.07;
    const tPhi = 0.98 - scroll * 0.24 + my * 0.04;
    const tR = baseR * (1 - scroll * 0.16);
    const k = snap ? 1 : 1 - Math.exp(-dt * 4);
    cam.theta += (tTheta - cam.theta) * k;
    cam.phi += (tPhi - cam.phi) * k;
    cam.r += (tR - cam.r) * k;
    camera.position.set(
      target.x + cam.r * Math.sin(cam.phi) * Math.sin(cam.theta),
      target.y + cam.r * Math.cos(cam.phi),
      target.z + cam.r * Math.sin(cam.phi) * Math.cos(cam.theta),
    );
    camera.lookAt(target);
  };

  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // fit the platform on any aspect ratio
    baseR = camera.aspect >= 1.5 ? 36 : camera.aspect >= 1.05 ? 42 : camera.aspect >= 0.75 ? 54 : 70;
    camera.updateProjectionMatrix();
    place(0, true);
    renderer.render(scene, camera);
  };

  const ro = new ResizeObserver(resize);
  if (canvas.parentElement) ro.observe(canvas.parentElement);
  resize();

  const onPointer = (e: PointerEvent) => {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (!opts.reduced) window.addEventListener('pointermove', onPointer, { passive: true });

  // loop, paused when off screen or tab hidden
  let raf = 0;
  let last = 0;
  let visible = true;
  const frame = (t: number) => {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;
    update(dt);
    place(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  const run = () => {
    if (opts.reduced || raf || !visible || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const halt = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) run();
    else halt();
  });
  io.observe(canvas);
  const onVis = () => (document.hidden ? halt() : run());
  document.addEventListener('visibilitychange', onVis);

  if (opts.reduced) {
    MAT_CENTERS.forEach((_, i) => mats[i].bout && animateBout(mats[i].bout!, i));
    renderer.render(scene, camera);
  } else run();

  return {
    setScroll(p: number) {
      scroll = Math.min(1, Math.max(0, p));
      if (opts.reduced) {
        place(0, true);
        renderer.render(scene, camera);
      }
    },
    dispose() {
      halt();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVis);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
