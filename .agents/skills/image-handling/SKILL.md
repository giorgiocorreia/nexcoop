---
name: image-handling
description: Guidance for sourcing, optimizing, and implementing images in web projects — covering stock photo APIs, AI generation, Next.js image component, formats, compression, responsive sizing, blur placeholders, and accessibility.
license: MIT
---

# Image Handling

Approach images as a first-class design material, not an afterthought. Every image must earn its place: it should reinforce the brand, guide the eye, or communicate something words cannot. A wrong image is worse than no image.

## Sourcing images

### Stock photos (free, no attribution required)
- **Unsplash** (`https://source.unsplash.com`) — use the API with specific keywords: `https://api.unsplash.com/photos/random?query=<keyword>&client_id=<key>`. Prefer curated searches over random results.
- **Pexels** — good for lifestyle and business photography.
- **Unsplash direct embed** for prototyping: `https://images.unsplash.com/photo-<ID>?w=1200&q=80`

### AI-generated images
When stock photos feel generic or the brief calls for something unique:
- Use the project's configured AI image generation tool (if available)
- Describe the image in terms of subject, lighting, mood, and composition — not just "a photo of a person"
- Always verify: no extra limbs, legible text, realistic proportions

### Placeholder strategy during development
Never use broken image boxes. Use one of these approaches:
- `https://picsum.photos/<width>/<height>` — random realistic photos sized to spec
- Colored SVG placeholders with correct aspect ratio
- Local placeholder files committed to the repo

## Next.js image component

Always use `next/image` — never raw `<img>` tags in Next.js projects.

```tsx
import Image from 'next/image'

// Hero image (above the fold — eager load, high priority)
<Image
  src="/hero.webp"
  alt="Descrição concreta do que aparece na imagem"
  width={1440}
  height={800}
  priority
  quality={85}
  className="w-full h-auto object-cover"
/>

// Content image (below the fold — lazy load)
<Image
  src="/team.webp"
  alt="Equipe da empresa reunida na sala de reuniões"
  width={600}
  height={400}
  loading="lazy"
  quality={80}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
/>
```

### Rules for next/image
- `priority` only on images visible above the fold (max 1–2 per page)
- `loading="lazy"` is the default — only omit when using `priority`
- `quality={80}` is the sweet spot for photos; use `quality={90}` for product shots
- Always provide explicit `width` and `height` to prevent layout shift
- For full-width images use `fill` prop with a positioned parent, not arbitrary dimensions

## Format selection

| Format | Use case |
|--------|----------|
| WebP | Default for all photos and illustrations |
| AVIF | Maximum compression where browser support allows (check caniuse) |
| SVG | Logos, icons, illustrations with solid shapes |
| PNG | Images requiring transparency (logos on colored backgrounds) |
| JPEG | Legacy fallback only |

Next.js converts to WebP/AVIF automatically via `next/image` — no manual conversion needed unless serving static files outside the component.

## Responsive images

Define `sizes` prop to let the browser pick the right source:

```tsx
// Full-width hero
<Image sizes="100vw" />

// Half-width on desktop, full on mobile
<Image sizes="(max-width: 768px) 100vw, 50vw" />

// Fixed sidebar image
<Image sizes="(max-width: 768px) 100vw, 320px" />
```

## Blur placeholder generation

For a polished loading experience, generate base64 blur placeholders:

```bash
# Install once
npm install plaiceholder sharp

# Generate in a build script or getStaticProps
import { getPlaiceholder } from 'plaiceholder'
const { base64 } = await getPlaiceholder('/path/to/image.jpg')
```

For quick prototyping, use a solid-color data URL matching the image's dominant color:
```
data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7
```

## Accessibility

Every image must have an `alt` attribute. Write alt text that describes what the image shows, not what it means:
- ✅ `"Cooperado entregando produtos na sede da cooperativa"`
- ❌ `"Imagem de cooperativa"` — vago demais
- ❌ `""` — only acceptable for purely decorative images (use `role="presentation"` instead)

Decorative images (background textures, dividers):
```tsx
<Image src="/texture.webp" alt="" role="presentation" aria-hidden="true" />
```

## Performance checklist

Before considering images done:
- [ ] All above-fold images have `priority` prop
- [ ] All below-fold images have explicit `width` and `height`
- [ ] No raw `<img>` tags (except in third-party embeds)
- [ ] `sizes` prop defined for any image that changes width across breakpoints
- [ ] Blur placeholder on any image larger than 200x200px
- [ ] All `alt` texts are descriptive and in the same language as the page
- [ ] LCP element (usually the hero image) loads in under 2.5s — verify in DevTools
