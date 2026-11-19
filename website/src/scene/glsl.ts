// GLSL for the landing scene.

const NOISE = /* glsl */ `
  float hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a*noise(p); p *= 2.02; a *= 0.5; } return s; }
`;

export const auraVertex = /* glsl */ `void main(){ gl_Position = vec4(position.xy, 0.999, 1.0); }`;

/** Three moods blended by scroll: iridescent aura, blue light streaks, ember vortex. */
export const auraFragment = /* glsl */ `
  uniform float uTime, uAura, uVortex, uStreak; uniform vec2 uRes, uCenter;
  ${NOISE}
  vec3 iri(float t){ return 0.5 + 0.5*cos(6.28318*(vec3(0.0, 0.33, 0.67) + t)); }
  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*uRes)/uRes.y - uCenter;
    float r = length(uv); float a = atan(uv.y, uv.x);
    float t = uTime;

    // Iridescent aura: a warped, breathing blob of light.
    float n  = fbm(vec3(uv*2.0, t*0.07));
    float n2 = fbm(vec3(uv*2.6 + n*1.6, t*0.11 + 7.0));
    float blob = smoothstep(0.62, 0.05, r + (n2 - 0.5)*0.42);
    vec3 pal = iri(n2*1.1 + sin(a)*0.12 + cos(a*2.0)*0.05 + t*0.025);
    pal = mix(vec3(0.08, 0.25, 1.0), pal, 0.65);
    pal.g *= 0.5; // keep it blue, violet and ember, never murky green
    vec3 auraCol = pal*blob*0.32 + vec3(0.1, 0.25, 1.0)*exp(-r*r*5.0)*0.06;

    // Ember vortex: spiral bands caught in a ring.
    float sw = a + 3.2*log(r + 0.04) - t*0.7;
    float bands = pow(0.5 + 0.5*sin(sw*3.0 + n*5.0), 4.0);
    float ringBody = exp(-pow((r - 0.30 - (n - 0.5)*0.06)/0.11, 2.0));
    float rim = exp(-pow((r - 0.30)/0.018, 2.0));
    vec3 vort = vec3(1.0, 0.32, 0.06)*bands*ringBody*0.75 + vec3(1.0, 0.62, 0.3)*rim*0.3*bands
              + vec3(0.55, 0.12, 0.02)*exp(-r*r*6.0)*0.08;

    // Light streaks: tall shimmering columns of blue.
    float cols = 46.0;
    float cx = floor((uv.x + 2.0)*cols); float h = fract(sin(cx*91.7)*437.53);
    float sx = smoothstep(0.5, 0.0, abs(fract((uv.x + 2.0)*cols) - 0.5));
    float sy = noise(vec3(cx, uv.y*2.4 - t*(0.5 + h*0.9), h*10.0));
    float streak = sx*pow(sy, 5.0)*step(0.35, h)*smoothstep(0.75, 0.05, abs(uv.x))*smoothstep(0.6, 0.0, abs(uv.y)*0.7);
    vec3 strCol = vec3(0.22, 0.48, 1.0)*streak*1.1;

    vec3 c = auraCol*uAura + vort*uVortex + strCol*uStreak;
    c *= smoothstep(1.5, 0.15, length(uv*vec2(0.8, 1.0)));
    float grain = (hash(vec3(gl_FragCoord.xy, t)) - 0.5)*0.02;
    gl_FragColor = vec4(c + grain, 1.0);
  }
`;

export const linkVertex = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){
    vec4 mv = modelViewMatrix*vec4(position, 1.0);
    vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vP = position;
    gl_Position = projectionMatrix*mv;
  }
`;

/** A glowing tube: hot core where it faces you, a bright rim, and molten veins running along it. */
export const linkFragment = /* glsl */ `
  uniform float uTime, uGlow, uSeed; uniform vec3 uColor;
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  ${NOISE}
  void main(){
    vec3 N = normalize(vN), V = normalize(vV);
    float facing = abs(dot(N, V));
    float rim = pow(1.0 - facing, 2.0);
    vec3 p = vP*6.0 + vec3(uSeed, uSeed*0.7, uTime*0.35);
    float n = fbm(p + fbm(p*0.5 + uTime*0.08)*1.3);
    float vein = pow(smoothstep(0.7, 1.0, 1.0 - abs(n*2.0 - 1.0)), 2.0);
    vec3 col = uColor*(0.22 + 0.5*facing)*uGlow
      + uColor*rim*1.6
      + uColor*vein*1.8*uGlow
      + vec3(1.0)*pow(vein, 3.0)*0.9*uGlow
      + vec3(1.0)*pow(facing, 6.0)*0.35*uGlow;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const roadVertex = /* glsl */ `
  varying vec3 vW;
  void main(){ vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }
`;

/** Grid floor sliding toward you, with the blue lane down the middle. */
export const roadFragment = /* glsl */ `
  uniform float uTime, uOpacity; varying vec3 vW;
  void main(){
    vec2 g = vec2(vW.x, vW.z + uTime*6.0)*0.9;
    vec2 d = abs(fract(g - 0.5) - 0.5)/fwidth(g);
    float line = 1.0 - min(min(d.x, d.y), 1.0);
    float fade = exp(-abs(vW.z + 6.0)*0.07)*smoothstep(-34.0, -8.0, vW.z);
    float lane = exp(-abs(vW.x)*6.0);
    vec3 c = vec3(0.17, 0.2, 0.27)*line*fade*0.8 + vec3(0.24, 0.55, 1.0)*lane*fade*0.9;
    gl_FragColor = vec4(c*uOpacity, 1.0);
  }
`;
