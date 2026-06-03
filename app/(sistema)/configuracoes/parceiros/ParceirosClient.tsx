'use client'

import { useEffect, useState } from 'react'
import { getParceiras, criarParceira, atualizarStatusParceira, reenviarConviteParceira, removerParceira } from '@/lib/parceiros/actions'
import { TIPO_PARCERIA_LABEL, TipoParceria } from '@/lib/parceiros/types'

const COR = '#635BFF'

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

const TIPOS_DISPONIVEIS: { tipo: TipoParceria; icon: string; desc: string }[] = [
  { tipo: 'contabilidade',    icon: '📊', desc: 'Escritório de contabilidade com acesso ao módulo contábil' },
  { tipo: 'fornecedor',       icon: '📦', desc: 'Fornecedor com acesso ao estoque (em breve)' },
  { tipo: 'assistencia_tecnica', icon: '🔧', desc: 'Assistência técnica com acesso a cooperados e documentos (em breve)' },
  { tipo: 'certificadora',    icon: '🏆', desc: 'Certificadora com acesso a documentos e cooperados (em breve)' },
  { tipo: 'outro',            icon: '🏢', desc: 'Outro tipo de empresa parceira' },
]

// ── Máscaras e validação ──────────────────────────────────────────────────────

function maskCNPJ(v: string) {
  return v.replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18)
}

function maskTelefone(v: string) {
  return v.replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15)
}

