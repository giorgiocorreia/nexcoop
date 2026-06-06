'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getProdutorCompleto, editarProdutor } from '@/lib/comercializacao/produtores.actions'
import { getCotacaoHoje } from '@/lib/comercializacao/cotacoes.actions'

const COR = '#92400e'

const TIPO_POSSE_LABEL: Record<string, string> = {
  proprietario: 'Proprietário',
  meeiro: 'Meeiro',
  arrendatario: 'Arrendatário',
}

const TIPO_LABEL: Record<string, string> = {
  entrega: 'Entrega',
  conversao: 'Conversão',
  saque_especie: 'Saque espécie',
  saque_pix: 'Saque Pix',
  ajuste_produto: 'Ajuste produto',
  ajuste_financeiro: 'Ajuste financeiro',
  estorno: 'Estorno',
}

type Produtor = {
  id: string; nome: string; cpf: string | null; telefone: string | null
  email: string | null; municipio: string | null; endereco: string | null
  tipo: string; area_total_ha: number | null; area_cacau_ha: number | null
  tem_certificacao: boolean; tipo_certificacao: string | null
  banco: string | null; agencia: string | null; conta_bancaria: string | null
  tipo_conta: string | null; chave_pix: string | null; ativo: boolean
  nome_propriedade: string | null; tipo_posse: string | null
  percentual_posse: number | null; ie_produtor_rural: string | null
}

type SaldoProduto = {
  quantidade: number
  produtos: { id: string; nome: string; unidade: string }
}

type Conta = {
  id: string; saldo_financeiro: number
  saldos_produto: SaldoProduto[]
}

type Movimentacao = {
  id: string; tipo: string; quantidade_produto: number | null
  valor_financeiro: number | null; forma_pagamento: string | null
  created_at: string; observacoes: string | null
  produtos: { nome: string; unidade: string } | null
}

type Sessao = { id: string; status: string }

type PrevisaoSaldo = {
  produto_id: string
  nome: string
  unidade: string
  quantidade: number
  preco: number | null
  valor_estimado: number | null
}

function mascararCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function mascararTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

function exibirCPF(cpf: string | null) {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  return d.length === 11 ? mascararCPF(d) : cpf
}

function exibirTelefone(tel: string | null) {
  if (!tel) return '—'
  return mascararTelefone(tel)
}

function formatarKg(v: number): { inteiro: string; decimal: string } {
  const s = v.toFixed(3).replace(/\.?0+$/, '')
  const [int, dec] = s.split('.')
  return { inteiro: int, decimal: dec ? `,${dec}` : '' }
}

function KgDisplay({ valor, fontSize = 22, cor }: { valor: number; fontSize?: number; cor?: string }) {
  const { inteiro, decimal } = formatarKg(valor)
  return (
    <span style={{ color: cor ?? COR }}>
      <span style={{ fontSize, fontWeight: 700 }}>{inteiro}</span>
      <span style={{ fontSize: fontSize * 0.6, fontWeight: 600 }}>{decimal}</span>
      <span style={{ fontSize: fontSize * 0.55, fontWeight: 400, marginLeft: 2 }}> kg</span>
    </span>
  )
}

