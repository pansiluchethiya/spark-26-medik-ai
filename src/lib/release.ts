// Resolves the latest Android APK published on GitHub Releases.
// Falls back to null (callers link to the releases page instead).

export type ReleaseApk = {
  tag: string
  version: string
  url: string
  sizeMB: number
}

const RELEASES_API = 'https://api.github.com/repos/pansiluchethiya/spark-26-medik-ai/releases'

export async function getLatestApk(signal?: AbortSignal): Promise<ReleaseApk | null> {
  try {
    const res = await fetch(`${RELEASES_API}/latest`, { signal })
    if (!res.ok) return null
    const data = (await res.json()) as {
      tag_name?: string
      assets?: Array<{ name?: string; browser_download_url?: string; size?: number }>
    }
    const apk = data.assets?.find((a) => a.name?.endsWith('.apk') && a.browser_download_url)
    if (!apk?.browser_download_url) return null
    const tag = data.tag_name ?? ''
    return {
      tag,
      version: tag.replace(/^mobile-v/, '') || tag,
      url: apk.browser_download_url,
      sizeMB: Math.round(((apk.size ?? 0) / 1048576) * 10) / 10,
    }
  } catch {
    return null
  }
}

export const RELEASES_PAGE = 'https://github.com/pansiluchethiya/spark-26-medik-ai/releases'