function validarCNPJ(cnpj: string): boolean {
  const nums = cnpj.replace(/\D/g, '')
  if (nums.length !== 14) return false
  if (/^(\d)\1+$/.test(nums)) return false
  const calc = (n: string, len: number) => {
    let sum = 0
    let pos = len - 7
    for (let i = len; i >= 1; i--) {
      sum += parseInt(n[len - i]) * pos--
      if (pos < 2) pos = 9
    }
    const result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    return result === parseInt(n[len])
  }
  return calc(nums, 12) && calc(nums, 13)
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ParceirosClient({ orgId }: { orgId: string }) {
  const [parceiras, setParceiras] = useState<any[]>([])
  const [modal, setModal]         = useState(false)
  const [tipoSel, setTipoSel]     = useState<TipoParceria | null>(null)
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState('')
  const [sucesso, setSucesso]     = useState('')

  // Campos do formulário
  const [cnpj, setCnpj]               = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [email, setEmail]             = useState('')
  const [telefone, setTelefone]       = useState('')
  const [cidade, setCidade]           = useState('')
  const [estado, setEstado]           = useState('')
  const [site, setSite]               = useState('')
  const [obs, setObs]                 = useState('')

  // Estados da busca CNPJ
  // Estados da busca CNPJ
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false)
  const [erroCNPJ, setErroCNPJ]         = useState('')
  const [avisoCNPJ, setAvisoCNPJ]       = useState('')

  // Modal de confirmação de remoção
  const [modalRemover, setModalRemover] = useState<any>(null)

  useEffect(() => {
    getParceiras(orgId).then(setParceiras)
  }, [orgId])

  async function handleCNPJBlur() {
    setErroCNPJ(''); setAvisoCNPJ('')
    const nums = cnpj.replace(/\D/g, '')
    if (nums.length === 0) return
    if (!validarCNPJ(cnpj)) {
      setErroCNPJ('CNPJ inválido')
      return
    }
    setBuscandoCNPJ(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${nums}`)
      if (res.ok) {
        const data = await res.json()
        if (data.razao_social) setRazaoSocial(data.razao_social)
        if (data.ddd_telefone_1) setTelefone(maskTelefone(data.ddd_telefone_1.replace(/\D/g, '')))
        if (data.municipio) setCidade(data.municipio)
        if (data.uf) setEstado(data.uf)
      } else if (res.status === 404) {
        setAvisoCNPJ('CNPJ não encontrado na Receita Federal — preencha manualmente.')
      }
    } catch {
      // erro de rede — silencioso, usuário preenche manualmente
    } finally {
      setBuscandoCNPJ(false)
    }
  }

  function resetForm() {
    setCnpj(''); setRazaoSocial(''); setEmail(''); setTelefone('')
    setCidade(''); setEstado(''); setSite(''); setObs('')
    setErroCNPJ(''); setAvisoCNPJ('')
  }

  async function handleSalvar() {
    if (!tipoSel || !razaoSocial || !email) { setErro('Preencha razão social e e-mail.'); return }
    setSalvando(true); setErro('')
    try {
      await criarParceira({
        org_id: orgId, razao_social: razaoSocial, cnpj,
        email_contato: email, telefone, tipo: tipoSel,
        cidade, estado, site, observacoes: obs,
      })
      const novas = await getParceiras(orgId)
      setParceiras(novas)
      setSucesso('Empresa vinculada cadastrada! O convite foi enviado por e-mail.')
      setTimeout(() => setSucesso(''), 4000)
      setModal(false); setTipoSel(null); resetForm()
    } catch (e: any) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  async function handleToggle(id: string, status: string) {
    await atualizarStatusParceira(id, status === 'ativo' ? 'inativo' : 'ativo')
    const novas = await getParceiras(orgId)
    setParceiras(novas)
  }

  async function handleReenviar(empresaId: string, email: string) {
    await reenviarConviteParceira(empresaId, email)
    setSucesso('Convite reenviado para ' + email)
    setTimeout(() => setSucesso(''), 4000)
  }

  async function handleRemover(parceira: any) {
    setModalRemover(parceira)
  }

  async function confirmarRemover() {
    if (!modalRemover) return
    try {
      await removerParceira(modalRemover.id)
      const novas = await getParceiras(orgId)
      setParceiras(novas)
      setSucesso('Empresa removida.')
      setTimeout(() => setSucesso(''), 3000)
    } catch (e: any) { setErro(e.message) }
    finally { setModalRemover(null) }
  }

  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    ativo:    { bg: '#dcfce7', color: '#166534', label: 'Ativo' },
    inativo:  { bg: '#f3f4f6', color: '#6b7280', label: 'Inativo' },
    pendente: { bg: '#fef9c3', color: '#854d0e', label: 'Aguardando aceite' },
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Empresas Vinculadas</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Gerencie empresas prestadoras de serviço com acesso ao sistema</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ padding: '9px 18px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Nova Empresa
        </button>
      </div>

      {sucesso && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13 }}>
          {sucesso}
        </div>
      )}

      {parceiras.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#f8f7f4', borderRadius: 12, border: '1px solid #e5e3dc', color: '#6b7280' }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>Nenhuma empresa vinculada cadastrada.</p>
          <p style={{ fontSize: 12 }}>Cadastre um escritório de contabilidade, fornecedor ou outro prestador de serviço.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {parceiras.map((p: any) => {
            const st = STATUS_STYLE[p.status]
            const tipoInfo = TIPOS_DISPONIVEIS.find(t => t.tipo === p.tipo)
            return (
              <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 24 }}>{tipoInfo?.icon || '🏢'}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{p.razao_social}</p>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                        {TIPO_PARCERIA_LABEL[p.tipo as TipoParceria]} · {p.email_contato}
                        {p.profissionais?.length > 0 && ` · ${p.profissionais.filter((pr: any) => pr.ativo).length} profissional(is)`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {/* Gerenciar — sempre visível */}
                    <a href={`/parceiros/${p.tipo}/${p.id}`}
                      style={{
                        padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        textDecoration: 'none', cursor: 'pointer',
                        background: p.status === 'pendente' ? '#f8f7f4' : COR,
                        color: p.status === 'pendente' ? '#6b7280' : '#fff',
                        border: p.status === 'pendente' ? '1px solid #e5e3dc' : 'none',
                      }}>
                      Gerenciar
                    </a>

                    {/* Ações por status */}
                    {p.status === 'pendente' && (
                      <>
                        <button onClick={() => handleReenviar(p.id, p.email_contato)}
                          style={{ padding: '7px 14px', background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Reenviar Convite
                        </button>
                        <button onClick={() => handleRemover(p)}
                          style={{ padding: '7px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Remover
                        </button>
                      </>
                    )}
                    {p.status !== 'pendente' && (
                      <button onClick={() => handleToggle(p.id, p.status)}
                        style={{
                          padding: '7px 14px',
                          background: p.status === 'ativo' ? '#fef2f2' : '#f0fdf9',
                          color: p.status === 'ativo' ? '#dc2626' : '#166534',
                          border: `1px solid ${p.status === 'ativo' ? '#fca5a5' : '#86efac'}`,
                          borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}>
                        {p.status === 'ativo' ? 'Inativar' : 'Reativar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de cadastro */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Nova Empresa Vinculada</h2>

            {!tipoSel ? (
              /* ── Seleção de tipo ── */
              <>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Selecione o tipo de parceria:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {TIPOS_DISPONIVEIS.map(t => {
                    const disponivel = t.tipo === 'contabilidade' || t.tipo === 'outro'
                    return (
                      <div key={t.tipo}
                        onClick={() => disponivel ? setTipoSel(t.tipo) : null}
                        style={{
                          padding: '14px 16px', border: '1px solid #e5e3dc', borderRadius: 10,
                          cursor: disponivel ? 'pointer' : 'not-allowed',
                          opacity: disponivel ? 1 : 0.5,
                          display: 'flex', alignItems: 'center', gap: 14,
                          background: '#f8f7f4',
                        }}>
                        <span style={{ fontSize: 22 }}>{t.icon}</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{TIPO_PARCERIA_LABEL[t.tipo]}</p>
                          <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{t.desc}</p>
                        </div>
                        {!disponivel && (
                          <span style={{ marginLeft: 'auto', fontSize: 10, background: '#f3f4f6', color: '#9ca3af', padding: '2px 8px', borderRadius: 4 }}>
                            em breve
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 20, textAlign: 'right' }}>
                  <button onClick={() => setModal(false)}
                    style={{ padding: '9px 18px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              /* ── Formulário ── */
              <>
                {/* Badge do tipo selecionado */}
                <div style={{ background: '#f8f7f4', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{TIPOS_DISPONIVEIS.find(t => t.tipo === tipoSel)?.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{TIPO_PARCERIA_LABEL[tipoSel]}</span>
                  <button onClick={() => { setTipoSel(null); resetForm() }}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 12 }}>
                    Trocar
                  </button>
                </div>

                {erro && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', marginBottom: 14, color: '#dc2626', fontSize: 12 }}>
                    {erro}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* 1. CNPJ — dispara busca automática */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>CNPJ</label>
                    <input
                      value={cnpj}
                      onChange={e => { setCnpj(maskCNPJ(e.target.value)); setErroCNPJ(''); setAvisoCNPJ('') }}
                      onBlur={handleCNPJBlur}
                      placeholder="00.000.000/0001-00"
                      style={{ ...inputStyle, borderColor: erroCNPJ ? '#fca5a5' : '#e5e3dc' }}
                    />
                    {buscandoCNPJ && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6b7280' }}>Consultando CNPJ...</p>
                    )}
                    {erroCNPJ && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#dc2626' }}>{erroCNPJ}</p>
                    )}
                    {avisoCNPJ && (
                      <div style={{ margin: '6px 0 0', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#854d0e' }}>
                        {avisoCNPJ}
                      </div>
                    )}
                  </div>

                  {/* 2. Razão Social */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Razão Social *</label>
                    <input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)}
                      placeholder="Nome da empresa" style={inputStyle} />
                  </div>

                  {/* 3. E-mail */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>E-mail de contato *</label>
                    <input value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="email@empresa.com.br" type="email" style={inputStyle} />
                  </div>

                  {/* 4. Telefone */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Telefone</label>
                    <input value={telefone}
                      onChange={e => setTelefone(maskTelefone(e.target.value))}
                      placeholder="(00) 00000-0000" style={inputStyle} />
                  </div>

                  {/* 5 + 6. Cidade + Estado */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Cidade</label>
                      <input value={cidade} onChange={e => setCidade(e.target.value)}
                        placeholder="Cidade" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Estado</label>
                      <select value={estado} onChange={e => setEstado(e.target.value)} style={inputStyle}>
                        <option value="">UF</option>
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* 7. Site */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Site</label>
                    <input value={site} onChange={e => setSite(e.target.value)}
                      placeholder="www.empresa.com.br" style={inputStyle} />
                  </div>

                  {/* 8. Observações */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Observações</label>
                    <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>

                </div>

                <div style={{ background: '#f0fdf9', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginTop: 16, fontSize: 12, color: '#166534' }}>
                  Um convite será enviado para o e-mail informado. A empresa precisará criar uma conta e aceitar o vínculo.
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button onClick={() => { setModal(false); setTipoSel(null); resetForm(); setErro('') }}
                    style={{ padding: '9px 18px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={handleSalvar} disabled={salvando}
                    style={{ padding: '9px 18px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
                    {salvando ? 'Cadastrando...' : 'Cadastrar e Enviar Convite'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação de remoção */}
      {modalRemover && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, maxWidth: '95vw' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#dc2626' }}>Remover Empresa Vinculada</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
              Tem certeza que deseja remover <strong>{modalRemover.razao_social}</strong>?
              Esta ação removerá o vínculo e todos os profissionais cadastrados. Não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalRemover(null)}
                style={{ padding: '9px 18px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarRemover}
                style={{ padding: '9px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Sim, remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
