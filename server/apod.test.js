import assert from 'node:assert/strict'
import { getApodToday, parseApodHtml } from './apod.js'

const sample = `
<div class="media-detail-hero__media">
  <img src="https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png" />
  <img src="https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/october/JupiterMoons_Upreti_3105.jpg?w=0&amp;h=0&amp;fit=clip" />
</div>
`
assert.throws(() => parseApodHtml(sample.replace('media-detail-hero__media', 'other')), /没有主图/)

const html = `
<div class="media-detail-hero__media">
  <a href="https://science.nasa.gov/image-article/apod-2026-october-12-jupiter-and-the-moons/">
    <img src="https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/october/JupiterMoons_Upreti_3105.jpg?w=0&amp;h=0&amp;fit=clip" alt="moons" />
  </a>
</div>
<h2 class="display-48 margin-top-0 margin-bottom-3">Jupiter and the Moons</h2>
<table><tr><th>Date:</th><td>October 12, 2026</td></tr></table>
`
const parsed = parseApodHtml(html)
assert.equal(parsed.title, 'Jupiter and the Moons')
assert.equal(parsed.date, 'October 12, 2026')
assert.match(parsed.imageUrl, /JupiterMoons_Upreti_3105\.jpg\?w=2048$/)
assert.match(parsed.archiveUrl, /ap261012\.html$/)
assert.doesNotMatch(parsed.imageUrl, /nasa-logo/)

const live = await getApodToday({ force: true })
assert.ok(live.imageUrl, 'missing image')
assert.doesNotMatch(live.imageUrl, /nasa-logo/)
assert.ok(live.title && live.title !== 'NASA Science', `bad title: ${live.title}`)
const image = await fetch(live.imageUrl)
assert.equal(image.status, 200)
assert.match(image.headers.get('content-type') || '', /image\//)
console.log(JSON.stringify({ title: live.title, imageUrl: live.imageUrl, pageUrl: live.pageUrl }, null, 2))
