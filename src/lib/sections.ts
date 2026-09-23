// Shared tolerant parser for [SECTION:...] tags.
// Models emit variants: `[SECTION: urgent]` (space), `**[SECTION:x]**`
// (bold), inline mid-line tags. Normalize everything to canonical
// line-tags, then split — so all sections always parse.
//
// The backend may emit any of ~22 catalog tags (assessment, urgent,
// selfcare, sources, causes, symptoms, diagnosis, tests, treatment,
// prevention, riskfactors, complications, prognosis, lifestyle, diet,
// firstaid, emergency, children, elderly, faq, glossary, contacts…).
// Unknown tags still split and render as generic cards.

export type SectionKind = 'assessment' | 'urgent' | 'selfcare' | 'sources'

export const SECTION_KINDS: SectionKind[] = ['assessment', 'urgent', 'selfcare', 'sources']

export function normalizeSections(content: string): string {
  return content
    .replace(/\*\*\[SECTION:\s*([a-z]+)\s*\]\*\*/gi, '\n[SECTION:$1]\n')
    .replace(/\[SECTION:\s*([a-z]+)\s*\]/gi, '\n[SECTION:$1]\n')
}

export function splitNormalized(normalized: string): Array<{ kind: string; body: string }> {
  const parts = normalized.split(/^\[SECTION:([a-z]+)\]\s*$/gim)
  // parts: [prelude, kind1, body1, kind2, body2, ...]
  const out: Array<{ kind: string; body: string }> = []
  const prelude = (parts[0] ?? '').trim()
  if (prelude) out.push({ kind: 'body', body: prelude })
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const kind = (parts[i] ?? '').trim().toLowerCase()
    const body = (parts[i + 1] ?? '').trim()
    if (body) out.push({ kind, body })
  }
  return out
}

// Strip any leftover markers so raw tags never display to users.
export function stripSectionTags(content: string): string {
  return normalizeSections(content).replace(/^\[SECTION:[a-z]+\]\s*$/gim, '').trim()
}
