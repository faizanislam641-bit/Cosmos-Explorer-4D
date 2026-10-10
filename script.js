// ═══════════════════════════════════════════════════════════
//  COSMOS EXPLORER 4D — Experiment Fixed Edition
//  Developed by FAIZAN
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { sunShader, atmosphereShader, lensingShader, starfieldShader } from './shaders.js';

// ═══════════ RENDERER ═══════════
const canvas = document.getElementById('scene3d');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: 'high-performance',
  logarithmicDepthBuffer: true, stencil: false,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000105, 0.00003);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 200000);
camera.position.set(0, 800, 2000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 15;
controls.maxDistance = 30000;
controls.rotateSpeed = 0.5;
controls.panSpeed = 0.85;
controls.zoomSpeed = 1.15;
controls.target.set(0, 0, 0);

// ═══════════ POST-PROCESSING ═══════════
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.05, 0.72, 0.78
);
composer.addPass(bloomPass);
const fxaaPass = new ShaderPass(FXAAShader);
const pr = renderer.getPixelRatio();
fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pr);
fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pr);
composer.addPass(fxaaPass);

// ═══════════ LIGHTS ═══════════
scene.add(new THREE.AmbientLight(0x0a1024, 0.4));
const sunLight = new THREE.PointLight(0xfff4d0, 5, 0, 0.05);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
scene.add(sunLight);

