import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const file = process.argv[2] || join(tmpdir(), 'gemini-share3.html')
if (!existsSync(file)) {
  console.log('missing', file)
  process.exit(1)
}

const html = readFileSync(file, 'utf8')
const urls = [...new Set([...html.matchAll(/https:\/\/lh3\.googleusercontent\.com\/[^"'\\\s]+/g)].map(m => m[0]))]

console.log('file', file)
console.log('lh3 urls', urls.length)
urls.slice(0, 5).forEach(u => console.log(' -', u.slice(0, 160)))

for (const k of ['635BFF', 'E8E0F4', 'Corina', 'cooperativa', 'Intelig']) {
  if (html.includes(k)) console.log('keyword:', k)
}