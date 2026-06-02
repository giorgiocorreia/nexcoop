'use client'

import { useEffect, useState } from 'react'
import { getParceiras, criarParceira, atualizarStatusParceira } from '@/lib/parceiros/actions'
import { TIPO_PARCERIA_LABEL, TipoParceria, MODULOS_POR_TIPO } from '@/lib/parceiros/types'

const COR = '#635BFF'

const TIPOS_DISPONIVEIS: { tipo: TipoParceria; icon: string; desc: string }[] = [
  { tipo: 'contabilidade', icon: '📊', desc: 'Escritório de contabilidade com acesso ao módulo contábil' },
  { tipo: 'fornecedor', icon: '📦', desc: 'Fornecedor com acesso ao estoque (em breve)' },
  { tipo: 'assistencia_tecnica', icon: '🔧', desc: 'Assistência técnica com acesso a cooperados e documentos (em breve)' },
  { tipo: 'certificadora', icon: '🏆', desc: 'Certificadora com acesso a documentos e cooperados (em breve)' },
  { tipo: 'outro', icon: '🏢', desc: 'Outro tipo de empresa parceira' },
]

export default function ParceirosClient({ orgId }: { orgId: string }) {
  const [parceiras, setParceiras] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [tipoSel, setTipoSel] = useState<TipoParceria | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [site, setSite] = useState('')
  const [obs, setObs] = useState('')

  useEffect(() => {
    getParceiras(orgId).then(setParceiras)
  }, [orgId])

  async function handleSalvar() {
    if (!tipoSel || !razaoSocial || !email) { setErro('Preencha razão social e e-mail.'); return }
    setSalvando(true); setErro('')
    try {
      await criarParceira({ org_id: orgId, razao_social: razaoSocial, cnpj, email_contato: email, telefone, tipo: tipoSel, cidade, estado, site, observacoes: obs })
      const novas = await getParceiras(orgId)
      setParceiras(novas)
      setSucesso('Empresa parceira cadastrada! O convite foi enviado por e-mail.')
      setTimeout(() => setSucesso(''), 4000)
      setModal(false); setTipoSel(null)
      setRazaoSocial(''); setCnpj(''); setEmail(''); setTelefone('')
      setCidade(''); setEstado(''); setSite(''); setObs('')
    } catch (e: any) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  async function handleToggle(id: string, status: string) {
    await atualizarStatusParceira(id, status === 'ativo' ? 'inativo' : 'ativo')
    const novas = await getParceiras(orgId)
    setParceiras(novas)
  }

  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    ativo: { bg: '#dcfce7', color: '#166534', label: 'Ativo' },
    inativo: { bg: '#f3f4f6', color: '#6b7280', label: 'Inativo' },
    pendente: { bg: '#fef9c3', color: '#854d0e', label: 'Aguardando aceite' },
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Empresas Parceiras</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Gerencie empresas prestadoras de serviço com acesso ao sistema</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ padding: '9px 18px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Nova Parceira
        </button>
      </div>

      {sucesso && <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13 }}>{sucesso}</div>}

      {parceiras.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#f8f7f4', borderRadius: 12, border: '1px solid #e5e3dc', color: '#6b7280' }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>Nenhuma empresa parceira cadastrada.</p>
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
                    <a href={`/parceiros/${p.tipo}/${p.id}`}
                      style={{ padding: '7px 14px', background: '#f8f7f4', color: '#374151', border: '1px solid #e5e3dc', borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                      Gerenciar
                    </a>
                    <button onClick={() => handleToggle(p.id, p.status)}
                      style={{ padding: '7px 14px', background: p.status === 'ativo' ? '#fef2f2' : '#f0fdf9',
                        color: p.status === 'ativo' ? '#dc2626' : '#166534',
                        border: `1px solid ${p.status === 'ativo' ? '#fca5a5' : '#86efac'}`,
                        borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {p.status === 'ativo' ? 'Inativar' : 'Reativar'}
                    </button>
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
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Nova Empresa Parceira</h2>

            {!tipoSel ? (
              <>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Selecione o tipo de parceria:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {TIPOS_DISPONIVEIS.map(t => (
                    <div key={t.tipo}
                      onClick={() => t.tipo === 'contabilidade' || t.tipo === 'outro' ? setTipoSel(t.tipo) : null}
                      style={{
                        padding: '14px 16px', border: '1px solid #e5e3dc', borderRadius: 10,
                        cursor: t.tipo === 'contabilidade' || t.tipo === 'outro' ? 'pointer' : 'not-allowed',
                        opacity: t.tipo === 'contabilidade' || t.tipo === 'outro' ? 1 : 0.5,
                        display: 'flex', alignItems: 'center', gap: 14,
                        background: '#f8f7f4',
                      }}>
                      <span style={{ fontSize: 22 }}>{t.icon}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{TIPO_PARCERIA_LABEL[t.tipo]}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{t.desc}</p>
                      </div>
                      {t.tipo !== 'contabilidade' && t.tipo !== 'outro' && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, background: '#f3f4f6', color: '#9ca3af', padding: '2px 8px', borderRadius: 4 }}>em breve</span>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, textAlign: 'right' }}>
                  <button onClick={() => setModal(false)}
                    style={{ padding: '9px 18px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: '#f8f7f4', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{TIPOS_DISPONIVEIS.find(t => t.tipo === tipoSel)?.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{TIPO_PARCERIA_LABEL[tipoSel]}</span>
                  <button onClick={() => setTipoSel(null)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 12 }}>
                    Trocar
                  </button>
                </div>

                {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', marginBottom: 14, color: '#dc2626', fontSize: 12 }}>{erro}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    ['Razão Social *', razaoSocial, setRazaoSocial, 'Nome da empresa'],
                    ['CNPJ', cnpj, setCnpj, '00.000.000/0001-00'],
                    ['E-mail de contato *', email, setEmail, 'email@empresa.com.br'],
                    ['Telefone', telefone, setTelefone, '(00) 00000-0000'],
                    ['Cidade', cidade, setCidade, ''],
                    ['Site', site, setSite, 'www.empresa.com.br'],
                  ].map(([label, val, setter, ph]: any) => (
                    <div key={label}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                      <input value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Observações</label>
                    <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
                  </div>
                </div>

                <div style={{ background: '#f0fdf9', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginTop: 16, fontSize: 12, color: '#166534' }}>
                  Um convite será enviado para o e-mail informado. A empresa precisará criar uma conta e aceitar o vínculo.
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button onClick={() => { setModal(false); setTipoSel(null); setErro('') }}
                    style={{ padding: '9px 18px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={handleSalvar} disabled={salvando}
                    style={{ padding: '9px 18px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {salvando ? 'Cadastrando...' : 'Cadastrar e Enviar Convite'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
