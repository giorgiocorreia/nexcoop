'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { LojaFornecedor, LojaProduto, LojaUnidade } from '@/types/database'
import { criarProduto, atualizarProduto, toggleProdutoAtivo, excluirProduto } from '@/lib/loja/actions'

const VERDE = '#1D9E75'

const UNIDADES: { value: LojaUnidade; label: string }[] = [
  { value: 'kg',      label: 'Quilograma (kg)' },
  { value: 'litro',   label: 'Litro (L)' },
  { value: 'unidade', label: 'Unidade (un)' },
  { value: 'saco',    label: 'Saco' },
  { value: 'caixa',   label: 'Caixa' },
]

const CATEGORIAS = [
  'Adubos e fertilizantes', 'Agrotóxicos', 'Sementes e mudas',
  'Rações e suplementos', 'Medicamentos veterinários', 'Ferramentas e equipamentos',
  'Embalagens', 'Produtos orgânicos', 'Outros',
]

type Mode = 'create' | 'edit' | 'view'

interface FormValues {
  nome:                   string
  categoria:              string
  unidade:                LojaUnidade
  preco_normal:           string
  desconto_cooperado:     boolean
  desconto_cooperado_pct: string
  estoque_minimo:         string
  fornecedor_id:          string
}

interface Props {
  mode:        Mode
  produto?:    LojaProduto
  fornecedores: Pick<LojaFornecedor, 'id' | 'nome'>[]
  onClose:     () => void
  onSalvo:     () => void
}

const input: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: '13px',
  border: '1px solid #d5d3cc', borderRadius: '8px',
  background: '#fff', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: '500',
  color: '#555', marginBottom: '5px',
}

const btnVerde: React.CSSProperties = {
  padding: '9px 20px', background: VERDE, color: '#fff',
  border: 'none', borderRadius: '8px', fontSize: '13px',
  fontWeight: '600', cursor: 'pointer',
}

const btnSecundario: React.CSSProperties = {
  padding: '9px 16px', background: 'transparent', color: '#555',
  border: '1px solid #d5d3cc', borderRadius: '8px',
  fontSize: '13px', cursor: 'pointer',
}

