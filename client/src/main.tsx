import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import '@fontsource/noto-sans-jp/400.css'
import '@fontsource/noto-sans-jp/500.css'
import '@fontsource/noto-sans-jp/600.css'
import '@fontsource/noto-sans-jp/700.css'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { initPwaInstallAndServiceWorker } from './services/pwaReminderService'
import { FontManager } from './utils/fontManager'

// Preload font & register lightweight PWA install/reminder service worker (non-blocking)
FontManager.preloadFont();
initPwaInstallAndServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </Provider>
  </StrictMode>,
)
