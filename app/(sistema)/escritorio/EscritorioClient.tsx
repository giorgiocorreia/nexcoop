'use client'

import { useEffect, useState } from 'react'
import { getEscritorioDoContador, criarOuAtualizarEscritorio } from '@/lib/contabil/actions'

const COR = '#0F766E'

interface Props { userId: string }

export default function EscritorioClient({ userId }: Props) {
  const [escritorio, setEscritorio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [crc, setCrc] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')

  useEffect(() => {
    getEscritorioDoContador(userId).then(data => {
      if (data) {
        setEscritorio(data)
        setRazaoSocial(data.razao_social || '')
        setCnpj(data.cnpj || '')
        setCrc(data.crc_responsavel || '')
        setEmail(data.email_contato || '')
        setTelefone(data.telefone || '')
      } else {
        setEditando(true)
      }
    }).finally(() => setLoading(false))
  }, [userId])

  async function handleSalvar() {
    if (!razaoSocial || !email) { setErro('Razão social e e-mail são obrigatórios.'); return }
    setSalvando(true); setErro('')
    try {
      await criarOuAtualizarEscritorio({ usuario_id: userId, razao_social: razaoSocial, cnpj, crc_responsavel: crc, email_contato: email, telefone })
      const atualizado = await getEscritorioDoContador(userId)
      setEscritorio(atualizado)
      setEditando(false)
      setSucesso('Dados do escritório salvos!')
      setTimeout(() => setSucesso(''), 3000)
    } catch (e: any) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  if (loading) return <div style={{ padding: 32, color: '#6b7280' }}>Carregando...</div>

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Meu Escritório</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Dados do escritório de contabilidade e plano de contas centralizado</p>
        </div>
        {!editando && (
          <button onClick={() => setEditando(true)} style={{ padding: '9px 18px', background: '#fff', color: COR, border: `1px solid ${COR}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
        )}
      </div>

      {sucesso && <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13 }}>{sucesso}</div>}
      {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>{erro}</div>}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 24, marginBottom: 24 }}>
        {editando ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[['Razão Social *', razaoSocial, setRazaoSocial, 'Ex: Salomão Contabilidade Ltda'],['CNPJ', cnpj, setCnpj, '00.000.000/0001-00'],['CRC Responsável', crc, setCrc, 'Ex: CRC-BA 012345/O-1'],['E-mail de contato *', email, setEmail, 'contador@escritorio.com.br'],['Telefone', telefone, setTelefone, '(73) 99999-9999']].map(([label, val, setter, ph]: any) => (
              <div key={label}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                <input value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              {escritorio && <button onClick={() => setEditando(false)} style={{ padding: '9px 18px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>Cancelar</button>}
              <button onClick={handleSalvar} disabled={salvando} style={{ padding: '9px 18px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[['Razão Social', escritorio?.razao_social],['CNPJ', escritorio?.cnpj],['CRC Responsável', escritorio?.crc_responsavel],['E-mail', escritorio?.email_contato],['Telefone', escritorio?.telefone]].map(([k, v]) => (
              <div key={k as string} style={{ background: '#f8f7f4', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{k}</p>
                <p style={{ margin: '3px 0 0', fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{v || '—'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {escritorio && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[{ titulo: 'Plano de Contas', desc: 'Cadastre e gerencie as contas do seu escritório', href: '/escritorio/plano-de-contas', icon: '📋' },
            { titulo: 'Organizações Clientes', desc: 'Veja todas as cooperativas que te vincularam', href: '/escritorio/organizacoes', icon: '🏢' }].map(card => (
            <a key={card.titulo} href={card.href} style={{ display: 'block', background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 20, textDecoration: 'none' }}>
              <p style={{ margin: '0 0 6px', fontSize: 20 }}>{card.icon}</p>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{card.titulo}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{card.desc}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
