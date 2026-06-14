'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listarProdutores,
  criarProdutor,
  listarCooperadosSemProdutor
} from '@/lib/comercializacao/produtores.actions'
import { Btn } from '@/components/ui/Btn'

type Produtor = {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  email: string | null
  municipio: string | null
  endereco: string | null
  tipo: 'externo' | 'cooperado'
  cooperado_id: string | null
  area_total_ha: number | null
  area_cacau_ha: number | null
  tem_certificacao: boolean
  tipo_certificacao: string | null
  banco: string | null
  agencia: string | null
  conta_bancaria: string | null
  tipo_conta: string | null
  chave_pix: string | null
  ativo: boolean
  cooperados: { nome_completo: string } | null
}

type Cooperado = { id: string; nome: string }

const formVazio = {
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  municipio: '',
  endereco: '',
  tipo: 'externo' as 'externo' | 'cooperado',
  cooperado_id: '',
  area_total_ha: '',
  area_cacau_ha: '',
  tem_certificacao: false,
  tipo_certificacao: '',
  banco: '',
  agencia: '',
  conta_bancaria: '',
  tipo_conta: '',
  chave_pix: '',
}

function mascararCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function mascararTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

function isCPFInput(v: string) {
  return /^[\d.\-]+$/.test(v) && v.replace(/\D/g, '').length >= 3
}

function formatarBuscaCPF(v: string) {
  return mascararCPF(v.replace(/\D/g, '').slice(0, 11))
}

function exibirCPF(cpf: string | null) {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  return d.length === 11 ? mascararCPF(d) : cpf
}

function exibirTelefone(tel: string | null) {
  if (!tel) return '—'
  return mascararTelefone(tel)
}