// ═══════════ TEXTURE HELPERS ═══════════
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function randSeed(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function hexToRgb(hex) { const n = parseInt(hex.replace('#', ''), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }

function fractalNoise(w, h, seed, octaves = 6, persistence = 0.5) {
  const data = new Float32Array(w * h);
  const rand = randSeed(seed);
  const grids = [];
  let size = 4;
  for (let o = 0; o < octaves; o++) {
    const g = new Float32Array(size * size);
    for (let i = 0; i < g.length; i++) g[i] = rand();
    grids.push({ grid: g, size });
    size *= 2;
  }
  function sample(grid, size, x, y) {
    const gx = x * size, gy = y * size;
    const x0 = Math.floor(gx) % size, y0 = Math.floor(gy) % size;
    const x1 = (x0 + 1) % size, y1 = (y0 + 1) % size;
    const fx = gx - Math.floor(gx), fy = gy - Math.floor(gy);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = grid[y0 * size + x0], b = grid[y0 * size + x1];
    const c = grid[y1 * size + x0], d = grid[y1 * size + x1];
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let val = 0, amp = 1, total = 0;
    for (let o = 0; o < octaves; o++) {
      val += sample(grids[o].grid, grids[o].size, x / w, y / h) * amp;
      total += amp; amp *= persistence;
    }
    data[y * w + x] = val / total;
  }
  return data;
}

function textureRocky(baseHex, accentHex, seed) {
  const S = 1024;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const data = img.data;
  const base = hexToRgb(baseHex), accent = hexToRgb(accentHex);
  const n1 = fractalNoise(S, S, seed, 6, 0.55);
  const n2 = fractalNoise(S, S, seed + 777, 4, 0.5);
  const n3 = fractalNoise(S, S, seed + 1234, 8, 0.6);
  for (let i = 0; i < S * S; i++) {
    const t = n1[i] * 0.6 + n2[i] * 0.25 + n3[i] * 0.15;
    let r = base.r * (1 - t) + accent.r * t;
    let g = base.g * (1 - t) + accent.g * t;
    let b = base.b * (1 - t) + accent.b * t;
    const crater = Math.max(0, n3[i] - 0.65) * 2.5;
    r *= (1 - crater * 0.6); g *= (1 - crater * 0.6); b *= (1 - crater * 0.6);
    const hl = Math.max(0, 0.35 - n3[i]) * 1.5;
    r += hl * 40; g += hl * 40; b += hl * 40;
    data[i*4] = Math.min(255, Math.max(0, r));
    data[i*4+1] = Math.min(255, Math.max(0, g));
    data[i*4+2] = Math.min(255, Math.max(0, b));
    data[i*4+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function textureGas(baseHex, accentHex, seed) {
  const S = 1024, H = 512;
  const c = makeCanvas(S, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, H);
  const data = img.data;
  const base = hexToRgb(baseHex), accent = hexToRgb(accentHex);
  const n1 = fractalNoise(S, H, seed, 5, 0.55);
  const n2 = fractalNoise(S, H, seed + 555, 7, 0.65);
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const warp = (n1[i] - 0.5) * 0.3;
      const band = Math.sin((v + warp) * Math.PI * 14) * 0.5 + 0.5;
      const band2 = Math.sin((v + warp * 1.5) * Math.PI * 28 + 0.7) * 0.5 + 0.5;
      const t = Math.min(1, Math.max(0, band * 0.4 + band2 * 0.25 + n2[i] * 0.35));
      let r = base.r * (1 - t) + accent.r * t;
      let g = base.g * (1 - t) + accent.g * t;
      let b = base.b * (1 - t) + accent.b * t;
      const storm = Math.max(0, n2[i] - 0.72) * 3;
      r += storm * 60; g += storm * 40; b += storm * 20;
      const lat = Math.abs(v - 0.5) * 2;
      const dark = 1 - lat * 0.25;
      data[i*4] = Math.min(255, Math.max(0, r * dark));
      data[i*4+1] = Math.min(255, Math.max(0, g * dark));
      data[i*4+2] = Math.min(255, Math.max(0, b * dark));
      data[i*4+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function textureEarth() {
  const S = 1024, H = 512;
  const c = makeCanvas(S, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, H);
  const data = img.data;
  const elev = fractalNoise(S, H, 42, 7, 0.55);
  const temp = fractalNoise(S, H, 100, 4, 0.5);
  const humid = fractalNoise(S, H, 555, 5, 0.55);
  for (let y = 0; y < H; y++) {
    const lat = (y / H) * 2 - 1;
    const latAbs = Math.abs(lat);
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const e = elev[i], t = temp[i], h = humid[i];
      let r, g, b;
      const seaLevel = 0.5;
      const polar = latAbs > 0.85;
      if (e < seaLevel) {
        const depth = (seaLevel - e) / seaLevel;
        r = 8 + depth * 4; g = 30 + depth * 20; b = 80 + depth * 60;
        if (depth < 0.15) { r = 30; g = 120; b = 180; }
      } else {
        const alt = (e - seaLevel) / (1 - seaLevel);
        const cold = latAbs > 0.55 || t < 0.35;
        const desert = t > 0.6 && h < 0.35;
        if (polar) { r = 240; g = 245; b = 250; }
        else if (cold) { r = 60 + alt*60; g = 80 + alt*70; b = 50 + alt*40; }
        else if (desert) { r = 200 + alt*30; g = 170 + alt*30; b = 110 + alt*30; }
        else { r = 60 + alt*60; g = 110 + alt*80; b = 45 + alt*40; }
        if (alt > 0.75) {
          const sn = (alt - 0.75) / 0.25;
          r = r * (1 - sn) + 240 * sn;
          g = g * (1 - sn) + 245 * sn;
          b = b * (1 - sn) + 250 * sn;
        }
      }
      data[i*4] = Math.min(255, Math.max(0, r));
      data[i*4+1] = Math.min(255, Math.max(0, g));
      data[i*4+2] = Math.min(255, Math.max(0, b));
      data[i*4+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function textureRing() {
  const W = 1024, H = 32;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const data = img.data;
  for (let x = 0; x < W; x++) {
    const t = x / W;
    let alpha = 0, bright = 200;
    const fine = Math.sin(x * 0.8) * 0.15 + Math.sin(x * 2.3) * 0.1 + 0.85;
    if (t < 0.05) alpha = 0.15;
    else if (t < 0.15) alpha = 0.35;
    else if (t < 0.42) { alpha = 0.9; bright = 220; }
    else if (t < 0.46) alpha = 0.08;
    else if (t < 0.70) { alpha = 0.85; bright = 215; }
    else if (t < 0.72) alpha = 0.15;
    else if (t < 0.74) alpha = 0.5;
    else alpha = 0;
    alpha *= fine;
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      data[i] = bright;
      data[i+1] = bright - 15;
      data[i+2] = bright - 55;
      data[i+3] = Math.min(255, alpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function textureAccretion() {
  const W = 1024, H = 64;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const data = img.data;
  const noise = fractalNoise(W, 8, 4444, 7, 0.6);
  for (let x = 0; x < W; x++) {
    const t = x / W;
    const nv = noise[x] || 0.5;
    let r, g, b, a;
    if (t < 0.05) { r = 255; g = 255; b = 245; a = 1; }
    else if (t < 0.2) { r = 255; g = 240; b = 200; a = 1; }
    else if (t < 0.4) { r = 255; g = 180 + nv*40; b = 100; a = 0.95; }
    else if (t < 0.6) { r = 240; g = 120 + nv*30; b = 60; a = 0.85; }
    else if (t < 0.8) { r = 180; g = 70; b = 100 + nv*40; a = 0.6; }
    else { r = 100; g = 40; b = 140; a = 0.3; }
    a *= (0.5 + nv * 0.6);
    for (let y = 0; y < H; y++) {
      const streak = Math.sin(y * 0.4 + x * 0.05) * 0.3 + 0.85;
      const i = (y * W + x) * 4;
      data[i] = Math.min(255, r * streak);
      data[i+1] = Math.min(255, g * streak);
      data[i+2] = Math.min(255, b * streak);
      data[i+3] = Math.min(255, a * streak * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function textureGlow(colorHex) {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rgb = hexToRgb(colorHex);
  const g = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
  g.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`);
  g.addColorStop(0.25, `rgba(${rgb.r},${rgb.g},${rgb.b},0.75)`);
  g.addColorStop(0.55, `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`);
  g.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

// ═══════════ STARFIELD ═══════════
function createStarfield() {
  const count = 10000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 5000 + Math.random() * 25000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i*3+2] = r * Math.cos(phi);
    const t = Math.random();
    let cr, cg, cb;
    if (t < 0.08) { cr = 0.62; cg = 0.72; cb = 1.0; }
    else if (t < 0.2) { cr = 0.75; cg = 0.85; cb = 1.0; }
    else if (t < 0.45) { cr = 1.0; cg = 1.0; cb = 1.0; }
    else if (t < 0.65) { cr = 1.0; cg = 0.92; cb = 0.72; }
    else if (t < 0.85) { cr = 1.0; cg = 0.72; cb = 0.55; }
    else { cr = 1.0; cg = 0.55; cb = 0.45; }
    col[i*3] = cr; col[i*3+1] = cg; col[i*3+2] = cb;
    size[i] = Math.random() * 2.5 + 0.6;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: starfieldShader.vertexShader,
    fragmentShader: starfieldShader.fragmentShader,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
  return stars;
}
const starfield = createStarfield();

// ═══════════ NEBULA ═══════════
function createNebula() {
  const geo = new THREE.SphereGeometry(35000, 40, 40);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      varying vec3 vPos; uniform float uTime;
      float hash(vec3 p){p=fract(p*0.3183099+vec3(0.1,0.2,0.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.1;a*=0.5;}return v;}
      void main(){
        vec3 dir=normalize(vPos);float t=uTime*0.008;
        float n1=fbm(dir*2.5+vec3(t,0.0,0.0));
        float n2=fbm(dir*5.0+vec3(0.0,t*0.5,0.0));
        vec3 colA=vec3(0.01,0.005,0.025);vec3 colB=vec3(0.06,0.015,0.14);vec3 colC=vec3(0.01,0.04,0.10);
        vec3 col=colA;col=mix(col,colB,smoothstep(0.35,0.75,n1));col=mix(col,colC,smoothstep(0.45,0.85,n2)*0.75);
        gl_FragColor=vec4(col,1.0);
      }
    `,
  });
  const neb = new THREE.Mesh(geo, mat);
  scene.add(neb);
  return neb;
}
const nebula = createNebula();

// ═══════════ SUN ═══════════
const SUN_RADIUS = 60;
const sunGroup = new THREE.Group();
scene.add(sunGroup);
const sunMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColorA: { value: [1.0, 0.96, 0.78] },
    uColorB: { value: [1.0, 0.62, 0.18] },
    uColorC: { value: [0.95, 0.18, 0.02] },
  },
  vertexShader: sunShader.vertexShader,
  fragmentShader: sunShader.fragmentShader,
});
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_RADIUS, 96, 96), sunMat);
sunMesh.userData = { type: 'sun', name: 'SUN' };
sunGroup.add(sunMesh);
for (let i = 0; i < 4; i++) {
  const colors = ['#fff8d0', '#ffcc44', '#ff8020', '#ff4410'];
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textureGlow(colors[i]), transparent: true,
    opacity: [0.95, 0.55, 0.35, 0.2][i],
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const s = SUN_RADIUS * (2.5 + i * 2.5);
  glow.scale.set(s, s, 1);
  sunGroup.add(glow);
}

// ═══════════ PLANETS ═══════════
const PLANET_DATA = [
  { name: 'Mercury', radius: 2.4, orbit: 150, speed: 0.048, color: '#8c8074', accent: '#3a3028', type: 'rocky', tilt: 0.001, realData: { diameter: '4,879 km', day: '58.6 days', year: '88 days', temp: '-173°C to 427°C', moons: '0', gravity: '3.7 m/s²', distance: '57.9M km' } },
  { name: 'Venus', radius: 4.0, orbit: 220, speed: 0.035, color: '#e8c87a', accent: '#9a6a2a', type: 'rocky', tilt: 3.09, realData: { diameter: '12,104 km', day: '243 days', year: '225 days', temp: '462°C', moons: '0', gravity: '8.87 m/s²', distance: '108.2M km' } },
  { name: 'Earth', radius: 4.2, orbit: 300, speed: 0.029, color: '#3d8ee0', accent: '#1e4a1e', type: 'earth', tilt: 0.41, moon: true, realData: { diameter: '12,742 km', day: '24 hours', year: '365.25 days', temp: '-88°C to 58°C', moons: '1', gravity: '9.81 m/s²', distance: '149.6M km' } },
  { name: 'Mars', radius: 3.2, orbit: 400, speed: 0.024, color: '#c1440e', accent: '#7a2a08', type: 'rocky', tilt: 0.44, realData: { diameter: '6,779 km', day: '24.6 hours', year: '687 days', temp: '-153°C to 20°C', moons: '2', gravity: '3.72 m/s²', distance: '227.9M km' } },
  { name: 'Jupiter', radius: 15, orbit: 620, speed: 0.013, color: '#d9a066', accent: '#8a5020', type: 'gas', tilt: 0.05, realData: { diameter: '139,820 km', day: '9.9 hours', year: '11.9 years', temp: '-108°C', moons: '95', gravity: '24.79 m/s²', distance: '778.5M km' } },
  { name: 'Saturn', radius: 13, orbit: 900, speed: 0.0097, color: '#e6c88f', accent: '#b09040', type: 'gas', tilt: 0.47, ring: true, realData: { diameter: '116,460 km', day: '10.7 hours', year: '29.5 years', temp: '-138°C', moons: '146', gravity: '10.44 m/s²', distance: '1.43B km' } },
  { name: 'Uranus', radius: 9, orbit: 1150, speed: 0.0068, color: '#8fd8e0', accent: '#3a8090', type: 'gas', tilt: 1.71, realData: { diameter: '50,724 km', day: '17.2 hours', year: '84 years', temp: '-195°C', moons: '27', gravity: '8.69 m/s²', distance: '2.87B km' } },
  { name: 'Neptune', radius: 8.5, orbit: 1400, speed: 0.0054, color: '#4a6ddb', accent: '#1a2d7f', type: 'gas', tilt: 0.49, realData: { diameter: '49,244 km', day: '16.1 hours', year: '165 years', temp: '-201°C', moons: '14', gravity: '11.15 m/s²', distance: '4.50B km' } },
  { name: 'Pluto', radius: 1.6, orbit: 1650, speed: 0.0042, color: '#c4b8a8', accent: '#5a5040', type: 'rocky', tilt: 2.1, realData: { diameter: '2,377 km', day: '6.4 days', year: '248 years', temp: '-229°C', moons: '5', gravity: '0.62 m/s²', distance: '5.91B km' } },
  { name: 'Kepler-X', radius: 10, orbit: 1950, speed: 0.0035, color: '#ff7ad9', accent: '#8040a0', type: 'gas', tilt: 0.3, realData: { diameter: '~ 90,000 km', day: '4.2 hours', year: '0.8 years', temp: 'Est. 300°C', moons: 'Unknown', gravity: 'Unknown', distance: 'Exoplanet' } },
  { name: 'Nova-9', radius: 7, orbit: 2200, speed: 0.0029, color: '#7dffb0', accent: '#206040', type: 'gas', tilt: 0.8, realData: { diameter: '~ 60,000 km', day: 'Unknown', year: '3.2 years', temp: '-50°C', moons: 'Unknown', gravity: 'Unknown', distance: 'Exoplanet' } },
  { name: 'Zeta-7', radius: 11, orbit: 2500, speed: 0.0024, color: '#ff9c6b', accent: '#804020', type: 'gas', tilt: 0.2, realData: { diameter: '~ 110,000 km', day: '8.5 hours', year: '5.6 years', temp: '-80°C', moons: 'Unknown', gravity: 'Unknown', distance: 'Exoplanet' } },
];

const planets = [];
const orbitLines = [];
PLANET_DATA.forEach((data, idx) => {
  const group = new THREE.Group();
  group.userData = { ...data, angle: Math.random() * Math.PI * 2, index: idx };
  let tex;
  if (data.type === 'earth') tex = textureEarth();
  else if (data.type === 'gas') tex = textureGas(data.color, data.accent, idx * 4231 + 1);
  else tex = textureRocky(data.color, data.accent, idx * 9137 + 1);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: data.type === 'gas' ? 0.88 : 0.96,
    metalness: 0.04,
    emissive: new THREE.Color(data.color).multiplyScalar(0.05),
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(data.radius, 64, 64), mat);
  mesh.rotation.z = data.tilt;
  mesh.userData = { type: 'planet', index: idx, name: data.name };
  mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh);
  if (data.radius > 3) {
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(data.radius * 1.14, 48, 48),
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: [
            parseInt(data.color.slice(1,3), 16) / 255,
            parseInt(data.color.slice(3,5), 16) / 255,
            parseInt(data.color.slice(5,7), 16) / 255,
          ]},
          uIntensity: { value: 1.0 },
        },
        vertexShader: atmosphereShader.vertexShader,
        fragmentShader: atmosphereShader.fragmentShader,
        transparent: true, blending: THREE.AdditiveBlending,
        side: THREE.BackSide, depthWrite: false,
      })
    );
    group.add(atmo);
    const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textureGlow(data.color), transparent: true,
      opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glowSprite.scale.set(data.radius * 4.5, data.radius * 4.5, 1);
    group.add(glowSprite);
  }
  if (data.ring) {
    const ringGeo = new THREE.RingGeometry(data.radius * 1.5, data.radius * 2.9, 128, 4);
    const posAttr = ringGeo.attributes.position;
    const uvAttr = ringGeo.attributes.uv;
    const v3 = new THREE.Vector3();
    const rIn = data.radius * 1.5, rOut = data.radius * 2.9;
    for (let i = 0; i < posAttr.count; i++) {
      v3.fromBufferAttribute(posAttr, i);
      uvAttr.setXY(i, (v3.length() - rIn) / (rOut - rIn), (i % 2) * 0.5 + 0.5);
    }
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      map: textureRing(), side: THREE.DoubleSide, transparent: true, opacity: 0.95,
    }));
    ring.rotation.x = Math.PI / 2 + 0.4;
    group.add(ring);
  }
  if (data.moon) {
    const moonGroup = new THREE.Group();
    const moonMat = new THREE.MeshStandardMaterial({
      map: textureRocky('#aaaaaa', '#4a4a4a', 9999), roughness: 0.95,
    });
    const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 32), moonMat);
    moonMesh.position.set(11, 0, 0);
    moonGroup.add(moonMesh);
    group.add(moonGroup);
    group.userData.moonGroup = moonGroup;
  }
  const orbitGeo = new THREE.BufferGeometry();
  const pts = [];
  for (let i = 0; i <= 256; i++) {
    const a = (i / 256) * Math.PI * 2;
    pts.push(Math.cos(a) * data.orbit, 0, Math.sin(a) * data.orbit);
  }
  orbitGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const orbitLine = new THREE.Line(orbitGeo, new THREE.LineBasicMaterial({
    color: 0x4a6ba8, transparent: true, opacity: 0.22,
  }));
  scene.add(orbitLine);
  orbitLines.push(orbitLine);
  scene.add(group);
  planets.push(group);
});

