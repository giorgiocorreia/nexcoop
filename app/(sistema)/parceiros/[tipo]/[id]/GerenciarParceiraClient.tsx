'use client'

import { useEffect, useState } from 'react'
import { getProfissionais, convidarProfissional, toggleProfissional, reenviarConviteParceira, atualizarEmailParceira, atualizarModulosAcesso } from '@/lib/parceiros/actions'
import { TIPO_PARCERIA_LABEL, NIVEL_LABEL, NivelProfissional } from '@/lib/parceiros/types'
import type { EmpresaParceira } from '@/lib/parceiros/types'
import { PageLayout, MODULO_CONFIG, COM_C } from '@/components/nexcoop/ui'

const STATUS_EMPRESA: Record<string, { bg: string; color: string; label: string }> = {
  ativo:    { bg: '#dcfce7', color: '#166534', label: 'Ativo' },
  inativo:  { bg: '#f3f4f6', color: '#6b7280', label: 'Inativo' },
  pendente: { bg: '#fef9c3', color: '#854d0e', label: 'Aguardando aceite' },
}

interface Props {
  parceira: EmpresaParceira & { profissionais?: any[] }
  orgId: string
}

export default function GerenciarParceiraClient({ parceira, orgId }: Props) {
  const [profissionais, setProfissionais] = useState<any[]>(parceira.profissionais ?? [])
  const [modal, setModal]   = useState(false)
  const [nome, setNome]     = useState('')
  const [email, setEmail]   = useState('')
  const [cargo, setCargo]   = useState('')
  const [crc, setCrc]       = useState('')
  const [nivel, setNivel]   = useState<NivelProfissional>('operador')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]     = useState('')
  const [sucesso, setSucesso] = useState('')

  // Módulos de acesso
  const [modulos, setModulos] = useState<string[]>(parceira.modulos_acesso ?? [])
  const [salvandoModulos, setSalvandoModulos] = useState(false)

  async function handleSalvarModulos() {
    setSalvandoModulos(true)
    try {
      await atualizarModulosAcesso(parceira.id, modulos)
      setSucesso('Módulos de acesso atualizados!')
      setTimeout(() => setSucesso(''), 3000)
    } catch (e: any) { setErro(e.message) }
    finally { setSalvandoModulos(false) }
  }

  function toggleModulo(modulo: string) {
    setModulos(prev => prev.includes(modulo) ? prev.filter(m => m !== modulo) : [...prev, modulo])
  }

  // Edição de e-mail inline
  const [editandoEmail, setEditandoEmail]   = useState(false)
  const [novoEmail, setNovoEmail]           = useState(parceira.email_contato)
  const [salvandoEmail, setSalvandoEmail]   = useState(false)

  useEffect(() => {
    getProfissionais(parceira.id).then(setProfissionais)
  }, [parceira.id])

  async function handleConvidar() {
    if (!nome || !email) { setErro('Preencha nome e e-mail.'); return }
    setSalvando(true); setErro('')
    try {
      await convidarProfissional({ empresa_id: parceira.id, nome, email, cargo, crc, nivel })
      setProfissionais(await getProfissionais(parceira.id))
      setSucesso('Convite enviado!')
      setTimeout(() => setSucesso(''), 3000)
      setModal(false); setNome(''); setEmail(''); setCargo(''); setCrc('')
    } catch (e: any) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  async function handleToggle(id: string, ativo: boolean) {
    await toggleProfissional(id, !ativo)
    setProfissionais(p => p.map(x => x.id === id ? { ...x, ativo: !ativo } : x))
  }

  async function handleSalvarEmail() {
    if (!novoEmail) return
    setSalvandoEmail(true)
    try {
      await atualizarEmailParceira(parceira.id, novoEmail)
      setEditandoEmail(false)
      setSucesso('E-mail atualizado!')
      setTimeout(() => setSucesso(''), 3000)
    } catch (e: any) { setErro(e.message) }
    finally { setSalvandoEmail(false) }
  }

  async function handleReenviarProf(email: string) {
    await reenviarConviteParceira(parceira.id, email)
    setSucesso('Convite reenviado para ' + email)
    setTimeout(() => setSucesso(''), 3000)
  }

  const st = STATUS_EMPRESA[parceira.status] ?? STATUS_EMPRESA.pendente
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
  }

  return (
    <PageLayout
      titulo={parceira.razao_social}
      subtitulo={TIPO_PARCERIA_LABEL[parceira.tipo]}
      icone="ti-building-store"
      modulo={MODULO_CONFIG}
      breadcrumb={[
        { label: 'Empresas Vinculadas', href: '/configuracoes?aba=parceiros' },
        { label: parceira.razao_social },
      ]}
      acoes={
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: st.bg, color: st.color }}>
          {st.label}
        </span>
      }
    >
      <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {editandoEmail ? (
          <>
            <input
              type="email" value={novoEmail}
              onChange={e => setNovoEmail(e.target.value)}
              style={{ fontSize: 13, padding: '3px 8px', border: `1px solid ${COM_C.borda}`, borderRadius: 6, width: 220 }}
              autoFocus
            />
            <button onClick={handleSalvarEmail} disabled={salvandoEmail}
              style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', background: COM_C.roxo, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {salvandoEmail ? '...' : 'Salvar'}
            </button>
            <button onClick={() => { setEditandoEmail(false); setNovoEmail(parceira.email_contato) }}
              style={{ fontSize: 12, padding: '3px 8px', background: 'transparent', border: `1px solid ${COM_C.borda}`, borderRadius: 6, cursor: 'pointer', color: COM_C.txtSub }}>
              Cancelar
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, color: COM_C.txtSub }}>{novoEmail}</span>
            <button onClick={() => setEditandoEmail(true)}
              style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', background: COM_C.bg, border: `1px solid ${COM_C.borda}`, borderRadius: 5, cursor: 'pointer', color: COM_C.txtSub }}>
              Editar
            </button>
          </>
        )}
        {parceira.cnpj && <span style={{ fontSize: 13, color: COM_C.txtSub }}>· CNPJ: {parceira.cnpj}</span>}
      </div>

      {sucesso && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: '#166534', fontSize: 13 }}>
          {sucesso}
        </div>
      )}

      {/* Dados da empresa */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px' }}>Dados da empresa</h2>
        <div className="com-kpi-grid-3" style={{ gap: 14 }}>
          {[
            ['Razão Social',    parceira.razao_social],
            ['CNPJ',           parceira.cnpj || '—'],
            ['E-mail',         parceira.email_contato],
            ['Telefone',       parceira.telefone || '—'],
            ['Cidade',         parceira.cidade || '—'],
            ['Estado',         parceira.estado || '—'],
            ['Site',           parceira.site || '—'],
            ['Tipo',           TIPO_PARCERIA_LABEL[parceira.tipo]],
          ].map(([k, v]) => (
            <div key={k} style={{ background: '#f8f7f4', borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{k}</p>
              <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 600, color: '#1a1a2e', wordBreak: 'break-all' }}>{v}</p>
            </div>
          ))}
        </div>
        {parceira.observacoes && (
          <div style={{ marginTop: 14, background: '#f8f7f4', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Observações</p>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#1a1a2e' }}>{parceira.observacoes}</p>
          </div>
        )}
      </div>

      {/* Módulos de acesso */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px' }}>Módulos de acesso</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {([
            ['contabil',           'Módulo Contábil'],
            ['financeiro_leitura', 'Financeiro — somente leitura'],
          ] as [string, string][]).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#1a1a1a', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={modulos.includes(key)}
                onChange={() => toggleModulo(key)}
                style={{ width: 16, height: 16, accentColor: COM_C.roxo, cursor: 'pointer' }}
              />
              {label}
            </label>
          ))}
        </div>
        <button
          onClick={handleSalvarModulos}
          disabled={salvandoModulos}
          style={{ padding: '8px 18px', background: salvandoModulos ? '#9CA3AF' : COM_C.roxo, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: salvandoModulos ? 'not-allowed' : 'pointer' }}>
          {salvandoModulos ? 'Salvando…' : 'Salvar módulos'}
        </button>
      </div>

      {/* Profissionais */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Profissionais</h2>
          <button onClick={() => setModal(true)}
            style={{ padding: '7px 16px', background: COM_C.roxo, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            + Convidar
          </button>
        </div>

        {profissionais.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#6b7280', fontSize: 13 }}>
            Nenhum profissional vinculado. Clique em "+ Convidar" para adicionar.
          </div>
        ) : (
          <div style={{ borderRadius: 8, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
            {profissionais.map((p: any, i: number) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: i < profissionais.length - 1 ? '1px solid #f3f4f6' : 'none',
                background: i % 2 === 0 ? '#fff' : '#f8f7f4',
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{p.nome}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>
                    {p.email} · {NIVEL_LABEL[p.nivel as NivelProfissional]}
                    {p.crc && ` · CRC: ${p.crc}`}
                    {p.cargo && ` · ${p.cargo}`}
                    {!p.aceito_em && ' · Convite pendente'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: p.ativo ? '#dcfce7' : '#f3f4f6',
                    color: p.ativo ? '#166534' : '#6b7280',
                  }}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  {!p.aceito_em && (
                    <button onClick={() => handleReenviarProf(p.email)}
                      style={{ padding: '5px 10px', border: '1px solid #fcd34d', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#fffbeb', color: '#92400e' }}>
                      Reenviar
                    </button>
                  )}
                  <button onClick={() => handleToggle(p.id, p.ativo)}
                    style={{
                      padding: '5px 10px',
                      border: `1px solid ${p.ativo ? '#fca5a5' : '#86efac'}`,
                      borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#fff',
                      color: p.ativo ? '#dc2626' : '#166534',
                    }}>
                    {p.ativo ? 'Inativar' : 'Reativar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal convidar profissional */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 460, maxWidth: '95vw' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Convidar Profissional</h2>
            {erro && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', marginBottom: 14, color: '#dc2626', fontSize: 12 }}>
                {erro}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([
                ['Nome completo *', nome, setNome, ''],
                ['E-mail *',        email, setEmail, ''],
                ['Cargo',           cargo, setCargo, 'Ex: Contador, Auxiliar'],
                ['CRC',             crc,   setCrc,   'Ex: CRC-BA 012345/O-1'],
              ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, ph]) => (
                <div key={label}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nível de acesso</label>
                <select value={nivel} onChange={e => setNivel(e.target.value as NivelProfissional)} style={inputStyle}>
                  <option value='responsavel'>Responsável — acesso completo, fecha exercício</option>
                  <option value='operador'>Operador — classifica, exporta, comenta</option>
                  <option value='consultor'>Consultor — somente leitura e classificação</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => { setModal(false); setErro('') }}
                style={{ padding: '9px 18px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleConvidar} disabled={salvando}
                style={{ padding: '9px 18px', background: COM_C.roxo, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {salvando ? 'Enviando...' : 'Enviar Convite'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PageLayout>
  )
}
