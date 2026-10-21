import { attachFrontend } from './app.js'

const port = Number(process.env.PORT || 47831)

const app = await attachFrontend()

app.listen(port, '0.0.0.0', () => {
  console.log(`墨韵琉璃 nav listening on http://127.0.0.1:${port}`)
})
