// Parses + strips the model's [QUICKREPLIES: "a" | "b" | "c"] line.
// The app renders these as tappable chips that prefill the composer.

const QUICK_RE = /\[QUICKREPLIES:\s*([^\]]+)\]/i

export function extractQuickReplies(content: string): string[] {
  const match = content.match(QUICK_RE)
  if (!match) return []
  return match[1]
    .split('|')
    .map((s) => s.trim().replace(/^["'“”]+|["'“”]+$/g, '').trim())
    .filter((s) => s.length > 0 && s.length <= 60)
    .slice(0, 4)
}

export function stripQuickReplies(content: string): string {
  return content.replace(QUICK_RE, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}
