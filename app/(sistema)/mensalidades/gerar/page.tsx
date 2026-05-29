'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Cooperado } from '@/types/database'

type CoopAtivo = Pick<Cooperado, 'id' | 'nome_completo' | 'cpf' | 'quota_parte' | 'status'>

interface PreviewItem {
  coop: CoopAtivo
  valor: string
  jaExiste: boolean
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #d5d3cc',
  borderRadius: '8px', fontSize: '13px', background: '#fafaf8',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const fo = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = '#635BFF')
const bl = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = '#d5d3cc')

function InputGroup({ label, children, dica }: { label: string; children: React.ReactNode; dica?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
      </label>
      {children}
      {dica && <p style={{ fontSize: '11px', color: '#aaa', marginTop: '4px', margin: '4px 0 0' }}>{dica}</p>}
    </div>
  )
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
      setErro(`Erro ao gerar: ${error.message}`)
      setGerando(false)
      return
    }

    router.push('/mensalidades')
  }

  const novosCount  = preview?.filter(p => !p.jaExiste).length ?? 0
  const existeCount = preview?.filter(p => p.jaExiste).length  ?? 0

  return (
    <div style={{ maxWidth: '820px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/mensalidades')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', padding: '4px' }}>
          ←
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Gerar mensalidades</h1>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>Cria cobranças para todos os membros ativos e probatórios</p>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 1rem' }}>
          Parâmetros
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <InputGroup label="Mês de referência">
            <input type="month" value={mesAno} onChange={e => setMesAno(e.target.value)}
              style={inp} onFocus={fo} onBlur={bl}
            />
          </InputGroup>
          <InputGroup label="Dia de vencimento" dica="Ajustado automaticamente para o último dia do mês.">
            <input type="number" value={diaVenc} onChange={e => setDiaVenc(e.target.value)}
              min="1" max="31" placeholder="10"
              style={{ ...inp, maxWidth: '120px' }} onFocus={fo} onBlur={bl}
            />
          </InputGroup>
          <InputGroup label="Valor padrão (R$)" dica="Usado quando o membro não tem quota-parte definida.">
            <input type="number" value={valorPad} onChange={e => setValorPad(e.target.value)}
              min="0" step="0.01" placeholder="50,00"
              style={{ ...inp, maxWidth: '160px' }} onFocus={fo} onBlur={bl}
            />
          </InputGroup>
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={carregarPreview} disabled={carregando || carregandoPreview}
            style={{ padding: '9px 20px', background: '#635BFF', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: carregando || carregandoPreview ? 'not-allowed' : 'pointer', opacity: carregando || carregandoPreview ? 0.7 : 1 }}>
            {carregandoPreview ? '⏳ Carregando…' : '👁 Visualizar cobranças'}
          </button>
          {carregando && <span style={{ fontSize: '12px', color: '#888' }}>Carregando membros…</span>}
        </div>
      </div>

      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '1rem' }}>
          ⚠ {erro}
        </div>
      )}

      {preview && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
            <div style={{ background: '#EEF0FF', border: '1px solid #635BFF33', borderRadius: '10px', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#4840CC', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Novas cobranças</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#4840CC', margin: '2px 0' }}>{novosCount}</div>
              <div style={{ fontSize: '11px', color: '#4840CC99' }}>
                Total: {BRL(preview.filter(p => !p.jaExiste).reduce((s, p) => s + Number(p.valor), 0))}
              </div>
            </div>
            <div style={{ background: '#f5f5f2', border: '1px solid #e5e3dc', borderRadius: '10px', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Já existem</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#888', margin: '2px 0' }}>{existeCount}</div>
              <div style={{ fontSize: '11px', color: '#aaa' }}>serão ignorados</div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.25rem' }}>
            <div style={{ padding: '10px 16px', background: '#fafaf8', borderBottom: '1px solid #e5e3dc', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', gap: '0' }}>
              {['Membro', 'Status', 'Quota-parte', 'Valor cobrança'].map(h => (
                <div key={h} style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
              ))}
            </div>
            {preview.map((p, i) => (
              <div key={p.coop.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', alignItems: 'center', padding: '10px 16px', borderTop: i > 0 ? '1px solid #f0eeea' : 'none', background: p.jaExiste ? '#fafaf8' : '#fff', opacity: p.jaExiste ? 0.55 : 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.coop.nome_completo}
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: p.coop.status === 'ativo' ? '#4840CC' : '#185FA5', background: p.coop.status === 'ativo' ? '#EEF0FF' : '#E6F1FB', padding: '2px 7px', borderRadius: '6px' }}>
                    {p.coop.status === 'ativo' ? 'Ativo' : 'Probatório'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#555' }}>
                  {p.coop.quota_parte && Number(p.coop.quota_parte) > 0 ? BRL(Number(p.coop.quota_parte)) : <span style={{ color: '#aaa' }}>—</span>}
                </div>
                {p.jaExiste ? (
                  <div style={{ fontSize: '11px', color: '#aaa', fontStyle: 'italic' }}>já existe</div>
                ) : (
                  <input
                    type="number" min="0" step="0.01"
                    value={p.valor}
                    onChange={e => setPreview(prev => prev!.map(x => x.coop.id === p.coop.id ? { ...x, valor: e.target.value } : x))}
                    style={{ padding: '5px 8px', border: '1px solid #d5d3cc', borderRadius: '6px', fontSize: '13px', width: '100px', background: '#fafaf8', outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
            <button type="button" onClick={() => router.push('/mensalidades')}
              style={{ padding: '9px 20px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#555', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleGerar} disabled={gerando || novosCount === 0}
              style={{ padding: '9px 24px', border: 'none', borderRadius: '8px', background: gerando || novosCount === 0 ? '#9F9BFF' : '#635BFF', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: gerando || novosCount === 0 ? 'not-allowed' : 'pointer' }}>
              {gerando ? 'Gerando…' : `⚡ Gerar ${novosCount} cobrança${novosCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