// ═══════════════════════════════════════════════════════════
//  BLACK HOLE — CLOSER TO CAMERA
// ═══════════════════════════════════════════════════════════
const BH_POSITION = new THREE.Vector3(-1600, 0, -900);
const BH_MASS = 300000;
const BH_HORIZON = 220;
const BH_DISK_INNER = BH_HORIZON * 1.7;
const BH_DISK_OUTER = 1600;

const blackHoleGroup = new THREE.Group();
blackHoleGroup.position.copy(BH_POSITION);
scene.add(blackHoleGroup);

const horizonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(BH_HORIZON, 96, 96),
  new THREE.MeshBasicMaterial({ color: 0x000000 })
);
horizonMesh.userData = { type: 'blackhole', name: 'BLACK HOLE' };
blackHoleGroup.add(horizonMesh);

const lensGeo = new THREE.RingGeometry(BH_HORIZON * 1.02, BH_HORIZON * 3.5, 128, 8);
const lensMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uIntensity: { value: 1.0 } },
  vertexShader: lensingShader.vertexShader,
  fragmentShader: lensingShader.fragmentShader,
  transparent: true, blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide, depthWrite: false,
});
const lensRing = new THREE.Mesh(lensGeo, lensMat);
lensRing.rotation.x = Math.PI / 2;
blackHoleGroup.add(lensRing);

const photonRing = new THREE.Mesh(
  new THREE.TorusGeometry(BH_HORIZON * 1.12, 4, 24, 256),
  new THREE.MeshBasicMaterial({ color: 0xffddaa, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending })
);
photonRing.rotation.x = Math.PI / 2;
blackHoleGroup.add(photonRing);
const photonRing2 = new THREE.Mesh(
  new THREE.TorusGeometry(BH_HORIZON * 1.42, 2, 16, 256),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending })
);
photonRing2.rotation.x = Math.PI / 2;
blackHoleGroup.add(photonRing2);

const diskGeo = new THREE.RingGeometry(BH_DISK_INNER, BH_DISK_OUTER, 256, 8);
{
  const pos = diskGeo.attributes.position;
  const uv = diskGeo.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    uv.setXY(i, (v.length() - BH_DISK_INNER) / (BH_DISK_OUTER - BH_DISK_INNER), (i % 2) * 0.5 + 0.5);
  }
}
const accretionDisk = new THREE.Mesh(diskGeo, new THREE.MeshBasicMaterial({
  map: textureAccretion(), transparent: true, side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1.0,
}));
accretionDisk.rotation.x = Math.PI / 2;
blackHoleGroup.add(accretionDisk);
const accretionDisk2 = new THREE.Mesh(diskGeo, accretionDisk.material.clone());
accretionDisk2.material.opacity = 0.55;
accretionDisk2.rotation.x = Math.PI / 2 + 0.4;
blackHoleGroup.add(accretionDisk2);

