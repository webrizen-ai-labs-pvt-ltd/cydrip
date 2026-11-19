// Scroll → scene state. Sections carry data-stage (where the triangles are) and data-aura
// ("aura,vortex,streak" weights). The scene reads `scrollTarget` every frame; nothing re-renders React.

export type SceneTarget = { stage: number; a: number; v: number; s: number };

type Anchor = SceneTarget & { y: number };

export const scrollTarget: SceneTarget = { stage: 0, a: 1, v: 0, s: 0 };

let anchors: Anchor[] = [];

function measure() {
  const vh = window.innerHeight;
  anchors = [...document.querySelectorAll<HTMLElement>('[data-stage]')].map((el) => {
    const r = el.getBoundingClientRect();
    const [a, v, s] = (el.dataset.aura ?? '1,0,0').split(',').map(Number);
    return { y: r.top + window.scrollY + r.height / 2 - vh / 2, stage: Number(el.dataset.stage), a, v, s };
  });
  update();
}

function update() {
  if (!anchors.length) return;
  const y = window.scrollY;
  let t: SceneTarget = anchors[anchors.length - 1];
  if (y <= anchors[0].y) t = anchors[0];
  else {
    for (let i = 0; i < anchors.length - 1; i++) {
      const p = anchors[i];
      const q = anchors[i + 1];
      if (y < q.y) {
        const f = (y - p.y) / Math.max(q.y - p.y, 1);
        const e = f * f * (3 - 2 * f);
        t = {
          stage: p.stage + (q.stage - p.stage) * e,
          a: p.a + (q.a - p.a) * e,
          v: p.v + (q.v - p.v) * e,
          s: p.s + (q.s - p.s) * e,
        };
        break;
      }
    }
  }
  Object.assign(scrollTarget, { stage: t.stage, a: t.a, v: t.v, s: t.s });
}

/** Start tracking scroll; returns a cleanup function. */
export function trackScroll(): () => void {
  const ro = new ResizeObserver(measure);
  ro.observe(document.body);
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', measure);
  measure();
  return () => {
    ro.disconnect();
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', measure);
  };
}
