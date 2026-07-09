import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = process.argv[2] || join(__dirname, '../../Downloads/Gemini_Generated_Image_dieh42dieh42dieh.png')
const out = join(__dirname, '../public/images/corina.png')

const info = await sharp(src)
  .resize({ width: 520, height: 650, fit: 'inside', withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: false })
  .toFile(out)

console.log('OK', out, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} KB`)