function createJet(direction) {
  const jetGroup = new THREE.Group();
  const jet = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 60, 2500, 32, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x99ccff, transparent: true, opacity: 0.18,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    })
  );
  jet.position.y = direction * 1250;
  if (direction < 0) jet.rotation.x = Math.PI;
  jetGroup.add(jet);
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 20, 2500, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    })
  );
  core.position.y = direction * 1250;
  if (direction < 0) core.rotation.x = Math.PI;
  jetGroup.add(core);
  return jetGroup;
}
blackHoleGroup.add(createJet(1));
blackHoleGroup.add(createJet(-1));

const bhLight = new THREE.PointLight(0xffaa66, 4, 8000, 1.4);
blackHoleGroup.add(bhLight);

const bhHalo = new THREE.Sprite(new THREE.SpriteMaterial({
  map: textureGlow('#b06bff'), transparent: true, opacity: 0.5,
  blending: THREE.AdditiveBlending, depthWrite: false,
}));
bhHalo.scale.set(BH_HORIZON * 12, BH_HORIZON * 12, 1);
blackHoleGroup.add(bhHalo);

// ═══════════════════════════════════════════════════════════
//  3D MODELS FOR EXPERIMENTS
// ═══════════════════════════════════════════════════════════

function createAstronaut() {
  const g = new THREE.Group();
  const suitColor = 0xf0e8dc, visorColor = 0x88c0ff, accentColor = 0xff5533;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 32),
    new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.4, metalness: 0.15 }));
  g.add(helmet);
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(1.12, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: visorColor, roughness: 0.1, metalness: 0.9, emissive: 0x2244aa, emissiveIntensity: 0.3 })
  );
  visor.rotation.x = Math.PI / 2;
  visor.position.z = 0.15;
  g.add(visor);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 1.4, 16, 32),
    new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.5 }));
  body.position.y = -1.7;
  g.add(body);
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xc8d0d8, roughness: 0.6 }));
  backpack.position.set(0, -1.6, -0.9);
  g.add(backpack);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.1),
    new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.8 }));
  panel.position.set(0, -1.3, 0.85);
  g.add(panel);
  const armMat = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.5 });
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.0, 8, 16), armMat);
  armL.position.set(-1.05, -1.7, 0);
  armL.rotation.z = 0.3;
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 1.05;
  armR.rotation.z = -0.3;
  g.add(armR);
  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.1, 8, 16), armMat);
  legL.position.set(-0.4, -3.1, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.4;
  g.add(legR);
  return g;
}

function createRocket() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.3, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 4, 32), bodyMat);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.5, 32),
    new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.4, metalness: 0.3 }));
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 2.75;
  g.add(nose);
  const window = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x66ccff, metalness: 0.9, roughness: 0.1, emissive: 0x2255aa, emissiveIntensity: 0.5 }));
  window.position.set(0, 0.3, 1.4);
  g.add(window);
  const finMat = new THREE.MeshStandardMaterial({ color: 0xdd2222, roughness: 0.5 });
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.9), finMat);
    fin.position.set(Math.cos(i * Math.PI * 2 / 3) * 0.85, Math.sin(i * Math.PI * 2 / 3) * 0.85, -1.5);
    fin.rotation.z = i * Math.PI * 2 / 3;
    g.add(fin);
  }
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.3 }));
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.z = -2.2;
  g.add(nozzle);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }));
  flame.rotation.x = -Math.PI / 2;
  flame.position.z = -3.3;
  g.add(flame);
  const flameGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textureGlow('#ffaa33'), transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  flameGlow.scale.set(4, 4, 1);
  flameGlow.position.z = -3.5;
  g.add(flameGlow);
  return g;
}

function createAsteroid() {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1.8, 2);
  const pos = geo.attributes.position;
  const rand = randSeed(5555);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 0.75 + rand() * 0.5;
    pos.setXYZ(i, x * n, y * n, z * n);
  }
  geo.computeVertexNormals();
  const tex = textureRocky('#8a7a68', '#3a3028', 5555);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.05 });
  g.add(new THREE.Mesh(geo, mat));
  return g;
}

function createProbe() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.7, roughness: 0.3 }));
  g.add(body);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1a3a6a, metalness: 0.4, roughness: 0.2, emissive: 0x0a1a3a, emissiveIntensity: 0.3,
  });
  const panelL = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.2), panelMat);
  panelL.position.set(-2, 0, 0);
  g.add(panelL);
  const panelR = panelL.clone();
  panelR.position.x = 2;
  g.add(panelR);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide })
  );
  dish.position.set(0, 0.9, 0);
  g.add(dish);
  return g;
}

function createMiniPlanet() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: textureEarth(), roughness: 0.85, metalness: 0.05 });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(3, 64, 64), mat));
  const atmo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textureGlow('#66aaff'), transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  atmo.scale.set(12, 12, 1);
  g.add(atmo);
  return g;
}

function createStar() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(4, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0xfff0aa })));
  for (let i = 0; i < 3; i++) {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textureGlow(i === 0 ? '#fffbe0' : i === 1 ? '#ffcc44' : '#ff6611'),
      transparent: true, opacity: [0.9, 0.6, 0.35][i],
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    const s = 8 + i * 6;
    glow.scale.set(s, s, 1);
    g.add(glow);
  }
  const light = new THREE.PointLight(0xffdd88, 3, 200);
  g.add(light);
  return g;
}

const OBJ_TYPES = {
  astronaut: { model: createAstronaut, name: 'ASTRONAUT', mass: 80 },
  rocket:    { model: createRocket, name: 'ROCKET', mass: 500 },
  asteroid:  { model: createAsteroid, name: 'ASTEROID', mass: 300 },
  probe:     { model: createProbe, name: 'PROBE', mass: 200 },
  planet:    { model: createMiniPlanet, name: 'PLANET', mass: 2000 },
  star:      { model: createStar, name: 'STAR', mass: 5000 },
};

// ═══════════ STATE ═══════════
const droppedObjects = [];
const G = 1.5;
let focusedObject = null;
let currentCamView = 'chase';
let simSpeed = 0.35;
let slowMoMode = false;
let paused = false;
let showOrbits = true;
let showLabels = true;
let cinematic = false;
let zoomedObject = null;
let horizonActive = false;
let horizonTimer = 0;

// ═══════════ SPAWN OBJECT — MAJOR FIX ═══════════
function spawnObject(type) {
  const t = OBJ_TYPES[type];
  const group = t.model();

  // Spawn at a REASONABLE distance from black hole — 2× event horizon away
  // This makes the fall visible and quick
  const spawnDist = BH_HORIZON * 6;
  const angle = Math.random() * Math.PI * 2;
  const startPos = BH_POSITION.clone().add(new THREE.Vector3(
    Math.cos(angle) * spawnDist,
    (Math.random() - 0.5) * 80,
    Math.sin(angle) * spawnDist
  ));
  group.position.copy(startPos);

  // Scale up small objects for visibility
  const scaleFactor = (type === 'astronaut' || type === 'probe') ? 6 : 
                     (type === 'rocket' || type === 'asteroid') ? 4 : 1;
  group.scale.setScalar(scaleFactor);

  // Velocity: mostly toward BH with slight tangential
  const toBH = BH_POSITION.clone().sub(startPos).normalize();
  const tangent = new THREE.Vector3(-toBH.z, 0, toBH.x).normalize();
  const velocity = toBH.clone().multiplyScalar(1.5).add(tangent.multiplyScalar(0.3));

  const obj = {
    group, velocity, mass: t.mass,
    type, name: t.name,
    age: 0, consumed: false,
    initialScale: scaleFactor,
    spinAxis: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize(),
    spinSpeed: (Math.random() - 0.5) * 0.06,
    spawnDistance: spawnDist,
    startDistance: spawnDist,
  };

  scene.add(group);
  droppedObjects.push(obj);
  focusedObject = obj;
  updateFooterStats();

  // SHOW UI PANELS
  document.getElementById('expCameraPanel').classList.add('show');
  document.getElementById('speedControl').classList.add('show');
  document.getElementById('distanceTracker').classList.add('show');
  document.getElementById('distanceTracker').classList.add('show');
  document.getElementById('dtObj').textContent = t.name + ' — IN FREE FALL';

  // AUTO CAMERA: switch to chase view immediately
  setCameraView('chase', true);

  // Set nav mode
  updateNavMode('EXPERIMENT · ' + t.name);

  // Show tip on canvas via footer
  setTimeout(() => {
    updateNavMode('FOLLOWING · ' + t.name);
  }, 800);
}

