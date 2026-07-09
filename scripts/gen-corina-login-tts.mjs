import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, '..', 'public', 'videos', 'corina-login-voice.mp3')

const auth = JSON.parse(fs.readFileSync('C:\\Users\\Lenovo\\.grok\\auth.json', 'utf8'))
const token = Object.values(auth)[0].key

const res = await fetch('https://api.x.ai/v1/tts', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Faça aqui o seu login.',
    voice_id: 'eve',
    language: 'pt-BR',
    output_format: { codec: 'mp3', sample_rate: 44100, bit_rate: 128000 },
    speed: 0.95,
  }),
})

if (!res.ok) {
  console.error(await res.text())
  process.exit(1)
}

const buf = Buffer.from(await res.arrayBuffer())
fs.writeFileSync(outPath, buf)
console.log('Salvo:', outPath, `(${(buf.length / 1024).toFixed(1)} KB)`)