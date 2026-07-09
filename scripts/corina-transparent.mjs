import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = join(__dirname, '../public/images/corina.png')
const out = join(__dirname, '../public/images/corina-transparent.png')

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width, height, channels } = info
const pixels = new Uint8ClampedArray(data)
const bg = new Uint8Array(width * height)

function idx(x, y) {
  return (y * width + x) * channels
}

function isBackgroundPixel(i) {
  const r = pixels[i]
  const g = pixels[i + 1]
  const b = pixels[i + 2]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const sat = max === 0 ? 0 : (max - min) / max
  return lum < 48 && sat < 0.38
}

const queue = []
for (let x = 0; x < width; x++) {
  for (const y of [0, height - 1]) {
    const p = y * width + x
    if (isBackgroundPixel(idx(x, y))) {
      bg[p] = 1
      queue.push(p)
    }
  }
}
for (let y = 0; y < height; y++) {
  for (const x of [0, width - 1]) {
    const p = y * width + x
    if (!bg[p] && isBackgroundPixel(idx(x, y))) {
      bg[p] = 1
      queue.push(p)
    }
  }
}

while (queue.length) {
  const p = queue.pop()
  const x = p % width
  const y = (p - x) / width
  for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
    const np = ny * width + nx
    if (!bg[np] && isBackgroundPixel(idx(nx, ny))) {
      bg[np] = 1
      queue.push(np)
    }
  }
}

for (let p = 0; p < width * height; p++) {
  const i = p * channels
  if (bg[p]) pixels[i + 3] = 0
}

await sharp(Buffer.from(pixels), { raw: { width, height, channels } })
  .trim({ threshold: 8 })
  .resize({ height: 480, fit: 'inside', withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toFile(out)

console.log('OK', out)