function parseBRL(v: string): number | null {
  if (!v?.trim()) return null
  const clean = v.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

function formatBRL(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function InfoLinha({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f5f3ef' }}>
      <span style={{ fontSize: '12px', color: '#888', fontWeight: '500' }}>{rotulo}</span>
      <span style={{ fontSize: '13px', color: '#1a1a1a' }}>{valor || '—'}</span>
    </div>
  )
}

export default function ProdutoModal({ mode: initialMode, produto, fornecedores, onClose, onSalvo }: Props) {
  const [mode, setMode]           = useState<Mode>(initialMode)
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState('')
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      nome:                   produto?.nome            ?? '',
      categoria:              produto?.categoria       ?? '',
      unidade:                produto?.unidade         ?? 'unidade',
      preco_normal:           produto?.preco_normal    != null ? String(produto.preco_normal).replace('.', ',') : '',
      desconto_cooperado:     produto?.desconto_cooperado     ?? false,
      desconto_cooperado_pct: produto?.desconto_cooperado_pct != null ? String(produto.desconto_cooperado_pct).replace('.', ',') : '',
      estoque_minimo:         produto?.estoque_minimo  != null ? String(produto.estoque_minimo).replace('.', ',') : '',
      fornecedor_id:          produto?.fornecedor_id   ?? '',
    },
  })

  useEffect(() => {
    reset({
      nome:                   produto?.nome            ?? '',
      categoria:              produto?.categoria       ?? '',
      unidade:                produto?.unidade         ?? 'unidade',
      preco_normal:           produto?.preco_normal    != null ? String(produto.preco_normal).replace('.', ',') : '',
      desconto_cooperado:     produto?.desconto_cooperado     ?? false,
      desconto_cooperado_pct: produto?.desconto_cooperado_pct != null ? String(produto.desconto_cooperado_pct).replace('.', ',') : '',
      estoque_minimo:         produto?.estoque_minimo  != null ? String(produto.estoque_minimo).replace('.', ',') : '',
      fornecedor_id:          produto?.fornecedor_id   ?? '',
    })
  }, [produto, reset])

  async function onSubmit(values: FormValues) {
    const precoNormal = parseBRL(values.preco_normal)
    if (precoNormal == null) { setErro('Informe um preço normal válido.'); return }

    const pct = values.desconto_cooperado ? parseBRL(values.desconto_cooperado_pct) : null
    if (values.desconto_cooperado && pct == null) { setErro('Informe o percentual de desconto cooperado.'); return }

    setSalvando(true)
    setErro('')
    const dados = {
      nome:                   values.nome.trim(),
      categoria:              values.categoria.trim() || null,
      unidade:                values.unidade,
      preco_normal:           precoNormal,
      desconto_cooperado:     values.desconto_cooperado,
      desconto_cooperado_pct: values.desconto_cooperado ? pct : null,
      estoque_minimo:         parseBRL(values.estoque_minimo),
      fornecedor_id:          values.fornecedor_id || null,
    }
    const res = mode === 'create'
      ? await criarProduto(dados)
      : await atualizarProduto(produto!.id, dados)

    setSalvando(false)
    if (res.error) { setErro(res.error); return }
    onSalvo()
    onClose()
  }

  async function handleToggleAtivo() {
    if (!produto) return
    setSalvando(true)
    await toggleProdutoAtivo(produto.id, !produto.ativo)
    setSalvando(false)
    onSalvo()
    onClose()
  }

  async function handleExcluir() {
    if (!produto) return
    setSalvando(true)
    const res = await excluirProduto(produto.id)
    setSalvando(false)
    if (res.error) { setErro(res.error); return }
    onSalvo()
    onClose()
  }

  const fornecedorNome = produto?.fornecedor_id
    ? fornecedores.find(f => f.id === produto.fornecedor_id)?.nome
    : null

  const estoqueStatus = produto && produto.estoque_minimo != null
    ? produto.estoque_atual < produto.estoque_minimo
      ? { label: 'Estoque baixo', cor: '#dc2626', bg: '#fef2f2' }
      : null
    : null

  const titulo = mode === 'create' ? 'Novo Produto'
    : mode === 'edit' ? 'Editar Produto'
    : produto?.nome ?? 'Produto'

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Cabeçalho */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e3dc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '600', color: VERDE, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
              Produto
            </div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
              {titulo}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
        </div>

        {/* Corpo */}
        <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', flex: 1 }}>

          {erro && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: '13px' }}>
              ⚠ {erro}
            </div>
          )}

          {/* Modo visualização */}
          {mode === 'view' && produto && (
            <div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                  background: produto.ativo ? '#dcfce7' : '#f5f3ef',
                  color: produto.ativo ? '#166534' : '#888',
                }}>
                  {produto.ativo ? 'Ativo' : 'Inativo'}
                </span>
                {estoqueStatus && (
                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: estoqueStatus.bg, color: estoqueStatus.cor }}>
                    {estoqueStatus.label}
                  </span>
                )}
              </div>

              <div style={{ background: '#f8f7f4', borderRadius: '10px', padding: '14px', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Estoque atual</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: estoqueStatus ? '#dc2626' : '#1a1a1a' }}>
                    {produto.estoque_atual.toLocaleString('pt-BR')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>{produto.unidade}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Preço normal</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>{formatBRL(produto.preco_normal)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Desc. cooperado</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: produto.desconto_cooperado ? VERDE : '#aaa' }}>
                    {produto.desconto_cooperado
                      ? produto.desconto_cooperado_pct != null ? `${produto.desconto_cooperado_pct}%` : 'Sim'
                      : '—'}
                  </div>
                </div>
              </div>

              <InfoLinha rotulo="Categoria"       valor={produto.categoria} />
              <InfoLinha rotulo="Unidade"         valor={UNIDADES.find(u => u.value === produto.unidade)?.label} />
              <InfoLinha rotulo="Estoque mínimo"  valor={produto.estoque_minimo != null ? `${produto.estoque_minimo.toLocaleString('pt-BR')} ${produto.unidade}` : null} />
              <InfoLinha rotulo="Fornecedor"      valor={fornecedorNome} />
              <div style={{ fontSize: '11px', color: '#bbb', marginTop: '12px', textAlign: 'right' }}>
                Cadastrado em {new Date(produto.criado_em).toLocaleDateString('pt-BR')}
              </div>
            </div>
          )}

          {/* Modo formulário */}
          {(mode === 'create' || mode === 'edit') && (
            <form id="form-produto" onSubmit={handleSubmit(onSubmit)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                <div>
                  <label style={labelStyle}>Nome *</label>
                  <input
                    style={{ ...input, borderColor: errors.nome ? '#fca5a5' : '#d5d3cc' }}
                    placeholder="Nome do produto"
                    {...register('nome', { required: 'Nome é obrigatório' })}
                  />
                  {errors.nome && <p style={{ fontSize: '11px', color: '#dc2626', margin: '4px 0 0' }}>{errors.nome.message}</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Categoria</label>
                    <select style={input} {...register('categoria')}>
                      <option value="">Selecionar…</option>
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Unidade *</label>
                    <select style={{ ...input, borderColor: errors.unidade ? '#fca5a5' : '#d5d3cc' }} {...register('unidade', { required: true })}>
                      {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Preço normal (R$) *</label>
                    <input
                      style={{ ...input, borderColor: errors.preco_normal ? '#fca5a5' : '#d5d3cc' }}
                      placeholder="0,00"
                      {...register('preco_normal', { required: 'Obrigatório' })}
                    />
                    {errors.preco_normal && <p style={{ fontSize: '11px', color: '#dc2626', margin: '4px 0 0' }}>{errors.preco_normal.message}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>Desconto cooperado</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <input type="checkbox" id="desconto_cooperado" {...register('desconto_cooperado')} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                      <label htmlFor="desconto_cooperado" style={{ fontSize: '13px', color: '#555', cursor: 'pointer', margin: 0 }}>Tem desconto</label>
                    </div>
                    <input
                      style={{ ...input, borderColor: errors.desconto_cooperado_pct ? '#fca5a5' : '#d5d3cc' }}
                      placeholder="% ex: 5"
                      inputMode="decimal"
                      {...register('desconto_cooperado_pct')}
                    />
                    {errors.desconto_cooperado_pct && <p style={{ fontSize: '11px', color: '#dc2626', margin: '4px 0 0' }}>{errors.desconto_cooperado_pct.message}</p>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Estoque mínimo</label>
                    <input
                      style={input}
                      placeholder="0"
                      {...register('estoque_minimo')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Fornecedor</label>
                    <select style={input} {...register('fornecedor_id')}>
                      <option value="">Nenhum</option>
                      {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </div>
                </div>

              </div>
            </form>
          )}

          {/* Confirmar exclusão */}
          {confirmExcluir && (
            <div style={{ marginTop: '1rem', padding: '14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px' }}>
              <p style={{ fontSize: '13px', color: '#dc2626', margin: '0 0 8px', fontWeight: '500' }}>
                Confirmar exclusão de <strong>{produto?.nome}</strong>?
              </p>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px' }}>
                Esta ação não pode ser desfeita. O produto não pode ter movimentações vinculadas.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleExcluir} disabled={salvando} style={{ ...btnVerde, background: '#dc2626', fontSize: '12px', padding: '7px 14px' }}>
                  {salvando ? 'Excluindo…' : 'Sim, excluir'}
                </button>
                <button onClick={() => setConfirmExcluir(false)} style={{ ...btnSecundario, fontSize: '12px', padding: '7px 14px' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e3dc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          {mode === 'view' && produto && !confirmExcluir && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleToggleAtivo} disabled={salvando} style={{ ...btnSecundario, fontSize: '12px' }}>
                {produto.ativo ? 'Desativar' : 'Ativar'}
              </button>
              <button onClick={() => setConfirmExcluir(true)} style={{ ...btnSecundario, fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}>
                Excluir
              </button>
            </div>
          )}
          {(mode === 'create' || mode === 'edit' || confirmExcluir) && <span />}

          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            {mode === 'view' && (
              <>
                <button onClick={onClose} style={btnSecundario}>Fechar</button>
                <button onClick={() => setMode('edit')} style={btnVerde}>✏ Editar</button>
              </>
            )}
            {(mode === 'create' || mode === 'edit') && (
              <>
                <button onClick={() => mode === 'edit' ? setMode('view') : onClose()} style={btnSecundario}>
                  Cancelar
                </button>
                <button type="submit" form="form-produto" disabled={salvando} style={btnVerde}>
                  {salvando ? 'Salvando…' : mode === 'create' ? 'Cadastrar' : 'Salvar'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
