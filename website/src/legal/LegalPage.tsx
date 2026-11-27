import type { ReactNode } from 'react';

import { Bar, Footer } from '../components/Chrome';

export type LegalSection = { id: string; title: string; body: ReactNode };

export const UPDATED = '28 November 2026';

/** Shared layout for the privacy policy and terms: contents on the left, text on the right. */
export function LegalPage({
  kicker,
  title,
  summary,
  sections,
}: {
  kicker: string;
  title: string;
  summary: [string, string][];
  sections: LegalSection[];
}) {
  return (
    <div className="page">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Bar />
      <main id="main" className="legal">
        <header className="legal-head">
          <div className="chapter-head">
            <span>{kicker}</span>
            <span>Last updated {UPDATED}</span>
          </div>
          <h1>{title}</h1>
          <dl className="specs legal-summary">
            {summary.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="legal-body">
          <nav className="legal-toc" aria-label="Contents">
            <ol>
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="legal-text">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id}>
                <h2>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h2>
                {s.body}
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
