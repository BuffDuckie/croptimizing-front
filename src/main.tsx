import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles/index.css';
import './i18n';
import App from './App';
import { realDataset } from './api/realData';

// Start fetching real data (if any) before the first plan request needs it.
void realDataset();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
