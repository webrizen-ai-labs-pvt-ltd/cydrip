// Small product vignettes for the "Inside the app" grid — drawn in HTML/SVG, not screenshots.
import type { ReactNode } from 'react';

import { Mark } from './Mark';

/** The ride dashboard, as it sits on the handlebar. */
export function DashWidget() {
  return (
    <div className="dash">
      <div className="dash-top">
        <span className="rec">
          <i /> Recording
        </span>
        <span>GPS ±4 m</span>
      </div>
      <div className="dash-speed">
        <span className="dash-num">27.6</span>
        <span className="dash-unit">km/h</span>
      </div>
      <div className="dash-row">
        <div>
          <b>12.84</b>
          <small>km</small>
          <em>Distance</em>
        </div>
        <div>
          <b>42:18</b>
          <em>Ride time</em>
        </div>
      </div>
      <div className="dash-grid">
        {[
          ['23.3', 'Avg km/h'],
          ['38.2', 'Max km/h'],
          ['84', 'Climb m'],
          ['312', 'kcal'],
        ].map(([v, l]) => (
          <div key={l}>
            <b>{v}</b>
            <em>{l}</em>
          </div>
        ))}
      </div>
      <div className="dash-hold">Hold to finish</div>
    </div>
  );
}

function Ring({ value, color, children }: { value: number; color: string; children: ReactNode }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#2a2d33" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`}
          transform="rotate(-90 32 32)"
        />
        <g transform="translate(32 32)" stroke="#f4f5f6" fill="none" strokeWidth="1.8" strokeLinecap="round">
          {children}
        </g>
      </svg>
      <span>{value}%</span>
    </div>
  );
}

/** A week at a glance: progress rings in a black pill. */
export function RingsWidget() {
  return (
    <div className="rings" role="img" aria-label="Weekly goals: rides 73 percent, runs 21 percent, climbing 52 percent">
      <Ring value={73} color="#3d8bff">
        <circle cx="-6" cy="3" r="4" />
        <circle cx="6" cy="3" r="4" />
        <path d="M-6 3 -2 -4h6l2 7M-2 -4 0 3" />
      </Ring>
      <Ring value={21} color="#ff6a2a">
        <path d="M-7 5 7 0 -7 -5z" />
      </Ring>
      <Ring value={52} color="#f4f5f6">
        <path d="M-8 6 -2 -4 2 2 4 -1 8 6z" />
      </Ring>
    </div>
  );
}

const ROUTE =
  'M24 150 C 40 120, 60 128, 70 104 S 64 58, 96 50 S 150 70, 160 46 S 196 24, 214 40 S 230 92, 206 112 S 150 126, 140 150';

/** The route on a dark street grid. */
export function MapWidget() {
  return (
    <svg className="map" viewBox="0 0 240 180" role="img" aria-label="A ride route on a dark street map">
      <defs>
        <pattern id="streets" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
          <path d="M0 12H24M12 0V24" stroke="#1c1f25" strokeWidth="2" />
        </pattern>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <rect width="240" height="180" fill="#0a0b0d" />
      <rect width="240" height="180" fill="url(#streets)" />
      <rect x="132" y="70" width="38" height="26" rx="3" fill="#15181d" />
      <rect x="40" y="30" width="30" height="40" rx="3" fill="#15181d" />
      <path d={ROUTE} fill="none" stroke="#3d8bff" strokeWidth="8" opacity="0.5" filter="url(#glow)" />
      <path d={ROUTE} fill="none" stroke="#3d8bff" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="24" cy="150" r="4.5" fill="#f4f5f6" />
      <path d="M140 141 148 155 132 155z" fill="#f4f5f6" />
    </svg>
  );
}

/** A Snap card: route plus numbers, nothing else. */
export function SnapWidget() {
  return (
    <div className="snapcard">
      <svg viewBox="0 0 240 140" aria-hidden="true">
        <path
          d="M30 110 C 50 70, 80 90, 96 60 S 130 20, 160 40 S 210 60, 200 96 S 150 120, 120 104"
          fill="none"
          stroke="#0c0d10"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <div className="snap-nums">
        <b>
          12.84<small>km</small>
        </b>
        <div>
          <span>42:18</span>
          <span>
            4:52<small>/km</small>
          </span>
          <span>
            84<small>m</small>
          </span>
        </div>
      </div>
      <div className="snap-foot">
        <span>19 Nov 2026</span>
        <Mark className="snap-mark" />
      </div>
    </div>
  );
}
