// ═══════════════════════════════════════════════════════════
//  CUSTOM SHADERS — Developed by FAIZAN
// ═══════════════════════════════════════════════════════════

export const sunShader = {
  uniforms: {
    uTime: { value: 0 },
    uColorA: { value: [1.0, 0.95, 0.75] },
    uColorB: { value: [1.0, 0.55, 0.15] },
    uColorC: { value: [0.9, 0.15, 0.0] },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPos;
    varying vec2 vUv;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPos = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPos;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;

    vec3 hash3(vec3 p) {
      p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
               dot(p, vec3(269.5, 183.3, 246.1)),
               dot(p, vec3(113.5, 271.9, 124.6)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }
    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      vec3 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
                         dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                     mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
                         dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
                 mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
                         dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                     mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
                         dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
    }
    float fbm(vec3 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 6; i++) {
        v += a * noise(p);
        p *= 2.05;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec3 pos = normalize(vPos);
      float t = uTime * 0.08;
      float n = fbm(pos * 3.0 + vec3(t, t * 0.7, t * 0.5));
      float n2 = fbm(pos * 6.0 - vec3(t * 0.5, 0.0, t * 0.3));
      float n3 = fbm(pos * 12.0 + vec3(0.0, t * 0.4, 0.0));
      float combined = n * 0.5 + n2 * 0.3 + n3 * 0.2;
      combined = combined * 0.5 + 0.5;
      vec3 col = mix(uColorC, uColorB, smoothstep(0.2, 0.6, combined));
      col = mix(col, uColorA, smoothstep(0.55, 0.95, combined));
      float hot = pow(combined, 3.0) * 1.5;
      col += vec3(hot * 0.9, hot * 0.7, hot * 0.3);
      float limb = dot(vNormal, vec3(0.0, 0.0, 1.0));
      float limbFactor = pow(max(0.0, limb), 0.45);
      col *= 0.75 + limbFactor * 0.55;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export const atmosphereShader = {
  uniforms: {
    uColor: { value: [0.4, 0.7, 1.0] },
    uIntensity: { value: 1.0 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPos.xyz);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    uniform vec3 uColor;
    uniform float uIntensity;
    void main() {
      float rim = 1.0 - abs(dot(vNormal, vViewDir));
      rim = pow(rim, 2.5) * uIntensity;
      gl_FragColor = vec4(uColor * rim, rim * 0.85);
    }
  `,
};

export const lensingShader = {
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPos;
    void main() {
      vUv = uv;
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vPos;
    uniform float uTime;
    uniform float uIntensity;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
                 mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
    }

    void main() {
      vec2 center = vec2(0.5, 0.5);
      float d = distance(vUv, center) * 2.0;
      float ring = 1.0 - smoothstep(0.0, 0.15, abs(d - 0.7));
      float ring2 = 1.0 - smoothstep(0.0, 0.1, abs(d - 0.85));
      float n = noise(vUv * 30.0 + uTime * 0.15);
      float n2 = noise(vUv * 60.0 - uTime * 0.1);
      vec3 col = vec3(1.0, 0.85, 0.55) * ring * 0.6;
      col += vec3(0.6, 0.4, 1.0) * ring2 * 0.4;
      col *= (0.7 + n * 0.5) * uIntensity;
      col += vec3(n2 * 0.15);
      float alpha = (ring + ring2 * 0.7) * 0.85;
      gl_FragColor = vec4(col, alpha);
    }
  `,
};

export const starfieldShader = {
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    attribute float aSize;
    attribute vec3 aColor;
    varying vec3 vColor;
    varying float vTwinkle;
    uniform float uTime;
    void main() {
      vColor = aColor;
      vTwinkle = 0.7 + 0.3 * sin(uTime * 2.0 + aSize * 200.0);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (300.0 / -mv.z) * vTwinkle;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vTwinkle;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c);
      float alpha = 1.0 - smoothstep(0.0, 0.5, d);
      alpha *= alpha;
      gl_FragColor = vec4(vColor * vTwinkle, alpha);
    }
  `,
};