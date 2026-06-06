'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getProdutorCompleto, editarProdutor } from '@/lib/comercializacao/produtores.actions'
import { registrarConversaoESaque, registrarSaqueFinanceiro } from '@/lib/comercializacao/caixa.actions'
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

  // Modal pagar
  const [modalPagar, setModalPagar] = useState(false)
  const [tipoPagamento, setTipoPagamento] = useState<'produto' | 'financeiro'>('produto')
  const [formPagar, setFormPagar] = useState({
    produto_id: '',
    quantidade: '',
    preco_kg: '',
    forma_pagamento: 'especie' as 'especie' | 'pix',
    chave_pix: '',
    valor_saque: '',
  })
  const [cotacao, setCotacao] = useState<number | null>(null)
  const [pagando, setPagando] = useState(false)
  const [erroPagar, setErroPagar] = useState('')
  const [okPagar, setOkPagar] = useState('')

  // Edição inline
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
          cpf: res.produtor.cpf ?? '',
          telefone: res.produtor.telefone ?? '',
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
    } finally {
      setCarregando(false)
    }
  }

  async function handleCarregarCotacao(produto_id: string) {
    if (!produto_id) return
    const cot = await getCotacaoHoje(produto_id)
    if (cot) {
      const preco = produtor?.tipo === 'cooperado' ? cot.preco_cooperado : cot.preco_externo
      setCotacao(preco)
      setFormPagar(f => ({ ...f, preco_kg: preco.toString() }))
    } else {
      setCotacao(null)
      setFormPagar(f => ({ ...f, preco_kg: '' }))
    }
  }

  async function handlePagar() {
    if (!sessao || !conta) return
    setPagando(true)
    setErroPagar('')
    try {
      if (tipoPagamento === 'produto') {
        if (!formPagar.produto_id || !formPagar.quantidade || !formPagar.preco_kg) {
          setErroPagar('Preencha produto, quantidade e preço.'); setPagando(false); return
        }
        const qtd = parseFloat(formPagar.quantidade)
        const preco = parseFloat(formPagar.preco_kg)
        await registrarConversaoESaque({
          sessao_id: sessao.id,
          produtor_id: id,
          conta_id: conta.id,
          produto_id: formPagar.produto_id,
          quantidade_produto: qtd,
          preco_unitario: preco,
          valor_financeiro: parseFloat((qtd * preco).toFixed(2)),
          forma_pagamento: formPagar.forma_pagamento,
          chave_pix: formPagar.chave_pix || undefined,
        })
      } else {
        if (!formPagar.valor_saque) {
          setErroPagar('Informe o valor do saque.'); setPagando(false); return
        }
        await registrarSaqueFinanceiro({
          sessao_id: sessao.id,
          conta_id: conta.id,
          valor_financeiro: parseFloat(formPagar.valor_saque),
          forma_pagamento: formPagar.forma_pagamento,
          chave_pix: formPagar.chave_pix || undefined,
        })
      }
      setOkPagar('Pagamento registrado com sucesso.')
      setModalPagar(false)
      setTimeout(() => setOkPagar(''), 4000)
      await carregar()
    } catch (e: any) {
      setErroPagar(e.message)
    } finally {
      setPagando(false)
    }
  }

  async function handleSalvarEdicao() {
    if (!produtor) return
    setSalvando(true)
    setErroEdit('')
    try {
      await editarProdutor(produtor.id, formEdit as any)
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

  const temSaldoProduto = (conta?.saldos_produto ?? []).some(s => s.quantidade > 0)
  const temSaldoFinanceiro = (conta?.saldo_financeiro ?? 0) > 0
  const podePagar = sessao !== null && (temSaldoProduto || temSaldoFinanceiro)

  const inp = {
    padding: '8px 12px', border: '1px solid #e5e3dc',
    borderRadius: '8px', fontSize: '14px', width: '100%',
    boxSizing: 'border-box' as const,
  }

  if (carregando) return <div style={{ padding: '32px' }}>Carregando...</div>
  if (!produtor) return <div style={{ padding: '32px' }}>Produtor não encontrado.</div>

  const valorEstimado = formPagar.quantidade && formPagar.preco_kg
    ? parseFloat(formPagar.quantidade) * parseFloat(formPagar.preco_kg)
    : null

  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => router.push('/comercializacao/produtores')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b6b6b', padding: '0 4px' }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: '#1a1a1a' }}>{produtor.nome}</h1>
          <div style={{ fontSize: '13px', color: '#6b6b6b', marginTop: '2px' }}>
            {produtor.tipo === 'cooperado' ? 'Cooperado' : 'Externo'}
            {produtor.municipio && ` · ${produtor.municipio}`}
            {produtor.cpf && ` · ${produtor.cpf}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {podePagar && (
            <button
              onClick={() => { setModalPagar(true); setErroPagar(''); setOkPagar('') }}
              style={{ padding: '8px 18px', background: COR, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              💰 Pagar produtor
            </button>
          )}
          {!sessao && (temSaldoProduto || temSaldoFinanceiro) && (
            <div style={{ fontSize: '12px', color: '#6b6b6b', alignSelf: 'center', background: '#f0eeea', padding: '6px 12px', borderRadius: '8px' }}>
              Abra o caixa para pagar
            </div>
          )}
        </div>
      </div>

      {okPagar && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', color: '#166534', marginBottom: '16px' }}>
          ✓ {okPagar}
        </div>
      )}

      {/* Saldos */}
      {conta && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {(conta.saldos_produto ?? []).filter(s => s.quantidade > 0).map(s => (
            <div key={s.produtos.id} style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: COR }}>{s.quantidade.toFixed(1)} {s.produtos.unidade}</div>
              <div style={{ fontSize: '12px', color: '#6b6b6b', marginTop: '4px' }}>{s.produtos.nome}</div>
            </div>
          ))}
          {conta.saldo_financeiro > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#166534' }}>R$ {conta.saldo_financeiro.toFixed(2)}</div>
              <div style={{ fontSize: '12px', color: '#6b6b6b', marginTop: '4px' }}>Saldo financeiro</div>
            </div>
          )}
          {!temSaldoProduto && !temSaldoFinanceiro && (
            <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '16px 20px', fontSize: '13px', color: '#6b6b6b' }}>
              Sem saldo no momento
            </div>
          )}
        </div>
      )}

      {/* Abas */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e5e3dc', marginBottom: '20px' }}>
        {(['extrato', 'dados'] as const).map(a => (
          <button key={a} onClick={() => setAba(a)} style={{
            padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px',
            borderBottom: aba === a ? `2px solid ${COR}` : '2px solid transparent',
            color: aba === a ? COR : '#6b6b6b', fontWeight: aba === a ? 600 : 400,
            marginBottom: '-1px',
          }}>
            {a === 'extrato' ? 'Extrato' : 'Dados cadastrais'}
          </button>
        ))}
      </div>

      {/* ABA: EXTRATO */}
      {aba === 'extrato' && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
          {extrato.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6b6b6b', fontSize: '13px' }}>
              Nenhuma movimentação registrada.
            </div>
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
                      {m.quantidade_produto ? `${m.quantidade_produto} ${m.produtos?.unidade ?? 'kg'}` : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500,
                      color: m.valor_financeiro
                        ? m.tipo === 'conversao' ? '#166534' : '#991b1b'
                        : '#1a1a1a'
                    }}>
                      {m.valor_financeiro ? `R$ ${Math.abs(m.valor_financeiro).toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ABA: DADOS CADASTRAIS */}
      {aba === 'dados' && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>Dados cadastrais</span>
            {!editando && (
              <button
                onClick={() => setEditando(true)}
                style={{ fontSize: '13px', color: COR, background: 'none', border: `1px solid ${COR}`, borderRadius: '8px', padding: '6px 14px', cursor: 'pointer' }}
              >
                ✏️ Editar
              </button>
            )}
          </div>

          {okEdit && (
            <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#166534', marginBottom: '16px' }}>
              ✓ {okEdit}
            </div>
          )}

          {!editando ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
              {[
                ['Nome', produtor.nome],
                ['CPF', produtor.cpf ?? '—'],
                ['Telefone', produtor.telefone ?? '—'],
                ['E-mail', produtor.email ?? '—'],
                ['Município', produtor.municipio ?? '—'],
                ['Endereço', produtor.endereco ?? '—'],
                ['Propriedade', produtor.nome_propriedade ?? '—'],
                ['Tipo de posse', produtor.tipo_posse ? TIPO_POSSE_LABEL[produtor.tipo_posse] : '—'],
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
              {[
                ['Nome', 'nome'],
                ['CPF', 'cpf'],
                ['Telefone', 'telefone'],
                ['E-mail', 'email'],
                ['Município', 'municipio'],
                ['Endereço', 'endereco'],
                ['Propriedade', 'nome_propriedade'],
                ['IE Produtor Rural', 'ie_produtor_rural'],
                ['Chave Pix', 'chave_pix'],
                ['Banco', 'banco'],
                ['Agência', 'agencia'],
                ['Conta', 'conta_bancaria'],
              ].map(([label, campo]) => (
                <div key={campo} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>{label}</label>
                  <input
                    value={(formEdit as any)[campo] ?? ''}
                    onChange={e => setFormEdit(f => ({ ...f, [campo]: e.target.value }))}
                    style={inp}
                  />
                </div>
              ))}
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
                  <input type="number" min="1" max="100" step="0.5"
                    value={(formEdit as any).percentual_posse ?? ''}
                    onChange={e => setFormEdit(f => ({ ...f, percentual_posse: parseFloat(e.target.value) }))}
                    style={inp}
                  />
                </div>
              )}
              {erroEdit && (
                <div style={{ gridColumn: '1 / -1', color: '#991b1b', fontSize: '13px' }}>{erroEdit}</div>
              )}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => setEditando(false)} style={{ padding: '8px 16px', border: '1px solid #e5e3dc', borderRadius: '8px', background: '#fff', fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSalvarEdicao} disabled={salvando} style={{ padding: '8px 18px', background: COR, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Pagar */}
      {modalPagar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}
          onClick={() => setModalPagar(false)}>
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600 }}>Pagar produtor</span>
              <button onClick={() => setModalPagar(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>×</button>
            </div>

            {/* Tipo de pagamento */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {temSaldoProduto && (
                <button
                  onClick={() => setTipoPagamento('produto')}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    border: `2px solid ${tipoPagamento === 'produto' ? COR : '#e5e3dc'}`,
                    background: tipoPagamento === 'produto' ? '#FEF3C7' : '#fff',
                    color: tipoPagamento === 'produto' ? COR : '#555',
                  }}
                >
                  Converter produto
                </button>
              )}
              {temSaldoFinanceiro && (
                <button
                  onClick={() => setTipoPagamento('financeiro')}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    border: `2px solid ${tipoPagamento === 'financeiro' ? '#166534' : '#e5e3dc'}`,
                    background: tipoPagamento === 'financeiro' ? '#dcfce7' : '#fff',
                    color: tipoPagamento === 'financeiro' ? '#166534' : '#555',
                  }}
                >
                  Saldo financeiro
                </button>
              )}
            </div>

            {/* Converter produto */}
            {tipoPagamento === 'produto' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b6b6b', display: 'block', marginBottom: '4px' }}>Produto</label>
                  <select
                    value={formPagar.produto_id}
                    onChange={e => { setFormPagar(f => ({ ...f, produto_id: e.target.value })); handleCarregarCotacao(e.target.value) }}
                    style={inp}
                  >
                    <option value="">Selecionar...</option>
                    {(conta?.saldos_produto ?? []).filter(s => s.quantidade > 0).map(s => (
                      <option key={s.produtos.id} value={s.produtos.id}>
                        {s.produtos.nome} ({s.quantidade.toFixed(1)} {s.produtos.unidade})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b6b6b', display: 'block', marginBottom: '4px' }}>Quantidade (kg)</label>
                    <input type="number" step="0.001" placeholder="0,000" value={formPagar.quantidade}
                      onChange={e => setFormPagar(f => ({ ...f, quantidade: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b6b6b', display: 'block', marginBottom: '4px' }}>
                      Preço/kg (R$) {cotacao && <span style={{ color: COR }}>· cotação: R$ {cotacao.toFixed(2)}</span>}
                    </label>
                    <input type="number" step="0.01" placeholder="0,00" value={formPagar.preco_kg}
                      onChange={e => setFormPagar(f => ({ ...f, preco_kg: e.target.value }))} style={inp} />
                  </div>
                </div>
                {valorEstimado !== null && (
                  <div style={{ background: '#FEF3C7', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', fontWeight: 600, color: COR }}>
                    Total: R$ {valorEstimado.toFixed(2)}
                  </div>
                )}
              </div>
            )}

            {/* Saque financeiro */}
            {tipoPagamento === 'financeiro' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '13px', color: '#6b6b6b' }}>
                  Saldo disponível: <strong style={{ color: '#166534' }}>R$ {(conta?.saldo_financeiro ?? 0).toFixed(2)}</strong>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b6b6b', display: 'block', marginBottom: '4px' }}>Valor (R$)</label>
                  <input type="number" step="0.01" placeholder="0,00" value={formPagar.valor_saque}
                    onChange={e => setFormPagar(f => ({ ...f, valor_saque: e.target.value }))} style={inp} />
                </div>
              </div>
            )}

            {/* Forma de pagamento */}
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b6b6b', display: 'block', marginBottom: '4px' }}>Forma de pagamento</label>
                <select value={formPagar.forma_pagamento} onChange={e => setFormPagar(f => ({ ...f, forma_pagamento: e.target.value as any }))} style={inp}>
                  <option value="especie">Espécie</option>
                  <option value="pix">Pix</option>
                </select>
              </div>
              {formPagar.forma_pagamento === 'pix' && (
                <div>
                  <label style={{ fontSize: '12px', color: '#6b6b6b', display: 'block', marginBottom: '4px' }}>Chave Pix</label>
                  <input value={formPagar.chave_pix || produtor.chave_pix || ''}
                    onChange={e => setFormPagar(f => ({ ...f, chave_pix: e.target.value }))} style={inp} />
                </div>
              )}
            </div>

            {erroPagar && (
              <div style={{ marginTop: '12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#dc2626' }}>
                {erroPagar}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setModalPagar(false)} style={{ padding: '8px 16px', border: '1px solid #e5e3dc', borderRadius: '8px', background: '#fff', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handlePagar} disabled={pagando} style={{ padding: '8px 20px', background: pagando ? '#b45309' : COR, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: pagando ? 'not-allowed' : 'pointer' }}>
                {pagando ? 'Processando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}