export default function PerfilProdutorPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [produtor, setProdutor] = useState<Produtor | null>(null)
  const [conta, setConta] = useState<Conta | null>(null)
  const [extrato, setExtrato] = useState<Movimentacao[]>([])
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<'extrato' | 'dados'>('extrato')

  const [previsoes, setPrevisoes] = useState<PrevisaoSaldo[]>([])
  const [carregandoPrevisao, setCarregandoPrevisao] = useState(false)

  const [editando, setEditando] = useState(false)
  const [formEdit, setFormEdit] = useState<Partial<Produtor>>({})
  const [salvando, setSalvando] = useState(false)
  const [erroEdit, setErroEdit] = useState('')
  const [okEdit, setOkEdit] = useState('')

  useEffect(() => { carregar() }, [id])

  async function carregar() {
    setCarregando(true)
    try {
      const res = await getProdutorCompleto(id)
      setProdutor(res.produtor as unknown as Produtor)
      setConta(res.conta as unknown as Conta | null)
      setExtrato(res.extrato as unknown as Movimentacao[])
      setSessao(res.sessaoAberta as unknown as Sessao | null)
      if (res.produtor) {
        setFormEdit({
          nome: res.produtor.nome,
          cpf: res.produtor.cpf ? mascararCPF(res.produtor.cpf) : '',
          telefone: res.produtor.telefone ? mascararTelefone(res.produtor.telefone) : '',
          email: res.produtor.email ?? '',
          municipio: res.produtor.municipio ?? '',
          endereco: res.produtor.endereco ?? '',
          nome_propriedade: res.produtor.nome_propriedade ?? '',
          tipo_posse: res.produtor.tipo_posse ?? '',
          percentual_posse: res.produtor.percentual_posse ?? undefined,
          ie_produtor_rural: res.produtor.ie_produtor_rural ?? '',
          chave_pix: res.produtor.chave_pix ?? '',
          banco: res.produtor.banco ?? '',
          agencia: res.produtor.agencia ?? '',
          conta_bancaria: res.produtor.conta_bancaria ?? '',
        } as any)
      }
      if (res.conta) {
        carregarPrevisoes(res.conta as unknown as Conta, res.produtor?.tipo ?? 'externo')
      }
    } finally {
      setCarregando(false)
    }
  }

  async function carregarPrevisoes(contaDados: Conta, tipoProdutor: string) {
    const saldosComProduto = (contaDados.saldos_produto ?? []).filter(s => s.quantidade > 0)
    if (saldosComProduto.length === 0) return
    setCarregandoPrevisao(true)
    try {
      const lista: PrevisaoSaldo[] = await Promise.all(
        saldosComProduto.map(async (s) => {
          const cot = await getCotacaoHoje(s.produtos.id)
          const preco = cot
            ? (tipoProdutor === 'cooperado' ? (cot as any).preco_cooperado : (cot as any).preco_externo)
            : null
          return {
            produto_id: s.produtos.id,
            nome: s.produtos.nome,
            unidade: s.produtos.unidade,
            quantidade: s.quantidade,
            preco,
            valor_estimado: preco !== null ? parseFloat((s.quantidade * preco).toFixed(2)) : null,
          }
        })
      )
      setPrevisoes(lista)
    } finally {
      setCarregandoPrevisao(false)
    }
  }

  async function handleSalvarEdicao() {
    if (!produtor) return
    setSalvando(true)
    setErroEdit('')
    try {
      const payload = {
        ...formEdit,
        cpf: (formEdit as any).cpf ? (formEdit as any).cpf.replace(/\D/g, '') : undefined,
        telefone: (formEdit as any).telefone ? (formEdit as any).telefone.replace(/\D/g, '') : undefined,
      }
      await editarProdutor(produtor.id, payload as any)
      setOkEdit('Dados atualizados.')
      setEditando(false)
      setTimeout(() => setOkEdit(''), 3000)
      await carregar()
    } catch (e: any) {
      setErroEdit(e.message)
    } finally {
      setSalvando(false)
    }
  }

  function irParaCaixa(acao: 'entrega' | 'receber' | 'saque') {
    router.push(`/comercializacao/caixa?produtor_id=${id}&acao=${acao}`)
  }

  const temSaldoProduto = (conta?.saldos_produto ?? []).some(s => s.quantidade > 0)
  const temSaldoFinanceiro = (conta?.saldo_financeiro ?? 0) > 0
  const totalPrevisao = previsoes.reduce((acc, p) => acc + (p.valor_estimado ?? 0), 0)

  const inp: React.CSSProperties = {
    padding: '8px 12px', border: '1px solid #e5e3dc',
    borderRadius: '8px', fontSize: '14px', width: '100%',
    boxSizing: 'border-box',
  }

  if (carregando) return <div style={{ padding: '32px' }}>Carregando...</div>
  if (!produtor) return <div style={{ padding: '32px' }}>Produtor não encontrado.</div>

  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => router.push('/comercializacao/produtores')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b6b', fontSize: '14px', padding: '4px 0', whiteSpace: 'nowrap' }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>←</span> Voltar
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: '#1a1a1a' }}>{produtor.nome}</h1>
          <div style={{ fontSize: '13px', color: '#6b6b6b', marginTop: '2px' }}>
            {produtor.tipo === 'cooperado' ? 'Cooperado' : 'Externo'}
            {produtor.municipio && ` · ${produtor.municipio}`}
            {produtor.cpf && ` · ${exibirCPF(produtor.cpf)}`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => irParaCaixa('entrega')}
            style={{ padding: '8px 16px', background: '#fff', color: COR, border: `1px solid ${COR}`, borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            ↓ Registrar entrega
          </button>

          {temSaldoProduto && (
            <button
              onClick={() => irParaCaixa('receber')}
              style={{ padding: '8px 16px', background: COR, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              ↑ Pagar produtor
            </button>
          )}

          <button
            onClick={() => temSaldoFinanceiro ? irParaCaixa('saque') : undefined}
            disabled={!temSaldoFinanceiro}
            title={temSaldoFinanceiro ? 'Sacar saldo financeiro' : 'Sem saldo financeiro'}
            style={{
              padding: '8px 16px',
              background: temSaldoFinanceiro ? '#166534' : '#f1f0eb',
              color: temSaldoFinanceiro ? '#fff' : '#9a9a9a',
              border: temSaldoFinanceiro ? 'none' : '1px solid #e5e3dc',
              borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              cursor: temSaldoFinanceiro ? 'pointer' : 'not-allowed',
            }}
          >
            $ Saque financeiro
          </button>

          {!sessao && (
            <div style={{ fontSize: '12px', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: '8px' }}>
              ⚠ Caixa fechado
            </div>
          )}
        </div>
      </div>

      {okEdit && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', color: '#166534', marginBottom: '16px' }}>
          ✓ {okEdit}
        </div>
      )}

      {conta && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {temSaldoFinanceiro && (
            <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px 20px', minWidth: '160px' }}>
              <div style={{ fontSize: '11px', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Saldo financeiro</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#166534' }}>R$ {conta.saldo_financeiro.toFixed(2)}</div>
            </div>
          )}

          {(conta.saldos_produto ?? []).filter(s => s.quantidade > 0).map(s => {
            const prev = previsoes.find(p => p.produto_id === s.produtos.id)
            return (
              <div key={s.produtos.id} style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px 20px', minWidth: '180px' }}>
                <div style={{ fontSize: '11px', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{s.produtos.nome}</div>
                <KgDisplay valor={s.quantidade} fontSize={22} cor={COR} />
                {carregandoPrevisao ? (
                  <div style={{ fontSize: '12px', color: '#9a9a9a', marginTop: '6px' }}>calculando...</div>
                ) : prev ? (
                  prev.valor_estimado !== null ? (
                    <div style={{ fontSize: '12px', color: '#6b6b6b', marginTop: '6px' }}>
                      ≈ <strong style={{ color: '#166534' }}>R$ {prev.valor_estimado.toFixed(2)}</strong>
                      <span style={{ marginLeft: '4px', color: '#9a9a9a' }}>@ R$ {prev.preco?.toFixed(2)}/kg</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#9a9a9a', marginTop: '6px' }}>sem cotação hoje</div>
                  )
                ) : null}
              </div>
            )
          })}

          {previsoes.filter(p => p.valor_estimado !== null).length > 1 && (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px', minWidth: '160px' }}>
              <div style={{ fontSize: '11px', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Total estimado</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: COR }}>R$ {(totalPrevisao + conta.saldo_financeiro).toFixed(2)}</div>
              <div style={{ fontSize: '12px', color: '#6b6b6b', marginTop: '4px' }}>produto + financeiro</div>
            </div>
          )}

          {!temSaldoProduto && !temSaldoFinanceiro && (
            <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px 20px', fontSize: '13px', color: '#6b6b6b' }}>
              Sem saldo no momento
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e5e3dc', marginBottom: '20px' }}>
        {(['extrato', 'dados'] as const).map(a => (
          <button key={a} onClick={() => setAba(a)} style={{
            padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px',
            borderBottom: aba === a ? `2px solid ${COR}` : '2px solid transparent',
            color: aba === a ? COR : '#6b6b6b', fontWeight: aba === a ? 600 : 400, marginBottom: '-1px',
          }}>
            {a === 'extrato' ? 'Extrato' : 'Dados cadastrais'}
          </button>
        ))}
      </div>

      {aba === 'extrato' && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
          {extrato.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6b6b6b', fontSize: '13px' }}>Nenhuma movimentação registrada.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500 }}>Data/Hora</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500 }}>Operação</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500 }}>Quantidade</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500 }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {extrato.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                    <td style={{ padding: '10px 16px', color: '#6b6b6b' }}>
                      {new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div>{TIPO_LABEL[m.tipo] ?? m.tipo}</div>
                      {m.observacoes && <div style={{ fontSize: '11px', color: '#9a9a9a', marginTop: '2px' }}>{m.observacoes}</div>}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6b6b6b' }}>
                      {m.quantidade_produto ? (() => {
                        const { inteiro, decimal } = formatarKg(m.quantidade_produto)
                        return <span>{inteiro}<span style={{ fontSize: '0.8em' }}>{decimal}</span> {m.produtos?.unidade ?? 'kg'}</span>
                      })() : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: m.valor_financeiro ? (m.tipo === 'conversao' ? '#166534' : '#991b1b') : '#1a1a1a' }}>
                      {m.valor_financeiro ? `R$ ${Math.abs(m.valor_financeiro).toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {aba === 'dados' && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>Dados cadastrais</span>
            {!editando && (
              <button onClick={() => setEditando(true)} style={{ fontSize: '13px', color: COR, background: 'none', border: `1px solid ${COR}`, borderRadius: '8px', padding: '6px 14px', cursor: 'pointer' }}>
                ✏️ Editar
              </button>
            )}
          </div>

          {!editando ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
              {[
                ['Nome', produtor.nome],
                ['CPF', exibirCPF(produtor.cpf)],
                ['Telefone', exibirTelefone(produtor.telefone)],
                ['E-mail', produtor.email ?? '—'],
                ['Município', produtor.municipio ?? '—'],
                ['Endereço', produtor.endereco ?? '—'],
                ['Propriedade', produtor.nome_propriedade ?? '—'],
                ['Tipo de posse', produtor.tipo_posse ? TIPO_POSSE_LABEL[produtor.tipo_posse] ?? produtor.tipo_posse : '—'],
                ['Percentual', produtor.percentual_posse ? `${produtor.percentual_posse}%` : '—'],
                ['IE Produtor Rural', produtor.ie_produtor_rural ?? '—'],
                ['Área total', produtor.area_total_ha ? `${produtor.area_total_ha} ha` : '—'],
                ['Área cacau', produtor.area_cacau_ha ? `${produtor.area_cacau_ha} ha` : '—'],
                ['Certificação', produtor.tem_certificacao ? `✓ ${produtor.tipo_certificacao ?? ''}` : '—'],
                ['Chave Pix', produtor.chave_pix ?? '—'],
                ['Banco', produtor.banco ?? '—'],
                ['Agência / Conta', produtor.agencia ? `${produtor.agencia} / ${produtor.conta_bancaria ?? ''}` : '—'],
              ].map(([label, valor]) => (
                <div key={label}>
                  <div style={{ fontSize: '11px', color: '#9a9a9a', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{ color: '#1a1a1a' }}>{valor}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Nome</label>
                <input value={(formEdit as any).nome ?? ''} onChange={e => setFormEdit(f => ({ ...f, nome: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>CPF</label>
                <input value={(formEdit as any).cpf ?? ''} onChange={e => setFormEdit(f => ({ ...f, cpf: mascararCPF(e.target.value) }))} placeholder="000.000.000-00" style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Telefone</label>
                <input value={(formEdit as any).telefone ?? ''} onChange={e => setFormEdit(f => ({ ...f, telefone: mascararTelefone(e.target.value) }))} placeholder="(73) 99999-0000" style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>E-mail</label>
                <input value={(formEdit as any).email ?? ''} onChange={e => setFormEdit(f => ({ ...f, email: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Município</label>
                <input value={(formEdit as any).municipio ?? ''} onChange={e => setFormEdit(f => ({ ...f, municipio: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Endereço</label>
                <input value={(formEdit as any).endereco ?? ''} onChange={e => setFormEdit(f => ({ ...f, endereco: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Propriedade</label>
                <input value={(formEdit as any).nome_propriedade ?? ''} onChange={e => setFormEdit(f => ({ ...f, nome_propriedade: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>IE Produtor Rural</label>
                <input value={(formEdit as any).ie_produtor_rural ?? ''} onChange={e => setFormEdit(f => ({ ...f, ie_produtor_rural: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Tipo de posse</label>
                <select value={(formEdit as any).tipo_posse ?? ''} onChange={e => setFormEdit(f => ({ ...f, tipo_posse: e.target.value }))} style={inp}>
                  <option value="">Selecionar...</option>
                  <option value="proprietario">Proprietário</option>
                  <option value="meeiro">Meeiro</option>
                  <option value="arrendatario">Arrendatário</option>
                </select>
              </div>
              {(formEdit as any).tipo_posse && (formEdit as any).tipo_posse !== 'proprietario' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Percentual (%)</label>
                  <input type="number" min="1" max="100" step="0.5" value={(formEdit as any).percentual_posse ?? ''} onChange={e => setFormEdit(f => ({ ...f, percentual_posse: parseFloat(e.target.value) }))} style={inp} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Chave Pix</label>
                <input value={(formEdit as any).chave_pix ?? ''} onChange={e => setFormEdit(f => ({ ...f, chave_pix: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Banco</label>
                <input value={(formEdit as any).banco ?? ''} onChange={e => setFormEdit(f => ({ ...f, banco: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Agência</label>
                <input value={(formEdit as any).agencia ?? ''} onChange={e => setFormEdit(f => ({ ...f, agencia: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Conta</label>
                <input value={(formEdit as any).conta_bancaria ?? ''} onChange={e => setFormEdit(f => ({ ...f, conta_bancaria: e.target.value }))} style={inp} />
              </div>
              {erroEdit && (
                <div style={{ gridColumn: '1 / -1', color: '#991b1b', fontSize: '13px' }}>{erroEdit}</div>
              )}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => setEditando(false)} style={{ padding: '8px 16px', border: '1px solid #e5e3dc', borderRadius: '8px', background: '#fff', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSalvarEdicao} disabled={salvando} style={{ padding: '8px 18px', background: COR, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}