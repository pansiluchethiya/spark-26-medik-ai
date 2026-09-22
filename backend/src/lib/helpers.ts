export function cleanText(value: string, limit: number) {
  return value.replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function htmlToText(html: string) {
  return cleanText(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'), 7000)
}

export function safePublicUrl(value: string) {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (url.port && !['80', '443', '8080'].includes(url.port)) return null

    const host = url.hostname.toLowerCase()
    // Localhost and loopback
    if (host === 'localhost' || host === '::1' || host.startsWith('127.')) return null
    // RFC 1918 Private IPv4
    if (host.startsWith('10.') || host.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return null
    // Link-local & Cloud Metadata
    if (host.startsWith('169.254.') || host === 'metadata.google.internal' || host.endsWith('.metadata.goog')) return null
    // Private/internal domain extensions
    if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan') || host.endsWith('.corp')) return null
    // IPv6 private/link-local
    if (host.startsWith('fe80:') || host.startsWith('fc00:') || host.startsWith('fd00:') || host.startsWith('ff00:')) return null

    return url
  } catch {
    return null
  }
}
