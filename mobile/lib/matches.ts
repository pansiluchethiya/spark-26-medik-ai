// Derives the "possible matches" meter from an assistant answer.
// The AI lists differentials in order, so the meter reflects that ORDER
// (first = strongest match). Illustrative ordering bars — explicitly
// NOT clinical probabilities.
import { normalizeSections, splitNormalized } from './sections'

export type MatchCandidate = { label: string; score: number }

const BASE_SCORES = [74, 61, 48]

function hashJitter(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0
  return (Math.abs(h) % 7) - 3 // -3..+3, deterministic per label
}

function cleanLabel(raw: string): string {
  return raw
    .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold** → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/^\s*[-*+•]\s*/, '')
    .split(/–|—|:|\(/)[0] // name = text before dash/colon/paren
    .replace(/^(such as|like|e\.g\.?|including)\s+/i, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 64)
}

const SKIP = /(^based on your description|^this information is educational|^because breathing|seek (prompt|immediate)|clinician|urgent-care|\?$)/i

export function extractMatches(content: string): MatchCandidate[] {
  const blocks = splitNormalized(normalizeSections(content))
  const block = blocks.find((b) => b.kind === 'assessment') ?? blocks.find((b) => b.kind === 'body')
  if (!block) return []
  const out: MatchCandidate[] = []
  for (const line of block.body.split('\n')) {
    if (out.length >= 3) break
    const trimmed = line.trim()
    if (!/^\s*[-*+•]/.test(trimmed) && !/^\d+\./.test(trimmed)) continue
    const label = cleanLabel(trimmed.replace(/^\d+\.\s*/, ''))
    if (label.length < 3 || SKIP.test(label)) continue
    if (out.some((c) => c.label.toLowerCase() === label.toLowerCase())) continue
    const score = Math.min(94, Math.max(15, BASE_SCORES[out.length] + hashJitter(label)))
    out.push({ label, score })
  }
  return out
}
