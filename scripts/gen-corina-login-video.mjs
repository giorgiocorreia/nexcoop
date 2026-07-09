import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const authPath = 'C:\\Users\\Lenovo\\.grok\\auth.json'
const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'))
const entry = Object.values(auth)[0]
const token = entry.key

const imagePath = path.join(ROOT, 'public', 'images', 'corina-login.png')
const outPath = path.join(ROOT, 'public', 'videos', 'corina-login.mp4')

const imageB64 = fs.readFileSync(imagePath).toString('base64')
const imageDataUrl = `data:image/png;base64,${imageB64}`

const prompt = [
  'A professional Brazilian woman named Corina, waist-up portrait, facing the camera.',
  'Solid blue-purple background matching the reference image exactly.',
  'She speaks directly to the viewer with natural lip-sync in Brazilian Portuguese:',
  '"Faça aqui o seu login."',
  'Subtle natural head movement and friendly expression, minimal camera movement, stable framing.',
  'Corporate tech assistant style, same outfit and appearance as the reference image.',
].join(' ')

console.log('Enviando geração de vídeo (grok-imagine-video)...')

const createRes = await fetch('https://api.x.ai/v1/videos/generations', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'grok-imagine-video',
    prompt,
    image: { url: imageDataUrl },
    duration: 5,
    aspect_ratio: '3:4',
    resolution: '480p',
  }),
})

if (!createRes.ok) {
  const err = await createRes.text()
  console.error('Erro ao criar:', createRes.status, err)
  process.exit(1)
}

const { request_id } = await createRes.json()
console.log('request_id:', request_id)

let videoUrl = null
for (let i = 0; i < 120; i++) {
  await new Promise(r => setTimeout(r, 5000))
  const pollRes = await fetch(`https://api.x.ai/v1/videos/${request_id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await pollRes.json()
  const pct = data.progress ?? '?'
  console.log(`[${i + 1}] status=${data.status} progress=${pct}%`)

  if (data.status === 'done') {
    videoUrl = data.video?.url
    if (!videoUrl) {
      console.error('Concluído sem URL:', JSON.stringify(data, null, 2))
      process.exit(1)
    }
    break
  }
  if (data.status === 'failed' || data.error) {
    console.error('Falhou:', JSON.stringify(data, null, 2))
    process.exit(1)
  }
}

if (!videoUrl) {
  console.error('Timeout aguardando vídeo')
  process.exit(1)
}

console.log('Baixando:', videoUrl)
const videoRes = await fetch(videoUrl)
const buf = Buffer.from(await videoRes.arrayBuffer())
fs.writeFileSync(outPath, buf)
console.log('Salvo:', outPath, `(${(buf.length / 1024).toFixed(0)} KB)`)