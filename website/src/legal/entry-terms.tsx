import '../styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Terms } from './Terms';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Terms />
  </StrictMode>,
);
