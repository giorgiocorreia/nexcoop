import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const htmlPath = process.argv[2] || join(tmpdir(), 'gemini-share3.html')
const outPath = process.argv[3] || join(process.cwd(), 'public/images/corina-gemini-raw.png')

if (!existsSync(htmlPath)) {
  console.error('missing', htmlPath)
  process.exit(1)
}

const html = readFileSync(htmlPath, 'utf8')
const matches = [...html.matchAll(/https:\/\/lh3\.googleusercontent\.com\/[^"'\s)]+/g)].map(m => m[0])
const url = [...new Set(matches)].sort((a, b) => b.length - a.length)[0]

if (!url) {
  console.error('no image url found')
  process.exit(1)
}

console.log('fetching', url.slice(0, 120) + '...')
const res = await fetch(url)
if (!res.ok) {
  console.error('fetch failed', res.status)
  process.exit(1)
}

const buf = Buffer.from(await res.arrayBuffer())
writeFileSync(outPath, buf)
console.log('saved', outPath, buf.length, 'bytes')