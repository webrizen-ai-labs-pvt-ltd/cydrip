// Top bar, footer and the download pill, shared by the landing page and the legal pages.
import { DOWNLOAD, ISSUES, REPO, WEBRIZEN } from '../site';
import { Mark } from './Mark';

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M10 3v10m0 0-4-4m4 4 4-4M4 16h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Download({ label = 'Download for Android' }: { label?: string }) {
  return (
    <a className="pill pill-dark" href={DOWNLOAD}>
      {label}
      <DownloadIcon />
    </a>
  );
}

/** `onHome` keeps section links as in-page anchors; elsewhere they point back to the landing page. */
export function Bar({ onHome = false }: { onHome?: boolean }) {
  const at = (hash: string) => (onHome ? hash : `/${hash}`);
  return (
    <header className="bar">
      <a className="brand" href="/" aria-label="CyDrip home">
        <Mark className="brand-mark" />
        <span>CyDrip</span>
      </a>
      <nav aria-label="Main">
        <a href={at('#ride')}>Ride</a>
        <a href={at('#run')}>Run</a>
        <a href={at('#inside')}>Inside</a>
        <a href={at('#install')}>Install</a>
        <a href={REPO}>GitHub</a>
      </nav>
      <Download label="Download" />
    </header>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot-row">
        <a className="brand" href="/" aria-label="CyDrip home">
          <Mark className="brand-mark" />
          <span>CyDrip</span>
        </a>
        <nav aria-label="Footer">
          <a href={REPO}>GitHub</a>
          <a href={ISSUES}>Report a bug</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href={`${REPO}/blob/main/LICENSE`}>MIT licence</a>
        </nav>
      </div>
      <div className="foot-row foot-small">
        <span>
          Built and maintained by <a href={WEBRIZEN}>Webrizen AI Labs</a>
        </span>
        <span>
          Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, tiles by{' '}
          <a href="https://openfreemap.org">OpenFreeMap</a>
        </span>
      </div>
    </footer>
  );
}
