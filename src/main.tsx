import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './styles/utilities.css'
import { applyThemeMode, readThemeMode } from './lib/theme'
import App from './App.tsx'

// Sync with the device theme before first paint (default: system).
applyThemeMode(readThemeMode())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
