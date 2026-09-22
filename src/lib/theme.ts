import { preferencesKey } from './store/keys'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export function systemTheme(): ResolvedTheme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? systemTheme() : mode
}

export function readThemeMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(preferencesKey)
    if (!raw) return 'system'
    const mode = (JSON.parse(raw) as { theme?: unknown }).theme
    return mode === 'light' || mode === 'dark' || mode === 'system' ? mode : 'system'
  } catch {
    return 'system'
  }
}

let systemListener: (() => void) | null = null

// Applies the theme and, in system mode, follows device changes live.
export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', resolveTheme(mode))
  if (systemListener) {
    systemListener()
    systemListener = null
  }
  if (mode === 'system') {
    try {
      const query = window.matchMedia('(prefers-color-scheme: dark)')
      const onChange = () => document.documentElement.setAttribute('data-theme', resolveTheme('system'))
      query.addEventListener('change', onChange)
      systemListener = () => query.removeEventListener('change', onChange)
    } catch { /* older browsers */ }
  }
}