// ═══════════ PHYSICS ═══════════
function updateDroppedObjects(dt) {
  for (let i = droppedObjects.length - 1; i >= 0; i--) {
    const o = droppedObjects[i];
    if (o.consumed) continue;
    o.age += dt;

    const pos = o.group.position;
    const toBH = BH_POSITION.clone().sub(pos);
    const dist = toBH.length();
    toBH.normalize();

    // Inverse-square gravity
    const accel = (G * BH_MASS) / (dist * dist + 3000);
    o.velocity.addScaledVector(toBH, accel * dt * 60);

    // Speed limit
    const sp = o.velocity.length();
    const maxSpeed = 25;
    if (sp > maxSpeed) o.velocity.multiplyScalar(maxSpeed / sp);

    // Integrate
    pos.addScaledVector(o.velocity, dt * 60);

    // Spaghettification
    const proxFactor = Math.max(0, 1 - dist / (BH_HORIZON * 5));
    const stretch = 1 + proxFactor * 14;
    const invStretch = 1 / Math.sqrt(stretch);

    const up = toBH.clone();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    o.group.quaternion.slerp(quat, 0.15);

    // Preserve initial scale while stretching
    const sc = o.initialScale;
    o.group.scale.set(sc * invStretch, sc * stretch, sc * invStretch);

    // Spin
    o.group.rotateOnAxis(o.spinAxis, o.spinSpeed);

    // HUD update
    if (focusedObject === o) {
      updateHUD(dist, o.velocity.length(), proxFactor);
      updateTimeWidget(dist);
      updateDistanceTracker(o, dist);
    }

    // Event horizon
    if (dist < BH_HORIZON * 1.02) {
      o.consumed = true;
      triggerImpactFlash();
      showHorizonOverlay(o);
      setTimeout(() => {
        scene.remove(o.group);
        const ix = droppedObjects.indexOf(o);
        if (ix !== -1) droppedObjects.splice(ix, 1);
        if (focusedObject === o) focusedObject = null;
        updateFooterStats();
      }, 500);
    }
  }
}

