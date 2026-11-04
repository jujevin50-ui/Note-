import * as Y from 'yjs'
export function youtubeId(text) {
  const candidates = String(text || '').match(/https?:\/\/[^\s<>"']+|(?:www\.)?(?:youtu\.be|youtube\.com|youtube-nocookie\.com)\/[^\s<>"']+/gi) || []
  for (const candidate of candidates) {
    try {
      const url = new URL((/^https?:/i.test(candidate) ? '' : 'https://') + candidate.replace(/&amp;/g,'&'))
      const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/,'')
      let id
      if (host === 'youtu.be') id = url.pathname.split('/')[1]
      else if (['youtube.com','youtube-nocookie.com'].includes(host)) id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(embed|shorts|live)\//.test(url.pathname) ? url.pathname.split('/')[2] : null
      if (/^[\w-]{11}$/.test(id || '')) return id
    } catch {}
  }
  return null
}
export function documentVideo(encoded) {
  if (!encoded) return null
  const doc = new Y.Doc()
  try {
    Y.applyUpdate(doc, Uint8Array.from(atob(encoded), c => c.charCodeAt(0)))
    return youtubeId(doc.getXmlFragment('default').toString())
  } catch { return null } finally { doc.destroy() }
}
