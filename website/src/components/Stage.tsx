import { lazy, Suspense } from 'react';

import { Mark } from './Mark';

// three.js is big; the page renders first and the scene streams into the window.
const Scene = lazy(() => import('../scene/Scene').then((m) => ({ default: m.Scene })));

export const CHAPTERS = ['The chain', 'The mark', 'Ride', 'Run', 'Snap'];

function StillAura() {
  return (
    <div className="stage-still">
      <Mark className="stage-still-mark" />
    </div>
  );
}

/** The framed window the 3D scene lives in, with its own small instrument chrome. */
export function Stage({ chapter }: { chapter: number }) {
  return (
    <div className="stage-bezel">
      <div className="stage-window">
        <Suspense fallback={<StillAura />}>
          <Scene fallback={<StillAura />} />
        </Suspense>

        <div className="stage-chrome" aria-hidden="true">
          <div className="chrome-top">
            <span className="chrome-brand">
              <Mark className="chrome-mark" />
              Live scene
            </span>
            <span className="chrome-count">
              {String(chapter + 1).padStart(2, '0')}
              <span className="chrome-of"> / {String(CHAPTERS.length).padStart(2, '0')}</span>
            </span>
          </div>
          <div className="chrome-bottom">
            <span className="chrome-title">{CHAPTERS[chapter]}</span>
            <span className="chrome-track">
              {CHAPTERS.map((c, i) => (
                <i key={c} className={i <= chapter ? 'on' : ''} />
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
