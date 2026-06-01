'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { LojaFornecedor } from '@/types/database'
import { criarFornecedor, atualizarFornecedor, toggleFornecedorAtivo, excluirFornecedor } from '@/lib/loja/actions'
import { useState } from 'react'

const VERDE = '#1D9E75'

type Mode = 'create' | 'edit' | 'view'

interface FormValues {
  nome:     string
  cnpj:     string
  telefone: string
  email:    string
}

interface Props {
  mode:        Mode
  fornecedor?: LojaFornecedor
  onClose:     () => void
  onSalvo:     () => void
}

const input: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: '13px',
  border: '1px solid #d5d3cc', borderRadius: '8px',
  background: '#fff', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}

const label: React.CSSProperties = {
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

function InfoLinha({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f5f3ef' }}>
      <span style={{ fontSize: '12px', color: '#888', fontWeight: '500' }}>{rotulo}</span>
      <span style={{ fontSize: '13px', color: '#1a1a1a' }}>{valor || '—'}</span>
    </div>
  )
}

export default function FornecedorModal({ mode: initialMode, fornecedor, onClose, onSalvo }: Props) {
  const [mode, setMode]           = useState<Mode>(initialMode)
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState('')
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      nome:     fornecedor?.nome     ?? '',
      cnpj:     fornecedor?.cnpj     ?? '',
      telefone: fornecedor?.telefone ?? '',
      email:    fornecedor?.email    ?? '',
    },
  })

  useEffect(() => {
    reset({
      nome:     fornecedor?.nome     ?? '',
      cnpj:     fornecedor?.cnpj     ?? '',
      telefone: fornecedor?.telefone ?? '',
      email:    fornecedor?.email    ?? '',
    })
  }, [fornecedor, reset])

  async function onSubmit(values: FormValues) {
    setSalvando(true)
    setErro('')
    const dados = {
      nome:     values.nome.trim(),
      cnpj:     values.cnpj.trim()     || null,
      telefone: values.telefone.trim() || null,
      email:    values.email.trim()    || null,
    }
    const res = mode === 'create'
      ? await criarFornecedor(dados)
      : await atualizarFornecedor(fornecedor!.id, dados)

    setSalvando(false)
    if (res.error) { setErro(res.error); return }
    onSalvo()
    onClose()
  }

  async function handleToggleAtivo() {
    if (!fornecedor) return
    setSalvando(true)
    await toggleFornecedorAtivo(fornecedor.id, !fornecedor.ativo)
    setSalvando(false)
    onSalvo()
    onClose()
  }

  async function handleExcluir() {
    if (!fornecedor) return
    setSalvando(true)
    const res = await excluirFornecedor(fornecedor.id)
    setSalvando(false)
    if (res.error) { setErro(res.error); return }
    onSalvo()
    onClose()
  }

  const titulo = mode === 'create' ? 'Novo Fornecedor'
    : mode === 'edit' ? 'Editar Fornecedor'
    : fornecedor?.nome ?? 'Fornecedor'

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Cabeçalho */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e3dc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '600', color: VERDE, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
              Fornecedor
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
          {mode === 'view' && fornecedor && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                  background: fornecedor.ativo ? '#dcfce7' : '#f5f3ef',
                  color: fornecedor.ativo ? '#166534' : '#888',
                }}>
                  {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <InfoLinha rotulo="Nome"     valor={fornecedor.nome} />
              <InfoLinha rotulo="CNPJ"     valor={fornecedor.cnpj} />
              <InfoLinha rotulo="Telefone" valor={fornecedor.telefone} />
              <InfoLinha rotulo="E-mail"   valor={fornecedor.email} />
              <div style={{ fontSize: '11px', color: '#bbb', marginTop: '12px', textAlign: 'right' }}>
                Cadastrado em {new Date(fornecedor.criado_em).toLocaleDateString('pt-BR')}
              </div>
            </div>
          )}

          {/* Modo formulário */}
          {(mode === 'create' || mode === 'edit') && (
            <form id="form-fornecedor" onSubmit={handleSubmit(onSubmit)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={label}>Nome *</label>
                  <input
                    style={{ ...input, borderColor: errors.nome ? '#fca5a5' : '#d5d3cc' }}
                    placeholder="Razão social ou nome do fornecedor"
                    {...register('nome', { required: 'Nome é obrigatório' })}
                  />
                  {errors.nome && <p style={{ fontSize: '11px', color: '#dc2626', margin: '4px 0 0' }}>{errors.nome.message}</p>}
                </div>

                <div>
                  <label style={label}>CNPJ</label>
                  <input
                    style={input}
                    placeholder="00.000.000/0000-00"
                    {...register('cnpj')}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={label}>Telefone</label>
                    <input
                      style={input}
                      placeholder="(00) 00000-0000"
                      {...register('telefone')}
                    />
                  </div>
                  <div>
                    <label style={label}>E-mail</label>
                    <input
                      type="email"
                      style={input}
                      placeholder="contato@empresa.com"
                      {...register('email')}
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Confirmar exclusão */}
          {confirmExcluir && (
            <div style={{ marginTop: '1rem', padding: '14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px' }}>
              <p style={{ fontSize: '13px', color: '#dc2626', margin: '0 0 12px', fontWeight: '500' }}>
                Confirmar exclusão de <strong>{fornecedor?.nome}</strong>?
              </p>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px' }}>
                Esta ação não pode ser desfeita. Fornecedores vinculados a produtos não podem ser excluídos.
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
          {/* Ações secundárias (view) */}
          {mode === 'view' && fornecedor && !confirmExcluir && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleToggleAtivo} disabled={salvando} style={{ ...btnSecundario, fontSize: '12px' }}>
                {fornecedor.ativo ? 'Desativar' : 'Ativar'}
              </button>
              <button onClick={() => setConfirmExcluir(true)} style={{ ...btnSecundario, fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}>
                Excluir
              </button>
            </div>
          )}
          {(mode === 'create' || mode === 'edit') && <span />}
          {mode === 'view' && confirmExcluir && <span />}

          {/* Ações primárias */}
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
                <button type="submit" form="form-fornecedor" disabled={salvando} style={btnVerde}>
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
