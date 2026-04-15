import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Unregister any stale service workers that could cause duplicate-React issues (dev only)
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(
        registrations.map((registration) =>
          registration.unregister().catch((error) => {
            console.error('Failed to unregister service worker:', error);
            return false;
          })
        )
      )
    )
    .catch((error) => {
      console.error('Failed to get service worker registrations:', error);
    });
}

createRoot(document.getElementById('root')!).render(
  !import.meta.env.DEV ? (
    <StrictMode>
      <App />
    </StrictMode>
  ) : <App />,
)
