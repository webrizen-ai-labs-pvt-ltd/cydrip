// The WebGL stage: an aura shader and seven interlocking triangular chain links that hang,
// lock into the CyDrip mark, drop onto a road, close into a loop and reassemble — driven by scroll.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { type ReactNode, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  type InstancedMesh,
  type Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';

import { auraFragment, auraVertex, linkFragment, linkVertex, roadFragment, roadVertex } from './glsl';
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

const roadWeight = () => Math.max(0, 1 - Math.abs(state.stage - 2) * 1.4);

function Director() {
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    if (!reduceMotion) state.time += d;
    const k = 1 - Math.pow(0.002, d); // frame-rate independent easing toward the scroll target
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
  return useThree((s) => s.size.width < 520);
}

// ---------------------------------------------------------------- aura
function Aura() {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
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
  });
  return (
    <mesh frustumCulled={false} renderOrder={-10} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

// ---------------------------------------------------------------- chain links
function Links() {
  const narrow = useNarrow();
  // A hollow triangular link: a tube swept around the rounded triangle outline.
  const geometry = useMemo(() => {
    const outline = triangleShape()
      .getSpacedPoints(90)
      .slice(0, -1)
      .map((p) => new Vector3(p.x, p.y, 0));
    return new TubeGeometry(new CatmullRomCurve3(outline, true), 180, 0.05, 14, true);
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
              uColor: { value: new Color(hex).multiplyScalar(i === 6 ? 1.5 : 1.2) },
            },
            vertexShader: linkVertex,
            fragmentShader: linkFragment,
          }),
      ),
    [],
  );
  const refs = useRef<(Mesh | null)[]>([]);

  useFrame(() => {
    const s0 = Math.min(Math.floor(state.stage), STAGES.length - 2);
    const f = state.stage - s0;
    const assembled = 1 - Math.min(Math.abs(state.stage - 1), Math.abs(state.stage - 4), 1);
    refs.current.forEach((m, i) => {
      if (!m) return;
      // Each link moves a beat after the one before it, so the chain unspools and re-forms.
      const fi = ease((f - i * 0.05) / (1 - 6 * 0.05));
      const A = STAGES[s0](i, state.time, narrow);
      const B = STAGES[s0 + 1](i, state.time, narrow);
      m.position.lerpVectors(A.p, B.p, fi);
      m.quaternion.slerpQuaternions(A.q, B.q, fi);
      m.scale.setScalar(A.s + (B.s - A.s) * fi);
      const u = materials[i].uniforms;
      u.uTime.value = state.time;
      u.uGlow.value = 0.9 + assembled * 0.35 + Math.sin(state.time * 1.6 + i) * 0.1;
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
    material.uniforms.uOpacity.value = roadWeight();
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, -18]} material={material}>
      <planeGeometry args={[40, 60]} />
    </mesh>
  );
}

function Streaks() {
  const count = 110;
  const ref = useRef<InstancedMesh>(null);
  const { geometry, material, data } = useMemo(() => {
    const g = new PlaneGeometry(0.022, 2.2);
    g.rotateX(-Math.PI / 2);
    const m = new MeshBasicMaterial({
      color: new Color(0.45, 0.9, 3.2),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const d = Array.from({ length: count }, () => ({
      x: (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 4),
      y: -1.1 + Math.random() * 2.6,
      z: -40 + Math.random() * 45,
      v: 14 + Math.random() * 22,
    }));
    return { geometry: g, material: m, data: d };
  }, []);
  const dummy = useMemo(() => new Object3D(), []);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const w = roadWeight();
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
  const aspect = useThree((s) => s.size.width / Math.max(s.size.height, 1));
  const pos = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const s0 = Math.min(Math.floor(state.stage), CAMERAS.length - 2);
    const f = ease(state.stage - s0);
    look.lerpVectors(CAMERAS[s0].look, CAMERAS[s0 + 1].look, f);
    pos.lerpVectors(CAMERAS[s0].p, CAMERAS[s0 + 1].p, f);
    // Pull back in tall frames so the chain still fits side to side.
    const pull = Math.max(1, 1.05 / aspect);
    pos.sub(look).multiplyScalar(pull).add(look);
    pos.x += state.px * 0.3;
    pos.y -= state.py * 0.18;
    camera.position.copy(pos);
    camera.lookAt(look);
  });
  return null;
}

export function Scene({ fallback }: { fallback: ReactNode }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 38, near: 0.1, far: 100, position: [0, 0, 6] }}
      fallback={fallback}
    >
      <Director />
      <Aura />
      <Road />
      <Streaks />
      <Links />
      <CameraRig />
      <EffectComposer>
        <Bloom intensity={1.1} luminanceThreshold={0.5} luminanceSmoothing={0.25} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