// ═══════════ CAMERA VIEWS ═══════════
function setCameraView(view, instant = false) {
  currentCamView = view;
  document.querySelectorAll('.ecp-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });

  if (!focusedObject) return;

  const objPos = focusedObject.group.position.clone();
  const bhPos = BH_POSITION.clone();
  const midPoint = objPos.clone().lerp(bhPos, 0.4);

  let camTarget, camPos;

  if (view === 'chase') {
    // Camera behind the falling object, looking at black hole
    const dir = bhPos.clone().sub(objPos).normalize();
    camPos = objPos.clone().sub(dir.multiplyScalar(140)).add(new THREE.Vector3(0, 60, 0));
    camTarget = objPos.clone().lerp(bhPos, 0.35);
  } else if (view === 'bh') {
    // Camera close to black hole, watching object fall in
    camPos = bhPos.clone().add(new THREE.Vector3(
      BH_HORIZON * 3.5,
      BH_HORIZON * 2,
      BH_HORIZON * 3.5
    ));
    camTarget = bhPos.clone();
  } else if (view === 'top') {
    // Top-down view
    camPos = midPoint.clone().add(new THREE.Vector3(0, 700, 0));
    camTarget = midPoint.clone();
  } else if (view === 'side') {
    // Side view perpendicular to fall direction
    const dir = bhPos.clone().sub(objPos).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    camPos = midPoint.clone().add(side.multiplyScalar(500)).add(new THREE.Vector3(0, 120, 0));
    camTarget = midPoint.clone();
  } else if (view === 'first') {
    // First person from object
    const dir = bhPos.clone().sub(objPos).normalize();
    camPos = objPos.clone().add(new THREE.Vector3(0, 8, 0));
    camTarget = objPos.clone().add(dir.multiplyScalar(50));
  }

  if (instant) {
    camera.position.copy(camPos);
    controls.target.copy(camTarget);
  } else {
    smoothMoveCamera(camTarget, camPos, 0.7);
  }
}

// ═══════════ HUD ═══════════
function updateHUD(dist, vel, proxFactor) {
  const hudObject = document.getElementById('hudObject');
  const hudDist = document.getElementById('hudDist');
  const hudVel = document.getElementById('hudVel');
  const hudGrav = document.getElementById('hudGrav');
  const hudStatus = document.getElementById('hudStatus');

  if (!focusedObject) {
    hudObject.textContent = '—';
    hudDist.textContent = '—';
    hudVel.textContent = '—';
    hudGrav.textContent = '—';
    hudStatus.textContent = 'STABLE';
    hudStatus.className = 'hud-val status-ok';
    return;
  }

  hudObject.textContent = focusedObject.name;
  hudDist.textContent = dist.toFixed(0) + ' km';
  hudVel.textContent = (vel * 0.1).toFixed(3) + ' c';
  const gravAcc = (G * BH_MASS) / (dist * dist + 3000);
  hudGrav.textContent = gravAcc.toExponential(1) + ' g';

  if (dist < BH_HORIZON * 2) {
    hudStatus.textContent = 'CRITICAL';
    hudStatus.className = 'hud-val status-danger';
  } else if (proxFactor > 0.3) {
    hudStatus.textContent = 'SPAGHETTIFYING';
    hudStatus.className = 'hud-val status-warn';
  } else {
    hudStatus.textContent = 'IN FREE FALL';
    hudStatus.className = 'hud-val status-ok';
  }
}

function updateTimeWidget(dist) {
  const rs = BH_HORIZON;
  const r = Math.max(dist, rs * 1.0001);
  const gamma = 1 / Math.sqrt(1 - rs / r);
  const tw = document.getElementById('timeWidget');
  document.getElementById('twValue').textContent = isFinite(gamma) ? gamma.toFixed(2) + '×' : '∞';
  const pct = Math.min(100, Math.max(0, (gamma - 1) / 50 * 100));
  document.getElementById('twFill').style.width = pct + '%';
  if (gamma > 5) tw.classList.add('danger');
  else tw.classList.remove('danger');
}

function updateDistanceTracker(o, dist) {
  const progress = 1 - (dist / o.startDistance);
  document.getElementById('dtFill').style.width = (progress * 100) + '%';
  document.getElementById('dtDist').textContent = dist.toFixed(0) + ' km';
  document.getElementById('dtSpeed').textContent = o.velocity.length().toFixed(2) + ' c';
  const avgSpeed = o.velocity.length() * 60;
  const eta = dist / Math.max(0.5, avgSpeed);
  document.getElementById('dtEta').textContent = eta.toFixed(1) + ' s';
}

// ═══════════ IMPACT FLASH ═══════════
function triggerImpactFlash() {
  const flash = document.createElement('div');
  flash.className = 'impact-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 800);
}

// ═══════════ HORIZON OVERLAY ═══════════
function showHorizonOverlay(obj) {
  horizonActive = true;
  horizonTimer = 0;
  document.getElementById('horizonOverlay').classList.add('show');
  document.getElementById('horizonTitle').textContent = obj.name + ' CONSUMED';
  document.getElementById('horizonDesc').textContent =
    `${obj.name} has crossed the point of no return. Beyond this boundary, escape velocity exceeds c. Spacetime is infinitely curved.`;
  updateHorizonStats(0);
}

function updateHorizonStats(t) {
  document.getElementById('hsDist').textContent = Math.max(0, BH_HORIZON * 0.9 - t * 60).toFixed(0) + ' km';
  const td = 1 / Math.max(0.001, 1 - t * 0.6);
  document.getElementById('hsTime').textContent = isFinite(td) ? td.toFixed(2) + '×' : '∞';
  document.getElementById('hsTidal').textContent = (1 + t * 14).toFixed(1) + ' g/m';
  document.getElementById('hsSpaghet').textContent = (1 + t * 10).toFixed(1) + '×';
}

function exitHorizon() {
  horizonActive = false;
  document.getElementById('horizonOverlay').classList.remove('show');
  smoothMoveCamera(BH_POSITION, BH_POSITION.clone().add(new THREE.Vector3(3000, 800, 3000)));
}

// ═══════════ OBJECT LIST ═══════════
const objectListEl = document.getElementById('objectList');

function buildObjectList() {
  objectListEl.innerHTML = '';
  const sunItem = document.createElement('div');
  sunItem.className = 'obj-item';
  sunItem.dataset.type = 'sun';
  sunItem.innerHTML = `
    <div class="obj-dot" style="background:#ffcc44;color:#ffcc44"></div>
    <div class="obj-name">Sun</div>
    <div class="obj-type">Star</div>
  `;
  sunItem.addEventListener('click', () => selectObject('sun'));
  objectListEl.appendChild(sunItem);

  PLANET_DATA.forEach((p, i) => {
    const item = document.createElement('div');
    item.className = 'obj-item';
    item.dataset.index = i;
    item.dataset.type = 'planet';
    item.innerHTML = `
      <div class="obj-dot" style="background:${p.color};color:${p.color}"></div>
      <div class="obj-name">${p.name}</div>
      <div class="obj-type">${p.type === 'gas' ? 'Gas Giant' : p.type === 'earth' ? 'Terrestrial' : 'Rocky'}</div>
    `;
    item.addEventListener('click', () => selectObject('planet', i));
    objectListEl.appendChild(item);
  });

  const bhItem = document.createElement('div');
  bhItem.className = 'obj-item';
  bhItem.dataset.type = 'blackhole';
  bhItem.innerHTML = `
    <div class="obj-dot" style="background:#ff4444;color:#ff4444"></div>
    <div class="obj-name">Sagittarius-X</div>
    <div class="obj-type">Black Hole</div>
  `;
  bhItem.addEventListener('click', () => selectObject('blackhole'));
  objectListEl.appendChild(bhItem);
}
buildObjectList();

// ═══════════ SELECT OBJECT ═══════════
function selectObject(type, index = null) {
  document.querySelectorAll('.obj-item').forEach(el => el.classList.remove('active'));

  if (type === 'planet') {
    document.querySelectorAll(`.obj-item[data-index="${index}"]`).forEach(el => el.classList.add('active'));
  } else {
    document.querySelector(`.obj-item[data-type="${type}"]`)?.classList.add('active');
  }

  if (type === 'sun') {
    showInfoCard('Sun', 'G-Type Main Sequence Star', '☀', [
      ['Diameter', '1,392,700 km'],
      ['Surface Temp', '5,778 K'],
      ['Core Temp', '15 million K'],
      ['Age', '4.6 billion years'],
      ['Mass', '1.989 × 10³⁰ kg'],
      ['Composition', 'H (73%) · He (25%)'],
    ], () => zoomToObject('sun'));
    smoothMoveCamera(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 250, 850));
    updateNavMode('SUN · STAR');
  }
  else if (type === 'planet') {
    const p = PLANET_DATA[index];
    const planetObj = planets[index];
    const worldPos = new THREE.Vector3();
    planetObj.getWorldPosition(worldPos);

    showInfoCard(p.name, getTypeLabel(p.type), getIconForPlanet(p.name), [
      ['Diameter', p.realData.diameter],
      ['Day Length', p.realData.day],
      ['Year Length', p.realData.year],
      ['Temperature', p.realData.temp],
      ['Moons', p.realData.moons],
      ['Gravity', p.realData.gravity],
      ['Distance', p.realData.distance],
    ], () => zoomToObject('planet', index));

    const camDist = p.radius * 10 + 30;
    const targetCamPos = worldPos.clone().add(new THREE.Vector3(camDist, camDist * 0.5, camDist));
    smoothMoveCamera(worldPos, targetCamPos);
    updateNavMode(p.name.toUpperCase());
  }
  else if (type === 'blackhole') {
    showInfoCard('Sagittarius-X', 'Supermassive Black Hole', '⚫', [
      ['Mass', '300,000 M☉'],
      ['Event Horizon', BH_HORIZON + ' km'],
      ['Accretion Disk', (BH_DISK_OUTER - BH_DISK_INNER) + ' km'],
      ['Relativistic Jets', 'Active'],
      ['Spin', '0.98 c'],
      ['Location', 'Sector 7-G'],
    ], () => zoomToObject('blackhole'));
    smoothMoveCamera(BH_POSITION, BH_POSITION.clone().add(new THREE.Vector3(1800, 700, 1800)));
    updateNavMode('BLACK HOLE');
  }
}

function getTypeLabel(t) {
  return t === 'gas' ? 'Gas Giant' : t === 'earth' ? 'Terrestrial Planet' : 'Rocky Planet';
}
function getIconForPlanet(name) {
  const map = {
    Mercury: '☿', Venus: '♀', Earth: '⊕', Mars: '♂',
    Jupiter: '♃', Saturn: '♄', Uranus: '⛢', Neptune: '♆',
    Pluto: '⯓', 'Kepler-X': '✧', 'Nova-9': '✦', 'Zeta-7': '❋',
  };
  return map[name] || '🌍';
}

function showInfoCard(title, subtitle, icon, stats, onZoom) {
  document.getElementById('infoIcon').textContent = icon;
  document.getElementById('infoTitle').textContent = title;
  document.getElementById('infoSubtitle').textContent = subtitle;
  const statsEl = document.getElementById('infoStats');
  statsEl.innerHTML = '';
  stats.forEach(([k, v]) => {
    const row = document.createElement('div');
    row.className = 'info-stat-row';
    row.innerHTML = `<span class="info-stat-key">${k.toUpperCase()}</span><span class="info-stat-val">${v}</span>`;
    statsEl.appendChild(row);
  });
  document.getElementById('planetInfo').classList.add('show');
  document.getElementById('infoZoomBtn').onclick = onZoom;
  document.getElementById('closePlanetInfo').onclick = () => {
    document.getElementById('planetInfo').classList.remove('show');
    document.querySelectorAll('.obj-item').forEach(el => el.classList.remove('active'));
  };
}

// ═══════════ SMOOTH CAMERA ═══════════
let camAnim = null;

function smoothMoveCamera(targetPos, camPos, duration = 1.4) {
  camAnim = {
    startTarget: controls.target.clone(),
    endTarget: targetPos.clone(),
    startPos: camera.position.clone(),
    endPos: camPos.clone(),
    t: 0,
    duration,
  };
}

function updateCamAnim(dt) {
  if (!camAnim) return;
  camAnim.t += dt / camAnim.duration;
  if (camAnim.t >= 1) {
    controls.target.copy(camAnim.endTarget);
    camera.position.copy(camAnim.endPos);
    camAnim = null;
    return;
  }
  const t = camAnim.t < 0.5
    ? 4 * camAnim.t ** 3
    : 1 - Math.pow(-2 * camAnim.t + 2, 3) / 2;
  controls.target.lerpVectors(camAnim.startTarget, camAnim.endTarget, t);
  camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, t);
}