export default function ProdutoresPage() {
  const router = useRouter()
  const [produtores, setProdutores] = useState<Produtor[]>([])
  const [cooperados, setCooperados] = useState<Cooperado[]>([])
  const [form, setForm] = useState(formVazio)
  const [novoForm, setNovoForm] = useState(false)
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const [p, c] = await Promise.all([listarProdutores(), listarCooperadosSemProdutor()])
      setProdutores(p as unknown as Produtor[])
      setCooperados(c as unknown as Cooperado[])
    } catch (e: any) {
      console.error('[carregar] ERRO:', e?.message ?? e)
    }
  }

  function handleBuscaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setBusca(isCPFInput(v) ? formatarBuscaCPF(v) : v)
  }

  async function handleSalvar() {
    if (!form.nome) return
    setStatus('salvando')
    try {
      const payload = {
        ...form,
        area_total_ha: form.area_total_ha ? parseFloat(form.area_total_ha) : undefined,
        area_cacau_ha: form.area_cacau_ha ? parseFloat(form.area_cacau_ha) : undefined,
        cooperado_id: form.cooperado_id || undefined,
        cpf: form.cpf ? form.cpf.replace(/\D/g, '') : undefined,
        telefone: form.telefone ? form.telefone.replace(/\D/g, '') : undefined,
        email: form.email || undefined,
        municipio: form.municipio || undefined,
        endereco: form.endereco || undefined,
        tipo_certificacao: form.tipo_certificacao || undefined,
        banco: form.banco || undefined,
        agencia: form.agencia || undefined,
        conta_bancaria: form.conta_bancaria || undefined,
        tipo_conta: form.tipo_conta || undefined,
        chave_pix: form.chave_pix || undefined,
      }
      await criarProdutor(payload)
      setForm(formVazio)
      setNovoForm(false)
      await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) {
      setErroMsg(e.message)
      setStatus('erro')
    }
  }

  const buscaLimpa = busca.replace(/\D/g, '')
  const produtoresFiltrados = produtores.filter(p => {
    const cpfLimpo = (p.cpf ?? '').replace(/\D/g, '')
    return (
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (buscaLimpa.length >= 3 && cpfLimpo.includes(buscaLimpa)) ||
      (p.municipio ?? '').toLowerCase().includes(busca.toLowerCase())
    )
  })

  const modalAberto = novoForm

  const inp: React.CSSProperties = {
    padding: '8px 12px', border: '1px solid #e5e3dc',
    borderRadius: '8px', fontSize: '14px', width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>
      <button
        onClick={() => router.push('/comercializacao')}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b6b', fontSize: '14px', marginBottom: '20px', padding: 0 }}
      >
        <span style={{ fontSize: '18px', lineHeight: 1 }}>←</span> Voltar
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0 }}>Produtores</h1>
        <Btn variante="azul" icone="ti-plus" onClick={() => { setForm(formVazio); setNovoForm(true) }}>
          + Novo produtor
        </Btn>
      </div>

      {status === 'sucesso' && (
        <div style={{ marginBottom: '16px', color: '#166534', fontSize: '13px' }}>✓ Produtor salvo com sucesso.</div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <input
          placeholder="Buscar por nome, CPF ou município..."
          value={busca}
          onChange={handleBuscaChange}
          style={{ width: '100%', maxWidth: '360px', padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: '8px', fontSize: '14px' }}
        />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Nome</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Tipo</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Município</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>CPF</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Telefone</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Área cacau</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtoresFiltrados.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => router.push(`/comercializacao/produtores/${p.id}`)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a1a1a', fontWeight: 500, fontSize: '14px', padding: 0, textAlign: 'left' }}
                  >
                    {p.nome}
                  </button>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '12px', padding: '2px 10px', borderRadius: '20px',
                    background: p.tipo === 'cooperado' ? '#dbeafe' : '#f1f0eb',
                    color: p.tipo === 'cooperado' ? '#1e40af' : '#6b6b6b'
                  }}>
                    {p.tipo === 'cooperado' ? 'Cooperado' : 'Externo'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#6b6b6b', fontSize: '13px' }}>{p.municipio ?? '—'}</td>
                <td style={{ padding: '12px 16px', color: '#6b6b6b', fontSize: '13px' }}>{exibirCPF(p.cpf)}</td>
                <td style={{ padding: '12px 16px', color: '#6b6b6b', fontSize: '13px' }}>{exibirTelefone(p.telefone)}</td>
                <td style={{ padding: '12px 16px', color: '#6b6b6b', fontSize: '13px' }}>
                  {p.area_cacau_ha ? `${p.area_cacau_ha} ha` : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '12px', padding: '2px 10px', borderRadius: '20px',
                    background: p.ativo ? '#dcfce7' : '#f1f0eb',
                    color: p.ativo ? '#166534' : '#6b6b6b'
                  }}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <Btn variante="cinza" tamanho="sm" icone="ti-eye" onClick={() => router.push(`/comercializacao/produtores/${p.id}`)}>
                      Ver ficha
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
            {produtoresFiltrados.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#6b6b6b' }}>
                  {busca ? 'Nenhum produtor encontrado.' : 'Nenhum produtor cadastrado ainda.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          overflowY: 'auto', padding: '24px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '28px',
            width: '620px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontWeight: 600, fontSize: '16px' }}>Novo produtor</div>
              <button
                onClick={() => setNovoForm(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b6b6b', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Nome *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))} style={inp}>
                  <option value="externo">Externo</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>CPF</label>
                <input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: mascararCPF(e.target.value) }))} placeholder="000.000.000-00" style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Telefone</label>
                <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: mascararTelefone(e.target.value) }))} placeholder="(73) 99999-0000" style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>E-mail</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Município</label>
                <input value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} style={inp} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Endereço</label>
                <input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Área total (ha)</label>
                <input type="number" step="0.01" value={form.area_total_ha} onChange={e => setForm(f => ({ ...f, area_total_ha: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Área cacau (ha)</label>
                <input type="number" step="0.01" value={form.area_cacau_ha} onChange={e => setForm(f => ({ ...f, area_cacau_ha: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Certificação</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', padding: '8px 0' }}>
                  <input type="checkbox" checked={form.tem_certificacao} onChange={e => setForm(f => ({ ...f, tem_certificacao: e.target.checked }))} />
                  Possui certificação
                </label>
              </div>
              {form.tem_certificacao && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Tipo de certificação</label>
                  <input value={form.tipo_certificacao} onChange={e => setForm(f => ({ ...f, tipo_certificacao: e.target.value }))} placeholder="Ex: Orgânico, UTZ, Rainforest" style={inp} />
                </div>
              )}
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e5e3dc', paddingTop: '12px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: '#6b6b6b', fontWeight: 500 }}>Dados para pagamento</span>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Chave Pix</label>
                <input value={form.chave_pix} onChange={e => setForm(f => ({ ...f, chave_pix: e.target.value }))} placeholder="CPF, telefone, e-mail ou chave aleatória" style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Banco</label>
                <input value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Agência</label>
                <input value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Conta</label>
                <input value={form.conta_bancaria} onChange={e => setForm(f => ({ ...f, conta_bancaria: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#6b6b6b' }}>Tipo de conta</label>
                <select value={form.tipo_conta} onChange={e => setForm(f => ({ ...f, tipo_conta: e.target.value }))} style={inp}>
                  <option value="">Selecionar...</option>
                  <option value="corrente">Corrente</option>
                  <option value="poupanca">Poupança</option>
                  <option value="pix">Pix</option>
                </select>
              </div>
            </div>

            {status === 'erro' && (
              <div style={{ marginTop: '12px', color: '#991b1b', fontSize: '13px' }}>{erroMsg}</div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <Btn variante="cinza" onClick={() => setNovoForm(false)}>
                Cancelar
              </Btn>
              <Btn variante="verde" icone="ti-check" disabled={status === 'salvando'} onClick={handleSalvar}>
                {status === 'salvando' ? 'Salvando...' : 'Salvar'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}