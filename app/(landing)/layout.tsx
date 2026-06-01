// app/(landing)/layout.tsx

import type { Metadata } from 'next'
import { Sora, Inter } from 'next/font/google'

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NexCoop — Gestão para cooperativas e associações',
  description:
    'Plataforma de gestão para cooperativas e associações brasileiras. Controle filiados, finanças, assembleias e documentos em um só lugar.',
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${sora.variable} ${inter.variable}`}>
      {children}
    </div>
  )
}