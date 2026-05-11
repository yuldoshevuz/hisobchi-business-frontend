import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import './i18n';
import { bootAuth } from './lib/boot-auth';
import { applyTelegramTheme, initTelegramWebApp } from './lib/telegram';
import { AppProviders } from './providers';
import { router } from './router';

initTelegramWebApp();
applyTelegramTheme();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

const root = createRoot(rootElement);

// Show a minimal placeholder while we exchange Telegram initData for a JWT.
// The Telegram Mini App splash is still showing in this window so users see
// a continuous loading state.
root.render(
  <div
    style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  />,
);

void bootAuth().finally(() => {
  root.render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
});
