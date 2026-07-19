import Image from 'next/image'
import type { SiteTema } from '@/lib/site/site-utils'
import type { Organizacao } from '@/types/database'

export default function SiteFooter({
  tema,
  org,
}: {
  tema: SiteTema
  org: Organizacao
}) {
  const endereco = [org.logradouro, org.numero && `nº ${org.numero}`, org.bairro].filter(Boolean).join(', ')
  return (
    <footer className="pt-14 pb-8 text-white" style={{ backgroundColor: tema.corEscura }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          <div>
            <Image src={tema.logoUrl} alt={tema.nomeExibicao} width={64} height={64} className="mb-3 rounded" />
            <p className="text-sm text-white/60 leading-relaxed">
              {tema.nomeCurto || org.nome}
            </p>
          </div>
          <div>
            <h4
              className="text-[11px] font-bold uppercase tracking-widest mb-4"
              style={{ color: tema.corDestaque }}
            >
              Contato
            </h4>
            <p className="text-sm text-white/60 leading-relaxed">
              {endereco && <>{endereco}<br /></>}
              {org.cidade && org.estado && <>{org.cidade}/{org.estado}<br /></>}
              {org.telefone && <>📞 {org.telefone}<br /></>}
              {org.email && <>✉ {org.email}<br /></>}
              {org.cnpj && <>CNPJ: {org.cnpj}</>}
            </p>
          </div>
          <div>
            <h4
              className="text-[11px] font-bold uppercase tracking-widest mb-4"
              style={{ color: tema.corDestaque }}
            >
              Cooperativa
            </h4>
            <p className="text-sm text-white/60 leading-relaxed">
              Site institucional com dados vivos — cotações e produtos atualizados
              diretamente do sistema de gestão da cooperativa via NexCoop.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 pt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-white/35">
            © {new Date().getFullYear()} {tema.nomeExibicao} — Todos os direitos reservados.
          </p>
          <p className="text-[11px] text-white/25">Site hospedado no NexCoop</p>
        </div>
      </div>
    </footer>
  )
}
