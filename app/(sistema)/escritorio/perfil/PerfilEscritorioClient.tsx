'use client'
import { useEffect, useState } from 'react'
import { getEmpresasDoUsuario } from '@/lib/parceiros/actions'
import { PageLayout, MODULO_ESCRITORIO, COM_C } from '@/components/nexcoop/ui'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #d5d3cc',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  background: '#fafaf8', color: '#1a1a1a',
}

function Campo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
    </div>
  )
}

export default function PerfilEscritorioClient({ userId, email }: { userId: string; email: string }) {
  const [empresaId, setEmpresaId] = useState('')
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false)
  const [salvandoProf, setSalvandoProf] = useState(false)
  const [sucessoEmpresa, setSucessoEmpresa] = useState(false)
  const [sucessoProf, setSucessoProf] = useState(false)

  // Campos empresa
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [emailContato, setEmailContato] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [site, setSite] = useState('')

  // Campos profissional
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [crc, setCrc] = useState('')

  useEffect(() => {
    getEmpresasDoUsuario(userId).then(empresas => {
      if (empresas.length > 0) {
        const emp = empresas[0].empresa as any
        const prof = empresas[0] as any
        setEmpresaId(emp?.id || '')
        setRazaoSocial(emp?.razao_social || '')
        setCnpj(emp?.cnpj || '')
        setEmailContato(emp?.email_contato || '')
        setTelefone(emp?.telefone || '')
        setCidade(emp?.cidade || '')
        setEstado(emp?.estado || '')
        setSite(emp?.site || '')
        setNome(prof?.nome || '')
        setCargo(prof?.cargo || '')
        setCrc(prof?.crc || '')
      }
    })
  }, [userId])

  async function handleSalvarEmpresa() {
    setSalvandoEmpresa(true)
    try {
      await fetch('/api/parceiros/empresa', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, razao_social: razaoSocial, cnpj, email_contato: emailContato, telefone, cidade, estado, site }),
      })
      setSucessoEmpresa(true)
      setTimeout(() => setSucessoEmpresa(false), 3000)
    } finally { setSalvandoEmpresa(false) }
  }

  async function handleSalvarPerfil() {
    setSalvandoProf(true)
    try {
      await fetch('/api/aceitar-parceiro', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, nome, cargo, crc }),
      })
      setSucessoProf(true)
      setTimeout(() => setSucessoProf(false), 3000)
    } finally { setSalvandoProf(false) }
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 24, marginBottom: 24,
  }

  return (
    <PageLayout
      titulo="Perfil"
      subtitulo="Dados da empresa e do profissional"
      icone="ti-user"
      modulo={MODULO_ESCRITORIO}
      breadcrumb={[{ label: 'Perfil' }]}
    >
      <div style={{ maxWidth: 640 }}>

      {/* Bloco 1 — Dados da Empresa */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>Dados da Empresa</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Campo label="Razão Social" value={razaoSocial} onChange={setRazaoSocial} />
          <Campo label="CNPJ" value={cnpj} onChange={setCnpj} />
          <Campo label="E-mail de contato" value={emailContato} onChange={setEmailContato} />
          <Campo label="Telefone" value={telefone} onChange={setTelefone} />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}><Campo label="Cidade" value={cidade} onChange={setCidade} /></div>
            <div style={{ width: 80 }}><Campo label="Estado" value={estado} onChange={setEstado} /></div>
          </div>
          <Campo label="Site" value={site} onChange={setSite} />
        </div>
        {sucessoEmpresa && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, color: '#166534' }}>
            Dados da empresa salvos!
          </div>
        )}
        <button
          onClick={handleSalvarEmpresa}
          disabled={salvandoEmpresa}
          style={{ marginTop: 16, padding: '9px 20px', background: salvandoEmpresa ? '#9CA3AF' : COM_C.verde, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: salvandoEmpresa ? 'not-allowed' : 'pointer' }}>
          {salvandoEmpresa ? 'Salvando…' : 'Salvar dados da empresa'}
        </button>
      </div>

      {/* Bloco 2 — Meu Perfil */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>Meu Perfil</h2>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>{email}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Campo label="Nome completo" value={nome} onChange={setNome} />
          <Campo label="Cargo" value={cargo} onChange={setCargo} />
          <Campo label="CRC" value={crc} onChange={setCrc} />
        </div>
        {sucessoProf && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, color: '#166534' }}>
            Perfil salvo!
          </div>
        )}
        <button
          onClick={handleSalvarPerfil}
          disabled={salvandoProf}
          style={{ marginTop: 16, padding: '9px 20px', background: salvandoProf ? '#9CA3AF' : COM_C.verde, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: salvandoProf ? 'not-allowed' : 'pointer' }}>
          {salvandoProf ? 'Salvando…' : 'Salvar meu perfil'}
        </button>
      </div>
      </div>
    </PageLayout>
  )
}
