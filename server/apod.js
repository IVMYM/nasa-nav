const APOD_PAGE = 'https://science.nasa.gov/apod/'
const NASA_API = 'https://api.nasa.gov/planetary/apod'
const IMAGES_API = 'https://images-api.nasa.gov/search'
const PAGE_UA = 'Mozilla/5.0 (compatible; MoyunNav/1.0; +https://nav.xxznote.eu.org/)'

const GALLERY_QUERIES = ['nebula', 'galaxy', 'jupiter', 'saturn', 'earth', 'mars', 'hubble', 'moon', 'orion']

let apodCache = null
let galleryCache = []

function isPlaceholder(url) {
  if (!url || typeof url !== 'string') return true
  return (
    /\/calendar\//i.test(url) ||
    /\/S_[^/]+\.(jpg|jpeg|png)/i.test(url) ||
    /nasa-logo/i.test(url) ||
    /wp-content\/themes\/nasa-child\/assets\/images/i.test(url)
  )
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function easternDate(offsetDays = 0) {
  const now = new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now)
}

function apodArchiveLink(dateText) {
  const parsed = dateText ? new Date(`${dateText} 12:00:00 GMT`) : null
  const iso = parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toISOString().slice(0, 10)
    : easternDate(0)
  const [year, month, day] = iso.split('-')
  return `https://apod.nasa.gov/apod/ap${year.slice(2)}${month}${day}.html`
}

export function parseApodHtml(html) {
  const block = html.match(/media-detail-hero__media[\s\S]{0,6000}?<\/div>\s*<\/div>/i)?.[0]
    || html.match(/media-detail-hero__media[\s\S]{0,6000}/i)?.[0]
  if (!block) throw new Error('APOD 页面没有主图')
  const sources = [...block.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((match) => decodeHtml(match[1]))
  const raw = sources.find((url) => !isPlaceholder(url.split('?')[0]))
  if (!raw) throw new Error('APOD 页面返回的是占位图')
  const base = raw.split('?')[0]
  const imageUrl = /\.(jpe?g|png|webp)$/i.test(base) ? `${base}?w=2048` : raw
  const title = decodeHtml(
    (html.match(/<h2 class="display-48[^"]*"[^>]*>([^<]+)<\/h2>/i) || [])[1] || '',
  ) || 'Astronomy Picture of the Day'
  const pageUrl = decodeHtml(
    (html.match(/href="(https:\/\/science\.nasa\.gov\/image-article\/apod-[^"]+)"/i) || [])[1] || '',
  ) || APOD_PAGE
  const dateText = decodeHtml(
    (html.match(/Date:[\s\S]{0,240}?([A-Za-z]+\s+\d{1,2},\s+\d{4})/i) || [])[1] || '',
  )
  return {
    imageUrl,
    pageUrl,
    title,
    date: dateText,
    source: 'apod',
    archiveUrl: apodArchiveLink(dateText),
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': PAGE_UA, Accept: 'text/html,application/json' },
    redirect: 'follow',
  })
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`)
  return response.text()
}

async function apodFromPage() {
  const html = await fetchText(APOD_PAGE)
  return parseApodHtml(html)
}

async function apodFromApi() {
  const key = process.env.NASA_API_KEY || 'DEMO_KEY'
  for (let offset = 0; offset < 6; offset += 1) {
    const date = easternDate(offset)
    const url = `${NASA_API}?api_key=${encodeURIComponent(key)}&date=${date}&thumbs=true`
    let payload
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': PAGE_UA } })
      if (!response.ok) continue
      payload = await response.json()
    } catch {
      continue
    }
    const candidate = payload.media_type === 'video'
      ? payload.thumbnail_url
      : payload.hdurl || payload.url
    if (isPlaceholder(candidate)) continue
    return {
      imageUrl: candidate,
      pageUrl: APOD_PAGE,
      title: payload.title || 'Astronomy Picture of the Day',
      date: payload.date || date,
      source: 'apod',
      archiveUrl: apodArchiveLink(payload.date || date),
    }
  }
  throw new Error('NASA API 没有可用的每日图片')
}

export async function getApodToday({ force = false } = {}) {
  if (!force && apodCache && apodCache.expires > Date.now()) return apodCache.value
  let value
  let pageError
  try {
    value = await apodFromPage()
  } catch (error) {
    pageError = error
  }
  if (!value) {
    try {
      value = await apodFromApi()
    } catch (error) {
      const reason = pageError ? `${pageError.message}; ${error.message}` : error.message
      throw new Error(reason)
    }
  }
  apodCache = { expires: Date.now() + 3 * 60 * 60 * 1000, value }
  return value
}

export function apodRss(item) {
  const title = escapeXml(item.title || 'Astronomy Picture of the Day')
  const image = escapeXml(item.imageUrl)
  const link = escapeXml(item.archiveUrl || apodArchiveLink(item.date))
  const page = escapeXml(item.pageUrl || APOD_PAGE)
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Astronomy Picture of the Day</title>
    <link>${page}</link>
    <description>NASA APOD via science.nasa.gov</description>
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description><![CDATA[<img src="${image}" alt="${title}" />]]></description>
    </item>
  </channel>
</rss>`
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function largeAsset(href) {
  if (!href) return ''
  return href.replace(/~(thumb|small|medium)\.(jpg|jpeg|png)/i, '~large.$2')
}

export async function getRandomNasaImage() {
  if (galleryCache.length === 0) {
    const query = GALLERY_QUERIES[Math.floor(Math.random() * GALLERY_QUERIES.length)]
    const response = await fetch(`${IMAGES_API}?q=${encodeURIComponent(query)}&media_type=image`, {
      headers: { Accept: 'application/json', 'User-Agent': PAGE_UA },
    })
    if (!response.ok) throw new Error(`Gallery HTTP ${response.status}`)
    const payload = await response.json()
    const items = payload?.collection?.items || []
    galleryCache = items
      .map((item) => {
        const meta = item.data?.[0] || {}
        const preview = item.links?.find((link) => link.render === 'image')?.href || item.links?.[0]?.href
        const imageUrl = largeAsset(preview)
        if (!imageUrl || isPlaceholder(imageUrl)) return null
        return {
          imageUrl,
          pageUrl: meta.nasa_id ? `https://images.nasa.gov/details/${meta.nasa_id}` : 'https://images.nasa.gov/',
          title: meta.title || 'NASA Image Library',
          nasaId: meta.nasa_id || '',
          source: 'gallery',
        }
      })
      .filter(Boolean)
  }
  if (galleryCache.length === 0) throw new Error('Gallery: no image')
  const index = Math.floor(Math.random() * galleryCache.length)
  return galleryCache.splice(index, 1)[0]
}
