import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/splash.css'
import './styles/welcome.css'
import './styles/login.css'
import './styles/documents.css'

// ─── Offline-First — initialise le moteur de synchronisation ────────────────
import { initAutoSync } from './lib/offline/syncEngine'
initAutoSync()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
