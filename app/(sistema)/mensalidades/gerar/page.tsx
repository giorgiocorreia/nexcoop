'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { traduzirErro } from '@/lib/utils/erros'
import type { Cooperado } from '@/types/database'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, ContentCard, Field, Input, Badge,
  AlertBanner, COM_C, MODULO_NEXCOOP,
} from '@/components/nexcoop/ui'

type CoopAtivo = Pick<Cooperado, 'id' | 'nome_completo' | 'cpf' | 'quota_parte' | 'status'>

interface PreviewItem {
  coop: CoopAtivo
  valor: string
  jaExiste: boolean
}

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function GerarMensalidadesPage() {
  const router = useRouter()

  const [cooperados, setCooperados] = useState<CoopAtivo[]>([])
  const [carregando, setCarregando] = useState(true)

  const hoje = new Date()
  const [mesAno, setMesAno]       = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`)
  const [diaVenc, setDiaVenc]     = useState('10')
  const [valorPad, setValorPad]   = useState('50')

  const [preview, setPreview]                     = useState<PreviewItem[] | null>(null)
  const [carregandoPreview, setCarregandoPreview] = useState(false)
  const [gerando, setGerando]                     = useState(false)
  const [erro, setErro]                           = useState('')

  useEffect(() => {
    createClient()
      .from('cooperados')
      .select('id, nome_completo, cpf, quota_parte, status')
      .in('status', ['ativo', 'probatorio'])
      .order('nome_completo')
      .returns<CoopAtivo[]>()
      .then(({ data }) => { setCooperados(data ?? []); setCarregando(false) })
  }, [])

  useEffect(() => { setPreview(null) }, [mesAno, diaVenc, valorPad])

  async function carregarPreview() {
    if (!mesAno || !diaVenc || !valorPad) { setErro('Preencha todos os campos antes de visualizar.'); return }
    setCarregandoPreview(true)
    setErro('')

    const { data: existentes } = await createClient()
      .from('mensalidades')
      .select('cooperado_id')
      .eq('mes_referencia', `${mesAno}-01`)

    const jaTemSet = new Set((existentes ?? []).map(e => e.cooperado_id as string))

    setPreview(
      cooperados.map(c => ({
        coop: c,
        valor: c.quota_parte && Number(c.quota_parte) > 0
          ? String(Number(c.quota_parte))
          : valorPad,
        jaExiste: jaTemSet.has(c.id),
      }))
    )
    setCarregandoPreview(false)
  }

  function calcDataVencimento(): string {
    const [ano, mes] = mesAno.split('-').map(Number)
    const dia = Math.min(parseInt(diaVenc, 10), new Date(ano, mes, 0).getDate())
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  async function handleGerar() {
    if (!preview) return
    const novos = preview.filter(p => !p.jaExiste)
    if (novos.length === 0) { setErro('Nenhuma cobrança nova a gerar — todos os membros já têm mensalidade para este mês.'); return }

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

    const dataVenc = calcDataVencimento()
    const orgId = usuario.organizacao_id as string

    const payload = novos
      .filter(p => Number(p.valor) > 0)
      .map(p => ({
        organizacao_id:  orgId,
        cooperado_id:    p.coop.id,
        mes_referencia:  `${mesAno}-01`,
        valor:           Number(p.valor),
        status:          'pendente' as const,
        data_vencimento: dataVenc,
        usuario_id:      user.id,
      }))

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

  const novosCount  = preview?.filter(p => !p.jaExiste).length ?? 0
  const existeCount = preview?.filter(p => p.jaExiste).length  ?? 0

  return (
    <PageLayout
      titulo="Gerar Mensalidades"
      subtitulo="Criar cobranças mensais para os filiados ativos"
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
            <Field label="Mês de referência">
              <Input type="month" value={mesAno} onChange={e => setMesAno(e.target.value)} />
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
                  Total: {BRL(preview.filter(p => !p.jaExiste).reduce((s, p) => s + Number(p.valor), 0))}
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
                    background: p.jaExiste ? '#FAFAF9' : '#fff', opacity: p.jaExiste ? 0.55 : 1,
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
                  {p.jaExiste ? (
                    <div style={{ fontSize: 11, color: '#A8A29E', fontStyle: 'italic' }}>já existe</div>
                  ) : (
                    <Input
                      type="number" min="0" step="0.01"
                      value={p.valor}
                      onChange={e => setPreview(prev => prev!.map(x => x.coop.id === p.coop.id ? { ...x, valor: e.target.value } : x))}
                      style={{ width: 100, padding: '6px 8px', fontSize: 13 }}
                    />
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