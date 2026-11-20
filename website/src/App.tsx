import { useEffect, useState } from 'react';

import { Bar, Download, Footer } from './components/Chrome';
import { CHAPTERS, Stage } from './components/Stage';
import { DashWidget, MapWidget, RingsWidget, SnapWidget } from './components/Widgets';
import { trackScroll } from './scene/scroll';
import { DOWNLOAD, REPO } from './site';


const SCREENSHOTS = [
  ['1-speed', 'Speed you can read at a glance'],
  ['2-streets', 'Real streets, in 3D'],
  ['3-screen-off', 'Keeps recording with the screen off'],
  ['4-mapped', 'Every ride, mapped'],
  ['5-week', 'Know your week'],
  ['6-offline', 'Works offline too'],
] as const;

/** Label on the left, value on the right, hairline between rows. */
function Specs({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="specs">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChapterHead({ index }: { index: number }) {
  return (
    <div className="chapter-head">
      <span>
        {String(index + 1).padStart(2, '0')} / {String(CHAPTERS.length).padStart(2, '0')}
      </span>
      <span>{CHAPTERS[index]}</span>
    </div>
  );
}

/** Which chapter sits in the middle of the viewport, for the stage's counter. */
function useActiveChapter() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.chapter));
        });
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    document.querySelectorAll('[data-chapter]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return active;
}

export default function App() {
  useEffect(() => trackScroll(), []);
  const chapter = useActiveChapter();

  return (
    <div className="page">
      <a className="skip" href="#main">
        Skip to content
      </a>

      <Bar onHome />

      <main id="main">
        {/* The story: chapters on the left, the live scene framed on the right. */}
        <section className="story">
          <div className="chapters">
            <article className="chapter chapter-hero" data-chapter="0" data-stage="0" data-aura="1,0,0">
              <ChapterHead index={0} />
              <h1>Your handlebar, as an instrument cluster.</h1>
              <p className="lede">
                CyDrip is a free, open-source ride and run tracker for Android. Big live numbers, a 3D map of the
                streets around you, and GPS that keeps recording with the screen off.
              </p>
              <div className="actions">
                <Download />
                <a className="pill pill-light" href={REPO}>
                  View the source
                </a>
              </div>
              <div className="meta">
                <div>
                  <small>Price</small>
                  <b>Free</b>
                </div>
                <div>
                  <small>Account</small>
                  <b>None</b>
                </div>
                <div>
                  <small>Licence</small>
                  <b>MIT</b>
                </div>
                <div>
                  <small>Version</small>
                  <b>1.1.2</b>
                </div>
              </div>
            </article>

            <article className="chapter" data-chapter="1" data-stage="1" data-aura="1,0,0.15">
              <ChapterHead index={1} />
              <h2>Six triangles make the mark. The seventh is you.</h2>
              <p>
                Seven links, one chain. As you scroll they lock together into the CyDrip mark, with the seventh in the
                middle. That one is the arrow you'll see on the map when you ride.
              </p>
            </article>

            <article id="ride" className="chapter" data-chapter="2" data-stage="2" data-aura="0.15,0,1">
              <ChapterHead index={2} />
              <h2>Speed you can read at 30&nbsp;km/h.</h2>
              <p>
                Live speed, distance, time, climb and calories, sized for a glance from the saddle. A tilted map follows
                you through real streets.
              </p>
              <Specs
                rows={[
                  ['Map', '3D streets from OpenStreetMap'],
                  ['Recording', 'Carries on with the screen off'],
                  ['Stops', 'Auto-pause at lights'],
                  ['Finish', 'Press and hold'],
                ]}
              />
            </article>

            <article id="run" className="chapter" data-chapter="3" data-stage="3" data-aura="0,1,0.1">
              <ChapterHead index={3} />
              <h2>Then go for a run.</h2>
              <p>Pick Run before you start. The big number becomes your pace, and the phone can stay in your pocket.</p>
              <Specs
                rows={[
                  ['Pace', 'Minutes per kilometre, smoothed'],
                  ['Splits', 'Every kilometre'],
                  ['Screen', 'Sleeps while GPS records'],
                ]}
              />
            </article>

            <article className="chapter" data-chapter="4" data-stage="4" data-aura="1,0.25,0">
              <ChapterHead index={4} />
              <h2>Snap. The numbers speak.</h2>
              <p>
                After every ride or run, CyDrip draws your route with your distance, time and pace. No captions, no
                slogans.
              </p>
              <ul className="chips" aria-label="Snap styles">
                {['Line', 'Poster', 'Floor', 'Sticker'].map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </article>
          </div>

          <div className="stage-col">
            <div className="stage-sticky">
              <Stage chapter={chapter} />
            </div>
          </div>
        </section>

        {/* Product vignettes. */}
        <section id="inside" className="block">
          <div className="block-head">
            <span>Inside the app</span>
            <span>Android, version 1.1.2</span>
          </div>
          <div className="bento">
            <figure className="tile tile-dash">
              <DashWidget />
              <figcaption>
                <b>The dashboard</b>
                <span>Everything you need mid-ride, nothing you don't.</span>
              </figcaption>
            </figure>
            <figure className="tile tile-rings">
              <RingsWidget />
              <figcaption>
                <b>Your week</b>
                <span>This week against last, bests and your streak.</span>
              </figcaption>
            </figure>
            <figure className="tile tile-map">
              <MapWidget />
              <figcaption>
                <b>Every ride, mapped</b>
                <span>Route, speed and elevation for each one.</span>
              </figcaption>
            </figure>
            <figure className="tile tile-snap">
              <SnapWidget />
              <figcaption>
                <b>Snap</b>
                <span>Four styles, story or square.</span>
              </figcaption>
            </figure>
            <div className="tile tile-privacy">
              <p className="privacy-title">Your rides never leave your phone.</p>
              <ul>
                <li>
                  <b>No account</b>
                  <span>Open the app and ride.</span>
                </li>
                <li>
                  <b>No analytics</b>
                  <span>Nothing is collected about you.</span>
                </li>
                <li>
                  <b>Open source</b>
                  <span>Every line is on GitHub.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="block" aria-label="Screenshots">
          <div className="block-head">
            <span>Screens</span>
            <span>Swipe</span>
          </div>
          <div className="strip">
            {SCREENSHOTS.map(([file, alt]) => (
              <img key={file} src={`/img/${file}.webp`} width={540} height={960} loading="lazy" alt={alt} />
            ))}
          </div>
        </section>

        <section id="install" className="block">
          <div className="block-head">
            <span>Install</span>
            <span>Three steps</span>
          </div>
          <ol className="steps">
            <li>
              <small>Step 01</small>
              <h3>Download the APK</h3>
              <p>
                Get the latest version from <a href={DOWNLOAD}>GitHub Releases</a> on your Android phone.
              </p>
            </li>
            <li>
              <small>Step 02</small>
              <h3>Open it</h3>
              <p>Android asks you to allow installs from your browser the first time. Allow it, then tap Install.</p>
            </li>
            <li>
              <small>Step 03</small>
              <h3>Allow location</h3>
              <p>While using the app is all CyDrip needs. If your phone closes apps, set battery use to Unrestricted.</p>
            </li>
          </ol>
          <div className="install-cta">
            <Download />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
