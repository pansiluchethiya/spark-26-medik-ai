import { apiHeaders, apiUrl } from './api'

export function sanitizeTextForSpeech(markdown: string): string {
  if (!markdown) return ''
  return markdown
    .replace(/^##\s*What to do/gim, 'Here are the recommended care steps:')
    .replace(/^##\s*When to seek urgent care/gim, 'Important safety warning. When to seek urgent care:')
    .replace(/^##\s*Sources/gim, 'Verified medical sources:')
    .replace(/^#+\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[`*_~]/g, '')
    .replace(/^\s*[-*+]\s+/gm, ', ')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type TtsVoiceId = string
export type TtsEngine = 'browser' | 'server'

let activeAudio: HTMLAudioElement | null = null

export async function speakText(options: {
  rawMarkdown: string
  voice?: TtsVoiceId
  style?: string
  rate?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
  onEngine?: (e: TtsEngine) => void
}) {
  stopSpeech()
  const spoken = sanitizeTextForSpeech(options.rawMarkdown)
  if (!spoken) { options.onError?.(); return }
  const rate = options.rate ?? 1.0

  // Try server TTS if available (optional, not required for Pages)
  try {
    const res = await fetch(apiUrl('/api/v1/ai/tts'), {
      method: 'POST', headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text: spoken, voice: options.voice ?? 'auto' }),
    })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      activeAudio = audio
      audio.playbackRate = rate
      audio.onplay = () => { options.onEngine?.('server'); options.onStart?.() }
      audio.onended = () => { options.onEnd?.(); activeAudio = null }
      audio.onerror = () => fallback()
      await audio.play()
      return
    }
  } catch { /* fallback */ }

  fallback()
  function fallback() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { options.onError?.(); return }
    const utter = new SpeechSynthesisUtterance(spoken)
    utter.rate = rate
    utter.pitch = 1.0
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.name === options.voice) ?? voices.find(v => v.lang.startsWith('en')) ?? voices[0]
    if (preferred) utter.voice = preferred
    utter.onstart = () => { options.onEngine?.('browser'); options.onStart?.() }
    utter.onend = () => options.onEnd?.()
    utter.onerror = () => options.onError?.()
    window.speechSynthesis.speak(utter)
  }
}

export function stopSpeech() {
  if (activeAudio) { activeAudio.pause(); activeAudio = null }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}

export function getNaturalVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'))
}
