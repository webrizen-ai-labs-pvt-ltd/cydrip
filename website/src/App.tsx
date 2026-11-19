import { lazy, Suspense, useEffect } from 'react';

import { Mark } from './components/Mark';
import { trackScroll } from './scene/scroll';

// three.js is big; the page text renders first and the scene streams in behind it.
const Scene = lazy(() => import('./scene/Scene').then((m) => ({ default: m.Scene })));

const REPO = 'https://github.com/webrizen-ai-labs-pvt-ltd/cydrip';
const DOWNLOAD = `${REPO}/releases/latest`;

const SCREENSHOTS = [
  ['1-speed', 'Speed you can read at a glance'],
  ['2-streets', 'Real streets, in 3D'],
  ['3-screen-off', 'Keeps recording with the screen off'],
  ['4-mapped', 'Every ride, mapped'],
  ['5-week', 'Know your week'],
  ['6-offline', 'Works offline too'],
] as const;

const STEPS = [
  {
    title: 'Download the APK',
    body: (
      <>
        Get the latest version from <a href={DOWNLOAD}>GitHub Releases</a> on your Android phone.
      </>
    ),
  },
  { title: 'Open it', body: 'Android asks you to allow installs from your browser the first time. Allow it, then tap Install.' },
  {
    title: 'Allow location while using the app',
    body: "That's all CyDrip needs. If your phone closes apps in the background, set its battery use to Unrestricted.",
  },
];

/** Shown instead of the WebGL scene when the browser can't run it. */
function StillAura() {
  return (
    <div className="fallback">
      <Mark className="fallback-mark" />
    </div>
  );
}

function DownloadButton() {
  return (
    <a className="btn btn-primary" href={DOWNLOAD}>
      Download for Android
    </a>
  );
}

export default function App() {
  useEffect(() => trackScroll(), []);

  return (
    <>
      <Suspense fallback={<StillAura />}>
        <Scene fallback={<StillAura />} />
      </Suspense>

      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className="nav">
        <a className="brand" href="/" aria-label="CyDrip home">
          <Mark className="brand-mark" />
          <span>CyDrip</span>
        </a>
        <nav aria-label="Main">
          <a href="#ride">Ride</a>
          <a href="#run">Run</a>
          <a href="#install">Install</a>
          <a href={REPO}>GitHub</a>
        </nav>
      </header>

      <main id="main">
        {/* Stage 0: seven triangles orbit the aura. */}
        <section className="panel hero" data-stage="0" data-aura="1,0,0">
          <div className="hero-copy">
            <h1>Your handlebar, as an instrument cluster.</h1>
            <p className="lede">
              A free, open-source ride and run tracker for Android. Big live numbers, a 3D map of the streets around
              you, and GPS that keeps recording with the screen off.
            </p>
            <div className="cta">
              <DownloadButton />
              <a className="btn btn-quiet" href={REPO}>
                View the source
              </a>
            </div>
            <p className="fine">Free APK, no account. Version 1.1.0, MIT licence.</p>
          </div>
          <p className="scroll-hint" aria-hidden="true">
            Scroll to assemble
          </p>
        </section>

        {/* Stage 1: the puzzle locks into the mark. */}
        <section className="panel seven" data-stage="1" data-aura="1,0,0.15">
          <p className="seven-line">
            <span>Six triangles make the mark.</span>
            <span>The seventh is you.</span>
          </p>
        </section>

        {/* Stage 2: the mark drops onto the road and you ride the lane. */}
        <section id="ride" className="panel ride" data-stage="2" data-aura="0.15,0,1">
          <div className="copy">
            <h2>Speed you can read at 30&nbsp;km/h.</h2>
            <p>
              Live speed, distance, time, climb and calories, sized for a glance from the saddle. A tilted 3D map
              follows you through real streets, and finishing takes a press-and-hold, so a pothole can't end your ride.
            </p>
            <ul className="ticks">
              <li>Keeps recording with the screen off</li>
              <li>Auto-pause at lights</li>
              <li>Offline grid view when you're out of data</li>
            </ul>
          </div>
          <figure className="phone">
            <img
              src="/img/ride.webp"
              width={720}
              height={1558}
              alt="CyDrip ride screen with a 3D street map and 27.6 km/h in large type."
            />
          </figure>
        </section>

        {/* Still on the road; the aura turns into an ember vortex. */}
        <section id="run" className="panel run" data-stage="2" data-aura="0,1,0.1">
          <div className="copy right">
            <h2>Then go for a run.</h2>
            <p>
              Pick Run and the big number becomes your pace per kilometre. Every kilometre gets its split, and the
              screen sleeps so your phone can stay in your pocket while GPS keeps going.
            </p>
          </div>
        </section>

        {/* Stage 3: everything reassembles. */}
        <section className="panel snap" data-stage="3" data-aura="1,0.25,0">
          <div className="copy center">
            <h2>Snap. The numbers speak.</h2>
            <p>
              After every ride or run, CyDrip draws your route with your distance, time and pace. No captions. Four
              styles, including a transparent sticker for your own photos.
            </p>
          </div>
        </section>

        <section className="glass gallery" data-stage="3" data-aura="0.6,0,0" aria-label="Screenshots">
          <div className="strip">
            {SCREENSHOTS.map(([file, alt]) => (
              <img key={file} src={`/img/${file}.webp`} width={540} height={960} loading="lazy" alt={alt} />
            ))}
          </div>
        </section>

        <section className="glass privacy" data-stage="3" data-aura="0.6,0,0">
          <p className="statement">Your rides never leave your phone.</p>
          <ul className="facts">
            <li>
              <strong>No account.</strong> Open the app and ride.
            </li>
            <li>
              <strong>No analytics.</strong> Nothing is collected about you.
            </li>
            <li>
              <strong>Open source.</strong> Every line is on GitHub, MIT licensed.
            </li>
          </ul>
        </section>

        <section id="install" className="glass install" data-stage="3" data-aura="1,0,0">
          <h2>Install</h2>
          <ol className="steps">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="step-n" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <DownloadButton />
        </section>
      </main>

      <footer className="glass footer">
        <div className="footer-brand">
          <Mark className="brand-mark" />
          <span>CyDrip by Webrizen AI Labs</span>
        </div>
        <nav aria-label="Footer">
          <a href={REPO}>GitHub</a>
          <a href={`${REPO}/blob/main/LICENSE`}>MIT licence</a>
          <a href={`${REPO}/issues`}>Report a bug</a>
        </nav>
        <p className="credit">
          Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, tiles by{' '}
          <a href="https://openfreemap.org">OpenFreeMap</a>.
        </p>
      </footer>
    </>
  );
}