// ═══════════ ZOOM ═══════════
function zoomToObject(type, index = null) {
  if (type === 'planet') {
    const planetObj = planets[index];
    const p = PLANET_DATA[index];
    const worldPos = new THREE.Vector3();
    planetObj.getWorldPosition(worldPos);
    const closeDist = p.radius * 2.6 + 4;
    const camPos = worldPos.clone().add(new THREE.Vector3(closeDist, closeDist * 0.3, closeDist));
    smoothMoveCamera(worldPos, camPos, 2.2);
    zoomedObject = { type, index };
    document.getElementById('zoomOverlay').classList.add('show');
    document.getElementById('zoomTitle').textContent = p.name.toUpperCase();
    document.getElementById('zoomInfoPanel').innerHTML =
      `<b>Diameter</b> ${p.realData.diameter} &nbsp;·&nbsp; <b>Day</b> ${p.realData.day} &nbsp;·&nbsp; <b>Year</b> ${p.realData.year} &nbsp;·&nbsp; <b>Temp</b> ${p.realData.temp} &nbsp;·&nbsp; <b>Moons</b> ${p.realData.moons}`;
    updateNavMode('ORBIT VIEW: ' + p.name.toUpperCase());
  }
  else if (type === 'sun') {
    const closeDist = SUN_RADIUS * 3;
    const camPos = new THREE.Vector3(closeDist, closeDist * 0.4, closeDist);
    smoothMoveCamera(new THREE.Vector3(0, 0, 0), camPos, 2.2);
    zoomedObject = { type: 'sun' };
    document.getElementById('zoomOverlay').classList.add('show');
    document.getElementById('zoomTitle').textContent = 'THE SUN';
    document.getElementById('zoomInfoPanel').innerHTML =
      `<b>Type</b> G2V Yellow Dwarf &nbsp;·&nbsp; <b>Surface</b> 5,778 K &nbsp;·&nbsp; <b>Core</b> 15.7M K &nbsp;·&nbsp; <b>Radius</b> 696,340 km`;
    updateNavMode('ORBIT VIEW: THE SUN');
  }
  else if (type === 'blackhole') {
    const camPos = BH_POSITION.clone().add(new THREE.Vector3(800, 250, 800));
    smoothMoveCamera(BH_POSITION, camPos, 2.2);
    zoomedObject = { type: 'blackhole' };
    document.getElementById('zoomOverlay').classList.add('show');
    document.getElementById('zoomTitle').textContent = 'SAGITTARIUS-X';
    document.getElementById('zoomInfoPanel').innerHTML =
      `<b>Class</b> Supermassive Black Hole &nbsp;·&nbsp; <b>Mass</b> 300,000 M☉ &nbsp;·&nbsp; <b>Event Horizon</b> ${BH_HORIZON} km &nbsp;·&nbsp; <b>Spin</b> 0.98 c`;
    updateNavMode('ORBIT VIEW: BLACK HOLE');
  }
}

function exitZoom() {
  zoomedObject = null;
  document.getElementById('zoomOverlay').classList.remove('show');
  document.getElementById('planetInfo').classList.remove('show');
  document.querySelectorAll('.obj-item').forEach(el => el.classList.remove('active'));
  smoothMoveCamera(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 900, 2200), 1.6);
  updateNavMode('SOLAR SYSTEM · 1:1 SCALE');
}

function updateNavMode(text) {
  document.getElementById('navMode').textContent = text;
  document.getElementById('footerMode').textContent = text;
}

// ═══════════ UI EVENTS ═══════════
document.querySelectorAll('.exp-card').forEach(btn => {
  btn.addEventListener('click', () => {
    spawnObject(btn.dataset.type);
    btn.style.transform = 'scale(0.9)';
    setTimeout(() => { btn.style.transform = ''; }, 150);
  });
});

document.querySelectorAll('.ecp-btn').forEach(btn => {
  btn.addEventListener('click', () => setCameraView(btn.dataset.view, false));
});

document.getElementById('speedSlider').addEventListener('input', (e) => {
  simSpeed = parseFloat(e.target.value);
  document.getElementById('speedValue').textContent = simSpeed.toFixed(2) + '×';
});

document.getElementById('btnPause').onclick = (e) => {
  paused = !paused;
  e.currentTarget.classList.toggle('active', paused);
  e.currentTarget.querySelector('span').textContent = paused ? '▶' : '❚❚';
};

document.getElementById('btnSlowMo').onclick = (e) => {
  slowMoMode = !slowMoMode;
  e.currentTarget.classList.toggle('active', slowMoMode);
  if (slowMoMode) {
    document.getElementById('speedSlider').value = 0.15;
    simSpeed = 0.15;
    document.getElementById('speedValue').textContent = '0.15×';
  } else {
    document.getElementById('speedSlider').value = 0.35;
    simSpeed = 0.35;
    document.getElementById('speedValue').textContent = '0.35×';
  }
};

document.getElementById('btnOrbits').onclick = (e) => {
  showOrbits = !showOrbits;
  e.currentTarget.classList.toggle('active', showOrbits);
  orbitLines.forEach(l => l.visible = showOrbits);
};

document.getElementById('btnLabels').onclick = (e) => {
  showLabels = !showLabels;
  e.currentTarget.classList.toggle('active', showLabels);
};

document.getElementById('btnCinematic').onclick = (e) => {
  cinematic = !cinematic;
  e.currentTarget.classList.toggle('active', cinematic);
  document.getElementById('cinemaBars').classList.toggle('show', cinematic);
};

document.getElementById('btnReset').onclick = () => {
  camera.position.set(0, 900, 2200);
  controls.target.set(0, 0, 0);
  droppedObjects.forEach(o => scene.remove(o.group));
  droppedObjects.length = 0;
  focusedObject = null;
  zoomedObject = null;
  document.getElementById('planetInfo').classList.remove('show');
  document.getElementById('zoomOverlay').classList.remove('show');
  document.getElementById('expCameraPanel').classList.remove('show');
  document.getElementById('speedControl').classList.remove('show');
  document.getElementById('distanceTracker').classList.remove('show');
  document.querySelectorAll('.obj-item').forEach(el => el.classList.remove('active'));
  updateNavMode('SOLAR SYSTEM · 1:1 SCALE');
  updateFooterStats();
};

document.getElementById('btnInfo').onclick = () => document.getElementById('infoModal').classList.add('show');
document.getElementById('closeModal').onclick = () => document.getElementById('infoModal').classList.remove('show');
document.getElementById('infoModal').addEventListener('click', (e) => {
  if (e.target.id === 'infoModal') e.target.classList.remove('show');
});

document.getElementById('exitHorizon').onclick = exitHorizon;
document.getElementById('zoomClose').onclick = exitZoom;

document.getElementById('viewAllBtn').onclick = () => {
  smoothMoveCamera(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1200, 2800), 1.8);
  document.querySelectorAll('.obj-item').forEach(el => el.classList.remove('active'));
  document.getElementById('planetInfo').classList.remove('show');
  document.getElementById('zoomOverlay').classList.remove('show');
  zoomedObject = null;
  updateNavMode('SOLAR SYSTEM · 1:1 SCALE');
};

document.getElementById('btnFullscreen').onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen();
};

// ═══════════ LABELS ═══════════
const labelLayer = document.createElement('div');
labelLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:25;';
document.body.appendChild(labelLayer);

const labels = [];
function createLabel(text) {
  const el = document.createElement('div');
  el.className = 'space-label';
  el.textContent = text;
  labelLayer.appendChild(el);
  return el;
}
labels.push({ el: createLabel('SUN'), obj: sunMesh, radius: SUN_RADIUS });
planets.forEach((p, i) => {
  labels.push({ el: createLabel(PLANET_DATA[i].name), obj: p.children[0], radius: PLANET_DATA[i].radius });
});
labels.push({ el: createLabel('BLACK HOLE'), obj: horizonMesh, radius: BH_HORIZON });

