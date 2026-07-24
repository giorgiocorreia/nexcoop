import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buscarCarteirinhaAtivaDoCooperado } from '@/lib/carteirinha/queries'
import { montarUrlVerificacao, resolverStatusCarteirinha } from '@/lib/carteirinha/carteirinha-utils'
import { gerarQrCodeSvg } from '@/lib/carteirinha/qrcode'
import CarteirinhaCartao from './CarteirinhaCartao'

// Consulta ao vivo a cada acesso — mesma garantia de negócio da página
// pública /v/{codigo} (fase 1): status de vínculo nunca fica em cache.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Minha carteirinha — Portal do Filiado',
}

export default async function CarteirinhaFiliadoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/filiado/login')

  const admin = createAdminClient()

  const { data: usuario } = await admin
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usuario?.organizacao_id) redirect('/filiado/login')

  const { data: cooperado } = await admin
    .from('cooperados')
    .select('id, nome_completo, numero_matricula, data_admissao, foto_url, status')
    .eq('usuario_id', user.id)
    .eq('organizacao_id', usuario.organizacao_id)
    .maybeSingle()

  if (!cooperado) {
    // Usuário logado no portal mas sem cadastro de cooperado vinculado —
    // não deveria acontecer no fluxo normal, mas evita quebrar a página.
    return (
      <CarteirinhaCartao
        temCarteirinha={false}
        temCooperado={false}
        cooperado={null}
        organizacao={null}
        qrSvg={null}
        statusRotulo={null}
        statusDetalhe={null}
      />
    )
  }

  const { data: org } = await admin
    .from('organizacoes')
    .select('nome, logo_url, cor_primaria, tipo')
    .eq('id', usuario.organizacao_id)
    .single()

  const carteirinha = await buscarCarteirinhaAtivaDoCooperado(cooperado.id, usuario.organizacao_id)

  if (!carteirinha) {
    return (
      <CarteirinhaCartao
        temCarteirinha={false}
        temCooperado={true}
        cooperado={{
          id: cooperado.id,
          nome: cooperado.nome_completo,
          numeroMatricula: cooperado.numero_matricula,
          dataAdmissao: cooperado.data_admissao,
          fotoUrl: cooperado.foto_url,
        }}
        organizacao={org ? { nome: org.nome, logoUrl: org.logo_url, corPrimaria: org.cor_primaria, tipo: org.tipo } : null}
        qrSvg={null}
        statusRotulo={null}
        statusDetalhe={null}
      />
    )
  }

  const { data: siteConfig } = await admin
    .from('site_config')
    .select('slug')
    .eq('organizacao_id', usuario.organizacao_id)
    .maybeSingle()

  const url = montarUrlVerificacao(carteirinha.codigo, (siteConfig as { slug: string } | null)?.slug ?? null)
  const qrSvg = await gerarQrCodeSvg(url)

  // Situação calculada com a MESMA função pura da página pública (fase 1) —
  // regra do Giorgio: 'inadimplente' conta como ATIVO, nunca expor dado
  // financeiro aqui.
  const status = resolverStatusCarteirinha(cooperado.status, carteirinha.validaAte, carteirinha.revogadaEm)

  return (
    <CarteirinhaCartao
      temCarteirinha={true}
      temCooperado={true}
      cooperado={{
        id: cooperado.id,
        nome: cooperado.nome_completo,
        numeroMatricula: cooperado.numero_matricula,
        dataAdmissao: cooperado.data_admissao,
        fotoUrl: cooperado.foto_url,
      }}
      organizacao={org ? { nome: org.nome, logoUrl: org.logo_url, corPrimaria: org.cor_primaria, tipo: org.tipo } : null}
      qrSvg={qrSvg}
      statusRotulo={status.rotulo}
      statusDetalhe={status.detalhe}
      carteirinha={{ codigo: carteirinha.codigo, via: carteirinha.via, emitidaEm: carteirinha.emitidaEm, validaAte: carteirinha.validaAte }}
    />
  )
}
