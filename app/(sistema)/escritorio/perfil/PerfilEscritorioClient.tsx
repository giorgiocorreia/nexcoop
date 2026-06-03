'use client'
import { useEffect, useState } from 'react'
import { getEmpresasDoUsuario } from '@/lib/parceiros/actions'

const COR = '#0F766E'

export default function PerfilEscritorioClient({ userId, email }: { userId: string; email: string }) {
  const [prof, setProf] = useState<any>(null)
  const [empresa, setEmpresa] = useState<any>(null)

  useEffect(() => {
    getEmpresasDoUsuario(userId).then(empresas => {
      if (empresas.length > 0) {
        setEmpresa(empresas[0].empresa)
        setProf(empresas[0])
      }
    })
  }, [userId])

  return (
    <div style={{ padding: 32, maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 24 }}>Dados do Escritório</h1>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          ['Empresa', empresa?.razao_social],
          ['CNPJ', empresa?.cnpj || '—'],
          ['E-mail de contato', empresa?.email_contato],
          ['Telefone', empresa?.telefone || '—'],
          ['Cidade', empresa?.cidade || '—'],
          ['Estado', empresa?.estado || '—'],
          ['Seu nome', prof?.nome],
          ['Seu cargo', prof?.cargo || '—'],
          ['CRC', prof?.crc || '—'],
          ['E-mail', email],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{k}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{v || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
