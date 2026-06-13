'use client'

import { useState, useTransition } from 'react'
import { Btn } from '@/components/ui/Btn'
import { criarUsuarioComCooperadoOpcional } from '@/lib/cooperados/actions'
import type { FuncaoDisponivel } from '@/types/database'

interface Props {
  organizacaoId: string
  funcoes: FuncaoDisponivel[]
  onClose: () => void
  onSucesso: () => void
}

const VINCULO_OPTIONS = [
  { value: 'funcionario', label: 'Funcionário' },
  { value: 'diretoria', label: 'Diretoria' },
  { value: 'externo', label: 'Externo' },
]

const inp: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #e5e3dc',
  borderRadius: '8px',
  fontSize: '13px',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: '#fff',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b6b6b',
  display: 'block',
  marginBottom: '4px',
}

const secaoTitulo: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#9a9a9a',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '14px',
}

const AZUL = '#378ADD'

export default function ModalCadastrarUsuario({ organizacaoId, funcoes, onClose, onSucesso }: Props) {
  const hoje = new Date().toISOString().split('T')[0]

  // Seção 1
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [vinculo, setVinculo] = useState('')
  const [funcoesSelect, setFuncoesSelect] = useState<string[]>([])

  // Seção 2: cooperado
  const [ehCooperado, setEhCooperado] = useState(false)
  const [dataAdmissao, setDataAdmissao] = useState(hoje)
  const [numeroMatricula, setNumeroMatricula] = useState('')
  const [quotaParte, setQuotaParte] = useState('')
  const [cafNumero, setCafNumero] = useState('')
  const [cafSituacao, setCafSituacao] = useState('')
  const [cafValidade, setCafValidade] = useState('')
  const [dapNumero, setDapNumero] = useState('')
  const [areaTotalHa, setAreaTotalHa] = useState('')

  const [erro, setErro] = useState('')
  const [credenciais, setCredenciais] = useState<{ email: string; senha: string } | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggleFuncao(nome: string) {
    setFuncoesSelect(prev =>
      prev.includes(nome) ? prev.filter(f => f !== nome) : [...prev, nome]
    )
  }

  function handleCheckboxCooperado(checked: boolean) {
    setEhCooperado(checked)
    if (checked) setVinculo('cooperado')
    else if (vinculo === 'cooperado') setVinculo('')
  }

  function handleSubmit() {
    if (!nome.trim()) { setErro('Informe o nome completo.'); return }
    if (!email.trim()) { setErro('Informe o e-mail.'); return }
    if (!ehCooperado && !vinculo) { setErro('Selecione o vínculo.'); return }
    setErro('')

    startTransition(async () => {
      try {
        const result = await criarUsuarioComCooperadoOpcional(organizacaoId, {
          nome: nome.trim(),
          email: email.trim(),
          cpf: cpf.trim(),
          funcoes: funcoesSelect,
          vinculo: ehCooperado ? 'cooperado' : vinculo,
          ehCooperado,
          dadosCooperado: ehCooperado ? {
            data_admissao: dataAdmissao || undefined,
            numero_matricula: numeroMatricula || undefined,
            quota_parte: quotaParte ? parseFloat(quotaParte) : undefined,
            caf_numero: cafNumero || undefined,
            caf_situacao: cafSituacao || undefined,
            caf_validade: cafValidade || undefined,
            dap_numero: dapNumero || undefined,
            area_total_ha: areaTotalHa ? parseFloat(areaTotalHa) : undefined,
          } : undefined,
        })
        setCredenciais({ email: email.trim(), senha: result.senhaTemporaria })
      } catch (e: unknown) {
        setErro(e instanceof Error ? e.message : 'Erro ao cadastrar usuário.')
      }
    })
  }

  async function copiarCredenciais() {
    if (!credenciais) return
    const texto = `E-mail: ${credenciais.email}\nSenha temporária: ${credenciais.senha}`
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  // Painel de credenciais após sucesso
  if (credenciais) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={onSucesso}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '2rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: '#E6F7F1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: '24px', color: '#166534',
            }}>
              ✓
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
              Usuário cadastrado com sucesso!
            </div>
          </div>

          <div style={{
            background: '#f8f7f4',
            border: '1px solid #e5e3dc',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9a9a9a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Credenciais para repassar ao usuário
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#888' }}>E-mail:</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', marginLeft: '8px' }}>
                  {credenciais.email}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#888' }}>Senha temporária:</span>
                <span style={{
                  fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginLeft: '8px',
                  fontFamily: 'monospace', letterSpacing: '0.08em',
                }}>
                  {credenciais.senha}
                </span>
              </div>
            </div>
          </div>

          <div style={{
            background: '#FFF8E1', border: '1px solid #FDE68A',
            borderRadius: '8px', padding: '10px 14px',
            fontSize: '12px', color: '#92400e', marginBottom: '1.5rem',
          }}>
            ⚠️ Anote e repasse pessoalmente — esta senha não será exibida novamente.
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Btn variante="cinza" icone="ti-copy" onClick={copiarCredenciais}>
              {copiado ? 'Copiado!' : 'Copiar credenciais'}
            </Btn>
            <Btn variante="azul" onClick={onSucesso}>
              Fechar
            </Btn>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e5e3dc',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '10px', color: AZUL, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
              Configurações · Usuários
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#1a1a1a' }}>
              Cadastrar usuário
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#aaa', lineHeight: 1, padding: '4px' }}
          >
            ×
          </button>
        </div>

        {/* Corpo */}
        <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', flex: 1 }}>

          {/* Seção 1: Dados de acesso */}
          <div style={{ marginBottom: '20px' }}>
            <div style={secaoTitulo}>Dados de acesso</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Nome completo <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Nome do usuário"
                  style={inp}
                />
              </div>
              <div>
                <label style={labelStyle}>E-mail <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  style={inp}
                />
              </div>
              <div>
                <label style={labelStyle}>CPF</label>
                <input
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  style={inp}
                />
              </div>
              <div>
                <label style={labelStyle}>Telefone</label>
                <input
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  style={inp}
                />
              </div>
            </div>

            {!ehCooperado && (
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Vínculo <span style={{ color: '#dc2626' }}>*</span></label>
                <select
                  value={vinculo}
                  onChange={e => setVinculo(e.target.value)}
                  style={{ ...inp, width: '220px' }}
                >
                  <option value="">Selecionar...</option>
                  {VINCULO_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={labelStyle}>Funções</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {funcoes.map(f => {
                  const sel = funcoesSelect.includes(f.nome)
                  return (
                    <button
                      key={f.nome}
                      type="button"
                      onClick={() => toggleFuncao(f.nome)}
                      style={{
                        fontSize: '12px', padding: '4px 12px', borderRadius: '12px',
                        border: `1px solid ${sel ? AZUL : '#d5d3cc'}`,
                        background: sel ? '#EEF5FF' : '#fff',
                        color: sel ? AZUL : '#555',
                        cursor: 'pointer', fontWeight: sel ? 600 : 400,
                        fontFamily: 'inherit',
                      }}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Seção 2: É cooperado? */}
          <div style={{
            background: '#f8f7f4',
            border: '1px solid #e5e3dc',
            borderRadius: '12px',
            padding: '1rem',
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ehCooperado}
                onChange={e => handleCheckboxCooperado(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>
                  Este usuário também é cooperado da organização
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                  {/* TODO: terminologia dinâmica via tipos_org */}
                  Cria o vínculo de cooperado e produtor espelho automaticamente.
                </div>
              </div>
            </label>

            {ehCooperado && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e3dc' }}>
                <div style={secaoTitulo}>Dados societários</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Data de admissão</label>
                    <input type="date" value={dataAdmissao} onChange={e => setDataAdmissao(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={labelStyle}>Número de matrícula</label>
                    <input value={numeroMatricula} onChange={e => setNumeroMatricula(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={labelStyle}>Quota parte (R$)</label>
                    <input type="number" step="0.01" min="0" value={quotaParte} onChange={e => setQuotaParte(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={labelStyle}>CAF número</label>
                    <input value={cafNumero} onChange={e => setCafNumero(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={labelStyle}>CAF situação</label>
                    <input value={cafSituacao} onChange={e => setCafSituacao(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={labelStyle}>CAF validade</label>
                    <input type="date" value={cafValidade} onChange={e => setCafValidade(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={labelStyle}>DAP número</label>
                    <input value={dapNumero} onChange={e => setDapNumero(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={labelStyle}>Área total (ha)</label>
                    <input type="number" step="0.01" min="0" value={areaTotalHa} onChange={e => setAreaTotalHa(e.target.value)} style={inp} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {erro && (
            <div style={{
              marginTop: '16px',
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '13px', color: '#991b1b',
            }}>
              {erro}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e5e3dc',
          display: 'flex', justifyContent: 'flex-end', gap: '8px',
        }}>
          <Btn variante="cinza" onClick={onClose} disabled={isPending}>
            Cancelar
          </Btn>
          <Btn variante="azul" icone="ti-user-plus" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Cadastrando...' : 'Cadastrar'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