function updateLabels() {
  const v = new THREE.Vector3();
  labels.forEach(l => {
    if (!showLabels) { l.el.style.display = 'none'; return; }
    l.obj.getWorldPosition(v);
    const proj = v.clone().project(camera);
    if (proj.z > 1 || proj.z < -1) { l.el.style.display = 'none'; return; }
    const x = (proj.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-proj.y * 0.5 + 0.5) * window.innerHeight;
    if (x < -100 || x > window.innerWidth + 100 || y < -50 || y > window.innerHeight + 50) {
      l.el.style.display = 'none';
      return;
    }
    const dist = camera.position.distanceTo(v);
    const op = Math.max(0.15, Math.min(1, 3500 / dist));
    l.el.style.display = 'block';
    l.el.style.left = x + 'px';
    l.el.style.top = (y - l.radius * 0.12 - 6) + 'px';
    l.el.style.opacity = op;
  });
}

// ═══════════ FOOTER ═══════════
let fpsSampleTime = 0, fpsFrames = 0;

function updateFooterStats() {
  document.getElementById('footerObjects').textContent = droppedObjects.length + ' OBJECTS';
}
updateFooterStats();

// ═══════════ RESIZE ═══════════
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  const p = renderer.getPixelRatio();
  fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * p);
  fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * p);
});

// ═══════════ LOADER ═══════════
let loadPct = 0;
const loadFill = document.getElementById('loadFill');
const loadText = document.getElementById('loadProgress');
const loadPctEl = document.getElementById('loadPct');
const loadSteps = [
  'Initializing physics core...',
  'Compiling shaders...',
  'Generating planetary textures...',
  'Building atmosphere models...',
  'Calibrating relativity engine...',
  'Loading stellar cartography...',
  'Warming black hole shader...',
  'Cosmos ready.',
];
let stepIdx = 0;
const loadInt = setInterval(() => {
  loadPct += 3 + Math.random() * 5;
  if (loadPct >= 100) loadPct = 100;
  loadFill.style.width = loadPct + '%';
  loadPctEl.textContent = Math.floor(loadPct);
  const targetStep = Math.min(loadSteps.length - 1, Math.floor((loadPct / 100) * loadSteps.length));
  if (targetStep !== stepIdx) {
    stepIdx = targetStep;
    loadText.textContent = loadSteps[stepIdx];
  }
  if (loadPct >= 100) {
    clearInterval(loadInt);
    setTimeout(() => document.getElementById('loader').classList.add('hide'), 500);
  }
}, 120);

// ═══════════ MAIN LOOP ═══════════
let lastT = performance.now();

function animate(now) {
  const dtRaw = Math.min((now - lastT) / 1000, 0.05);
  const dt = dtRaw * simSpeed;
  lastT = now;

  fpsFrames++;
  if (now - fpsSampleTime > 500) {
    const fps = Math.round((fpsFrames * 1000) / (now - fpsSampleTime));
    document.getElementById('footerFps').textContent = fps + ' FPS';
    fpsFrames = 0;
    fpsSampleTime = now;
  }

  nebula.material.uniforms.uTime.value = now * 0.001;
  sunMat.uniforms.uTime.value = now * 0.001;
  lensMat.uniforms.uTime.value = now * 0.001;
  starfield.material.uniforms.uTime.value = now * 0.001;

  if (!paused) {
    sunMesh.rotation.y += 0.0008 * dt * 60;
    planets.forEach((p) => {
      const d = p.userData;
      d.angle += d.speed * dt * 5;
      p.position.set(Math.cos(d.angle) * d.orbit, 0, Math.sin(d.angle) * d.orbit);
      p.children[0].rotation.y += 0.008 * dt * 60;
      if (d.moonGroup) d.moonGroup.rotation.y += 0.02 * dt * 60;
    });
    accretionDisk.rotation.z += 0.0018 * dt * 60;
    accretionDisk2.rotation.z -= 0.0012 * dt * 60;
    photonRing.rotation.z += 0.0008 * dt * 60;
    photonRing2.rotation.z -= 0.0006 * dt * 60;
    const pulse = 1 + Math.sin(now * 0.002) * 0.05;
    photonRing.scale.setScalar(pulse);
    bhHalo.material.opacity = 0.45 + Math.sin(now * 0.0015) * 0.12;
    updateDroppedObjects(dt);

    if (horizonActive) {
      horizonTimer += dtRaw;
      updateHorizonStats(horizonTimer);
    }
  }

  starfield.rotation.y += 0.00002 * dt * 60;

  // CINEMATIC
  if (cinematic && !camAnim) {
    const r = 3400;
    const a = now * 0.00008;
    camera.position.x = Math.cos(a) * r;
    camera.position.z = Math.sin(a) * r;
    camera.position.y = 900 + Math.sin(a * 1.7) * 300;
    controls.target.set(0, 0, 0);
  }

  // EXPERIMENT CHASE CAMERA — follow the object continuously
  if (focusedObject && !cinematic && !camAnim && currentCamView !== 'free') {
    const objPos = focusedObject.group.position.clone();
    const bhPos = BH_POSITION.clone();
    const dirToBH = bhPos.clone().sub(objPos).normalize();
    const midPoint = objPos.clone().lerp(bhPos, 0.35);

    let camTarget, camPos;
    if (currentCamView === 'chase') {
      camPos = objPos.clone().sub(dirToBH.clone().multiplyScalar(120)).add(new THREE.Vector3(0, 50, 0));
      camTarget = objPos.clone().lerp(bhPos, 0.4);
    } else if (currentCamView === 'bh') {
      camPos = bhPos.clone().add(new THREE.Vector3(BH_HORIZON * 3.2, BH_HORIZON * 1.8, BH_HORIZON * 3.2));
      camTarget = bhPos.clone();
    } else if (currentCamView === 'top') {
      camPos = midPoint.clone().add(new THREE.Vector3(0, 600, 0));
      camTarget = midPoint.clone();
    } else if (currentCamView === 'side') {
      const side = new THREE.Vector3(-dirToBH.z, 0, dirToBH.x).normalize();
      camPos = midPoint.clone().add(side.multiplyScalar(450)).add(new THREE.Vector3(0, 100, 0));
      camTarget = midPoint.clone();
    } else if (currentCamView === 'first') {
      camPos = objPos.clone().add(new THREE.Vector3(0, 5, 0));
      camTarget = objPos.clone().add(dirToBH.clone().multiplyScalar(60));
    }

    camera.position.lerp(camPos, 0.08);
    controls.target.lerp(camTarget, 0.1);
  }

  updateCamAnim(dtRaw);

  // Follow zoomed planet
  if (zoomedObject?.type === 'planet') {
    const p = planets[zoomedObject.index];
    const worldPos = new THREE.Vector3();
    p.getWorldPosition(worldPos);
    const offset = camera.position.clone().sub(controls.target);
    controls.target.copy(worldPos);
    camera.position.copy(worldPos).add(offset);
  }

  controls.update();
  composer.render();
  updateLabels();

  requestAnimationFrame(animate);
}

// ═══════════ CLICK RAYCAST ═══════════
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDownPos = null;

renderer.domElement.addEventListener('pointerdown', (e) => {
  pointerDownPos = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('pointerup', (e) => {
  if (!pointerDownPos) return;
  const d = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  pointerDownPos = null;
  if (d > 5) return;

  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const planetMeshes = planets.map(p => p.children[0]);
  const planetHits = raycaster.intersectObjects(planetMeshes, false);
  if (planetHits.length) {
    selectObject('planet', planetHits[0].object.userData.index);
    return;
  }
  const sunHits = raycaster.intersectObject(sunMesh, false);
  if (sunHits.length) { selectObject('sun'); return; }
  const bhHits = raycaster.intersectObject(horizonMesh, false);
  if (bhHits.length) { selectObject('blackhole'); return; }
});

requestAnimationFrame(animate);