import { X, Sun, Moon, Monitor, Volume2 } from 'lucide-react'
import type { LocalPreferences } from '../types/app'
import { getNaturalVoices } from '../lib/tts'
import { useEffect, useState } from 'react'

export function SettingsModal({
  preferences, onPreferencesChange, onClose,
}: {
  preferences: LocalPreferences
  onPreferencesChange: (p: LocalPreferences) => void
  onClose: () => void
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    const load = () => setVoices(getNaturalVoices())
    load()
    window.speechSynthesis?.addEventListener?.('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', load)
  }, [])

  const theme = preferences.theme ?? 'system'
  const setTheme = (t: 'light' | 'dark' | 'system') => onPreferencesChange({ ...preferences, theme: t })
  const themeBtn = (active: boolean) => `flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold ${active ? 'border-accent bg-accent text-white dark:bg-[#257d6e] dark:text-white' : 'border-line bg-card dark:border-[#2c4039] dark:bg-[#192622]'}`

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <section className="w-full max-w-[560px] rounded-2xl border border-line bg-card shadow-xl dark:border-[#2c4039] dark:bg-[#192622]">
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-4 dark:border-[#22332c]">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-accent dark:text-accent-bright">Medik settings</p>
            <h2 className="text-[16px] font-extrabold">Preferences</h2>
          </div>
          <button type="button" aria-label="Close settings" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-card-subtle dark:border-[#2c4039] dark:bg-[#21302b]"><X size={14} /></button>
        </div>

        <div className="grid gap-4 px-5 py-4">
          <label className="flex items-start justify-between gap-4 rounded-xl border border-line bg-card-subtle px-3.5 py-3 dark:border-[#2c4039] dark:bg-[#21302b]">
            <span>
              <strong className="flex items-center gap-1.5 text-sm"><Volume2 size={14} /> Auto-read responses</strong>
              <small className="text-xs text-muted dark:text-[#9eb5ae]">Speak assistant answers aloud after generation.</small>
            </span>
            <input type="checkbox" checked={Boolean(preferences.autoReadResponses)} onChange={e => onPreferencesChange({ ...preferences, autoReadResponses: e.target.checked })} className="mt-1 accent-[var(--color-accent)]" />
          </label>

          <div className="rounded-xl border border-line bg-card-subtle p-3.5 dark:border-[#2c4039] dark:bg-[#21302b]">
            <p className="text-xs font-bold">Voice</p>
            <select value={preferences.ttsVoice ?? 'auto'} onChange={e => onPreferencesChange({ ...preferences, ttsVoice: e.target.value })} className="mt-1.5 w-full rounded-lg border border-line bg-card px-2.5 py-2 text-sm dark:border-[#2c4039] dark:bg-[#192622]">
              <option value="auto">Auto (best English)</option>
              {voices.slice(0, 20).map(v => <option key={v.name} value={v.name}>{v.name} — {v.lang}</option>)}
            </select>
          </div>

          <div className="rounded-xl border border-line bg-card-subtle p-3.5 dark:border-[#2c4039] dark:bg-[#21302b]">
            <p className="text-xs font-bold">Theme</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setTheme('system')} className={themeBtn(theme==='system')}><Monitor size={14} /> Auto</button>
              <button type="button" onClick={() => setTheme('light')} className={themeBtn(theme==='light')}><Sun size={14} /> Light</button>
              <button type="button" onClick={() => setTheme('dark')} className={themeBtn(theme==='dark')}><Moon size={14} /> Dark</button>
            </div>
            <p className="mt-2 text-[11px] text-faint">Web search is always on — Medik checks current medical guidance for every question.</p>
          </div>
        </div>

        <p className="border-t border-line-soft px-5 py-3 text-center text-[11px] text-faint dark:border-[#22332c]">Stored locally. No account required. For deploy, `dist/` is Cloudflare Pages ready.</p>
      </section>
    </div>
  )
}
