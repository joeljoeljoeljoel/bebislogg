import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/tokens.css';
import './theme/base.css';
import { App } from './App';
import { isStandalone } from './platform';
import { captureInstallPrompt } from './pwa/install';
import { keepUpright, preventZoom } from './screen';
import { StoreProvider, loadInitialData } from './state/store';
import { UIProvider } from './state/ui';

async function start() {
  captureInstallPrompt();
  preventZoom();
  keepUpright();
  if (import.meta.env.DEV) {
    const { applyDevParams } = await import('./dev/devParams');
    await applyDevParams();
  }
  const initial = await loadInitialData();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <StoreProvider initial={initial}>
        <UIProvider>
          <App />
        </UIProvider>
      </StoreProvider>
    </StrictMode>,
  );
  // Ask the browser not to evict the data. Only when installed: in a browser tab
  // some browsers would ask the user.
  if (isStandalone()) void navigator.storage?.persist?.();
}

void start();
