import express from 'express'
import { createServer as createViteServer } from 'vite'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { apodRss, getApodToday, getRandomNasaImage } from './apod.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const isProd = process.env.NODE_ENV === 'production'
const onVercel = process.env.VERCEL === '1'

const app = express()
app.disable('x-powered-by')

app.get('/api/site', (_req, res) => {
  res.type('json').send(readFileSync(path.join(root, 'data/site.json'), 'utf8'))
})

app.get('/api/apod/today', async (_req, res) => {
  try {
    res.json(await getApodToday())
  } catch (error) {
    console.error('[APOD]', error)
    res.status(503).json({ error: 'APOD 暂时不可用' })
  }
})

app.get('/api/nasa/images/random', async (_req, res) => {
  try {
    res.json(await getRandomNasaImage())
  } catch (error) {
    console.error('[NASA gallery]', error)
    res.status(503).json({ error: 'NASA 图库暂时不可用' })
  }
})

app.get('/api/poetry', async (_req, res) => {
  try {
    const response = await fetch('https://v2.jinrishici.com/one.json')
    if (!response.ok) throw new Error(`poetry HTTP ${response.status}`)
    res.json(await response.json())
  } catch (error) {
    console.error('[poetry]', error)
    res.status(502).json({ status: 'error', errMessage: '今日诗词暂时不可用' })
  }
})

app.get('/apod-rss', async (_req, res) => {
  try {
    const item = await getApodToday()
    res.type('application/rss+xml').send(apodRss(item))
  } catch (error) {
    console.error('[APOD RSS]', error)
    res.status(503).type('text/plain').send('APOD RSS unavailable')
  }
})

export async function attachFrontend() {
  if (onVercel) return app

  if (isProd) {
    app.use(express.static(path.join(root, 'dist')))
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(root, 'dist/index.html'))
    })
  } else {
    const vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  }

  return app
}

export default app
