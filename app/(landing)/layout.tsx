import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NextCoop — Gestão cooperativa para o Brasil',
  description:
    'Plataforma de gestão para cooperativas e associações do agronegócio brasileiro. Controle filiados, mensalidades, assembleias e documentos.',
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
