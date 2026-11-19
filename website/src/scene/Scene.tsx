// The WebGL layer behind the page: an aura shader, seven glowing triangles that orbit, assemble
// into the CyDrip mark, drop onto a road and reassemble — all driven by page scroll.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { type ReactNode, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  ExtrudeGeometry,
  type InstancedMesh,
  type Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';

import { auraFragment, auraVertex, roadFragment, roadVertex, triFragment, triVertex } from './glsl';
import { scrollTarget } from './scroll';
import { CAMERAS, COLORS, ease, STAGES, triangleShape } from './stages';

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smoothed scene state shared by every component; the Director updates it first each frame. */
const state = { time: 0, stage: 0, a: 1, v: 0, s: 0, px: 0, py: 0, ptx: 0, pty: 0 };

if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => {
    state.ptx = (e.clientX / window.innerWidth - 0.5) * 2;
    state.pty = (e.clientY / window.innerHeight - 0.5) * 2;
  });
}

function Director() {
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    if (!reduceMotion) state.time += d;
    const k = 1 - Math.pow(0.0015, d); // frame-rate independent easing toward the scroll target
    state.stage += (scrollTarget.stage - state.stage) * k;
    state.a += (scrollTarget.a - state.a) * k;
    state.v += (scrollTarget.v - state.v) * k;
    state.s += (scrollTarget.s - state.s) * k;
    state.px += (state.ptx - state.px) * k;
    state.py += (state.pty - state.py) * k;
  }, -1);
  return null;
}

function useNarrow() {
  return useThree((s) => s.size.width < 860);
}

// ---------------------------------------------------------------- aura
function Aura() {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const narrow = useNarrow();
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uRes: { value: new Vector2() },
          uCenter: { value: new Vector2() },
          uAura: { value: 1 },
          uVortex: { value: 0 },
          uStreak: { value: 0 },
        },
        vertexShader: auraVertex,
        fragmentShader: auraFragment,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );
  useFrame(() => {
    const u = material.uniforms;
    u.uRes.value.set(size.width * dpr, size.height * dpr);
    u.uTime.value = state.time;
    u.uAura.value = state.a;
    u.uVortex.value = state.v;
    u.uStreak.value = state.s;
    // In the hero the aura sits behind the orbit (right on desktop, above the text on phones).
    const hero = Math.max(0, 1 - state.stage * 2);
    u.uCenter.value.set(narrow ? 0 : 0.32 * hero, narrow ? 0.12 * hero : 0);
  });
  return (
    <mesh frustumCulled={false} renderOrder={-10} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

// ---------------------------------------------------------------- triangles
function Triangles() {
  const narrow = useNarrow();
  const geometry = useMemo(() => {
    const g = new ExtrudeGeometry(triangleShape(), {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.025,
      bevelSegments: 4,
      curveSegments: 14,
    });
    g.center();
    return g;
  }, []);
  const materials = useMemo(
    () =>
      COLORS.map(
        (hex, i) =>
          new ShaderMaterial({
            uniforms: {
              uTime: { value: 0 },
              uGlow: { value: 1 },
              uSeed: { value: i * 3.7 },
              uColor: { value: new Color(hex).multiplyScalar(i === 6 ? 1.6 : 1.25) },
            },
            vertexShader: triVertex,
            fragmentShader: triFragment,
          }),
      ),
    [],
  );
  const refs = useRef<(Mesh | null)[]>([]);

  useFrame(() => {
    const s0 = Math.min(Math.floor(state.stage), STAGES.length - 2);
    const f = state.stage - s0;
    const assembled = 1 - Math.min(Math.abs(state.stage - 1), Math.abs(state.stage - 3), 1);
    refs.current.forEach((m, i) => {
      if (!m) return;
      // Puzzle stagger: each piece moves a beat after the one before it.
      const fi = ease((f - i * 0.045) / (1 - 6 * 0.045));
      const A = STAGES[s0](i, state.time, narrow);
      const B = STAGES[s0 + 1](i, state.time, narrow);
      m.position.lerpVectors(A.p, B.p, fi);
      m.rotation.set(A.r.x + (B.r.x - A.r.x) * fi, A.r.y + (B.r.y - A.r.y) * fi, A.r.z + (B.r.z - A.r.z) * fi);
      m.scale.setScalar(A.s + (B.s - A.s) * fi);
      const u = materials[i].uniforms;
      u.uTime.value = state.time;
      u.uGlow.value = 0.85 + assembled * 0.5 + Math.sin(state.time * 1.6 + i) * 0.12;
    });
  });

  return (
    <>
      {materials.map((mat, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          geometry={geometry}
          material={mat}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- road and streaks
function Road() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
        vertexShader: roadVertex,
        fragmentShader: roadFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  useFrame(() => {
    material.uniforms.uTime.value = state.time;
    material.uniforms.uOpacity.value = Math.max(0, 1 - Math.abs(state.stage - 2) * 1.4);
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, -18]} material={material}>
      <planeGeometry args={[40, 60]} />
    </mesh>
  );
}

function Streaks() {
  const count = useThree((s) => (s.size.width < 700 ? 70 : 140));
  const ref = useRef<InstancedMesh>(null);
  const { geometry, material, data } = useMemo(() => {
    const g = new PlaneGeometry(0.025, 2.2);
    g.rotateX(-Math.PI / 2);
    const m = new MeshBasicMaterial({
      color: new Color(0.45, 0.9, 3.2),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const d = Array.from({ length: count }, () => ({
      x: (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 4.5),
      y: -1.1 + Math.random() * 2.8,
      z: -40 + Math.random() * 45,
      v: 14 + Math.random() * 22,
    }));
    return { geometry: g, material: m, data: d };
  }, [count]);
  const dummy = useMemo(() => new Object3D(), []);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const w = Math.max(0, 1 - Math.abs(state.stage - 2) * 1.4);
    material.opacity = w * 0.9;
    mesh.visible = w > 0.01;
    if (!mesh.visible) return;
    const step = reduceMotion ? 0 : Math.min(dt, 0.05);
    data.forEach((s, i) => {
      s.z += s.v * step;
      if (s.z > 6) s.z -= 46;
      dummy.position.set(s.x, s.y, s.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} />;
}

// ---------------------------------------------------------------- camera
function CameraRig() {
  const camera = useThree((s) => s.camera);
  const pos = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const s0 = Math.min(Math.floor(state.stage), CAMERAS.length - 2);
    const f = ease(state.stage - s0);
    pos.lerpVectors(CAMERAS[s0].p, CAMERAS[s0 + 1].p, f);
    pos.x += state.px * 0.35;
    pos.y -= state.py * 0.2;
    look.lerpVectors(CAMERAS[s0].look, CAMERAS[s0 + 1].look, f);
    camera.position.copy(pos);
    camera.lookAt(look);
  });
  return null;
}

export function Scene({ fallback }: { fallback: ReactNode }) {
  return (
    <Canvas
      className="scene"
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 38, near: 0.1, far: 100, position: [0, 0, 7.4] }}
      fallback={fallback}
      aria-hidden
    >
      <Director />
      <Aura />
      <Road />
      <Streaks />
      <Triangles />
      <CameraRig />
      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.25} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}

