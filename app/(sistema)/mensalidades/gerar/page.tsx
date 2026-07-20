'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { traduzirErro } from '@/lib/utils/erros'
import type { Cooperado } from '@/types/database'
import { Btn } from '@/components/ui/Btn'
import { termoMensalidade } from '../termo'
import {
  PageLayout, ContentCard, Field, Input, Badge,
  AlertBanner, COM_C, MODULO_NEXCOOP,
} from '@/components/nexcoop/ui'

type CoopAtivo = Pick<Cooperado, 'id' | 'nome_completo' | 'cpf' | 'quota_parte' | 'status'>

interface PreviewItem {
  coop: CoopAtivo
  valor: string
  // Meses do período (YYYY-MM) em que este membro AINDA não tem cobrança.
  // Vazio = todos os meses já existem para ele.
  mesesFaltantes: string[]
}

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function GerarMensalidadesPage() {
  const router = useRouter()

  const [cooperados, setCooperados] = useState<CoopAtivo[]>([])
  const [carregando, setCarregando] = useState(true)
  // Só para rotular a tela: associação = "associados", demais mantêm "filiados".
  const [tipoOrg, setTipoOrg] = useState<string | null>(null)
  const termo = termoMensalidade(tipoOrg)

  const hoje = new Date()
  const [mesAno, setMesAno]       = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`)
  const [qtdMeses, setQtdMeses]   = useState('1')
  const [diaVenc, setDiaVenc]     = useState('10')
  const [valorPad, setValorPad]   = useState('50')

  const [preview, setPreview]                     = useState<PreviewItem[] | null>(null)
  const [carregandoPreview, setCarregandoPreview] = useState(false)
  const [gerando, setGerando]                     = useState(false)
  const [erro, setErro]                           = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('cooperados')
      .select('id, nome_completo, cpf, quota_parte, status')
      .in('status', ['ativo', 'probatorio'])
      .order('nome_completo')
      .returns<CoopAtivo[]>()
      .then(({ data }) => { setCooperados(data ?? []); setCarregando(false) })
    // Tipo da org do usuário (RLS devolve só a dele) — só para o rótulo.
    supabase
      .from('organizacoes')
      .select('tipo')
      .limit(1)
      .maybeSingle<{ tipo: string }>()
      .then(({ data }) => setTipoOrg(data?.tipo ?? null))
  }, [])

  useEffect(() => { setPreview(null) }, [mesAno, qtdMeses, diaVenc, valorPad])

  // Meses do período (YYYY-MM), a partir de mesAno, por qtdMeses (1–12).
  function mesesDoRange(): string[] {
    const [ano, mes] = mesAno.split('-').map(Number)
    const n = Math.min(Math.max(parseInt(qtdMeses, 10) || 1, 1), 12)
    const out: string[] = []
    for (let i = 0; i < n; i++) {
      const d = new Date(ano, mes - 1 + i, 1)
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return out
  }

  async function carregarPreview() {
    if (!mesAno || !diaVenc || !valorPad) { setErro('Preencha todos os campos antes de visualizar.'); return }
    setCarregandoPreview(true)
    setErro('')

    const refs = mesesDoRange().map(m => `${m}-01`)
    // Busca tudo que já existe no período de uma vez e agrupa por membro,
    // para não duplicar cobrança em nenhum mês.
    const { data: existentes } = await createClient()
      .from('mensalidades')
      .select('cooperado_id, mes_referencia')
      .in('mes_referencia', refs)

    const porCoop: Record<string, Set<string>> = {}
    for (const e of existentes ?? []) {
      const cid = e.cooperado_id as string
      ;(porCoop[cid] ??= new Set()).add(e.mes_referencia as string)
    }

    setPreview(
      cooperados.map(c => ({
        coop: c,
        valor: c.quota_parte && Number(c.quota_parte) > 0
          ? String(Number(c.quota_parte))
          : valorPad,
        mesesFaltantes: refs.filter(r => !porCoop[c.id]?.has(r)).map(r => r.slice(0, 7)),
      }))
    )
    setCarregandoPreview(false)
  }

  // Dia de vencimento no mês informado (YYYY-MM), ajustado ao último dia do mês.
  function calcDataVencimento(mesRef: string): string {
    const [ano, mes] = mesRef.split('-').map(Number)
    const dia = Math.min(parseInt(diaVenc, 10), new Date(ano, mes, 0).getDate())
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  async function handleGerar() {
    if (!preview) return
    const temFaltante = preview.some(p => p.mesesFaltantes.length > 0)
    if (!temFaltante) { setErro('Nenhuma cobrança nova a gerar — todos os membros já têm mensalidade em todos os meses do período.'); return }

    setGerando(true)
    setErro('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: usuario } = await supabase
      .from('usuarios').select('organizacao_id').eq('id', user.id).single()

    if (!usuario?.organizacao_id) {
      setErro('Usuário sem organização vinculada.')
      setGerando(false)
      return
    }

    const orgId = usuario.organizacao_id as string

    // Uma linha por (membro × mês faltante). Vencimento calculado por mês.
    const payload = preview
      .filter(p => Number(p.valor) > 0)
      .flatMap(p => p.mesesFaltantes.map(m => ({
        organizacao_id:  orgId,
        cooperado_id:    p.coop.id,
        mes_referencia:  `${m}-01`,
        valor:           Number(p.valor),
        status:          'pendente' as const,
        data_vencimento: calcDataVencimento(m),
        usuario_id:      user.id,
      })))

    if (payload.length === 0) {
      setErro('Todos os valores estão em R$ 0,00. Informe um valor padrão ou a quota-parte dos membros.')
      setGerando(false)
      return
    }

    const { error } = await supabase.from('mensalidades').insert(payload)
    if (error) {
      setErro(traduzirErro(error.message))
      setGerando(false)
      return
    }

    router.push('/mensalidades')
  }

  const rangeLen    = mesesDoRange().length
  // Cobranças novas = soma dos meses faltantes dos membros com valor > 0.
  const novosCount  = preview?.filter(p => Number(p.valor) > 0).reduce((s, p) => s + p.mesesFaltantes.length, 0) ?? 0
  const totalNovo   = preview?.filter(p => Number(p.valor) > 0).reduce((s, p) => s + Number(p.valor) * p.mesesFaltantes.length, 0) ?? 0
  // Já existentes no período = total de slots (membros × meses) menos os faltantes.
  const existeCount = preview ? preview.length * rangeLen - preview.reduce((s, p) => s + p.mesesFaltantes.length, 0) : 0

  return (
    <PageLayout
      titulo="Gerar Mensalidades"
      subtitulo={`Criar cobranças mensais para os ${termo.plural} ativos`}
      icone="ti-calendar-due"
      modulo={MODULO_NEXCOOP}
      breadcrumb={[
        { label: 'Mensalidades', href: '/mensalidades' },
        { label: 'Gerar' },
      ]}
      fullHeight
    >
      <div style={{ maxWidth: 820 }}>

        <ContentCard title="Parâmetros">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <Field label="Mês inicial">
              <Input type="month" value={mesAno} onChange={e => setMesAno(e.target.value)} />
            </Field>
            <Field label="Quantidade de meses" hint="Gera este mês e os seguintes, pulando o que já existe.">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input
                  type="number" value={qtdMeses} onChange={e => setQtdMeses(e.target.value)}
                  min="1" max="12" placeholder="1" style={{ maxWidth: 90 }}
                />
                <Btn variante="cinza" tamanho="sm" onClick={() => setQtdMeses('12')}>Ano todo</Btn>
              </div>
            </Field>
            <Field label="Dia de vencimento" hint="Ajustado automaticamente para o último dia do mês.">
              <Input
                type="number" value={diaVenc} onChange={e => setDiaVenc(e.target.value)}
                min="1" max="31" placeholder="10" style={{ maxWidth: 120 }}
              />
            </Field>
            <Field label="Valor padrão (R$)" hint="Usado quando o membro não tem quota-parte definida.">
              <Input
                type="number" value={valorPad} onChange={e => setValorPad(e.target.value)}
                min="0" step="0.01" placeholder="50,00" style={{ maxWidth: 160 }}
              />
            </Field>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Btn
              variante="roxo"
              icone="ti-eye"
              onClick={carregarPreview}
              disabled={carregando || carregandoPreview}
            >
              {carregandoPreview ? 'Carregando…' : 'Visualizar cobranças'}
            </Btn>
            {carregando && <span style={{ fontSize: 12, color: COM_C.txtSub }}>Carregando membros…</span>}
          </div>
        </ContentCard>

        {erro && (
          <AlertBanner tipo="erro">{erro}</AlertBanner>
        )}

        {preview && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{
                background: COM_C.roxoLt, border: `1px solid ${COM_C.roxo}33`,
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: COM_C.roxo, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Novas cobranças
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: COM_C.roxo, margin: '4px 0' }}>{novosCount}</div>
                <div style={{ fontSize: 11, color: COM_C.txtSub }}>
                  {rangeLen > 1 && `${rangeLen} meses • `}Total: {BRL(totalNovo)}
                </div>
              </div>
              <div style={{
                background: '#FAFAF9', border: `1px solid ${COM_C.borda}`,
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: COM_C.txtSub, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Já existem
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: COM_C.txtSub, margin: '4px 0' }}>{existeCount}</div>
                <div style={{ fontSize: 11, color: '#A8A29E' }}>serão ignorados</div>
              </div>
            </div>

            <ContentCard title="Pré-visualização" noPadding>
              <div style={{
                padding: '12px 16px', borderBottom: `1px solid ${COM_C.borda}`,
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', gap: 0,
                background: '#FAFAF9',
              }}>
                {['Membro', 'Status', 'Quota-parte', 'Valor cobrança'].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 600, color: COM_C.txtSub, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {h}
                  </div>
                ))}
              </div>
              {preview.map((p, i) => (
                <div
                  key={p.coop.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', alignItems: 'center',
                    padding: '10px 16px', borderTop: i > 0 ? `1px solid ${COM_C.borda}` : 'none',
                    background: p.mesesFaltantes.length === 0 ? '#FAFAF9' : '#fff',
                    opacity: p.mesesFaltantes.length === 0 ? 0.55 : 1,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: COM_C.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.coop.nome_completo}
                  </div>
                  <div>
                    <Badge
                      label={p.coop.status === 'ativo' ? 'Ativo' : 'Probatório'}
                      bg={p.coop.status === 'ativo' ? COM_C.roxoLt : COM_C.azulLt}
                      cor={p.coop.status === 'ativo' ? COM_C.roxo : COM_C.azul}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: COM_C.txtSub }}>
                    {p.coop.quota_parte && Number(p.coop.quota_parte) > 0
                      ? BRL(Number(p.coop.quota_parte))
                      : <span style={{ color: '#A8A29E' }}>—</span>}
                  </div>
                  {p.mesesFaltantes.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#A8A29E', fontStyle: 'italic' }}>
                      {rangeLen > 1 ? 'todos os meses já existem' : 'já existe'}
                    </div>
                  ) : (
                    <div>
                      <Input
                        type="number" min="0" step="0.01"
                        value={p.valor}
                        onChange={e => setPreview(prev => prev!.map(x => x.coop.id === p.coop.id ? { ...x, valor: e.target.value } : x))}
                        style={{ width: 100, padding: '6px 8px', fontSize: 13 }}
                      />
                      {rangeLen > 1 && (
                        <div style={{ fontSize: 10, color: COM_C.txtSub, marginTop: 2 }}>
                          × {p.mesesFaltantes.length} {p.mesesFaltantes.length === 1 ? 'mês' : 'meses'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </ContentCard>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingBottom: 32 }}>
              <Btn variante="cinza" onClick={() => router.push('/mensalidades')}>Cancelar</Btn>
              <Btn
                variante="roxo"
                icone="ti-bolt"
                onClick={handleGerar}
                disabled={gerando || novosCount === 0}
              >
                {gerando ? 'Gerando…' : `Gerar ${novosCount} cobrança${novosCount !== 1 ? 's' : ''}`}
              </Btn>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  )
}