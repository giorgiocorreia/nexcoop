'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  listarProdutores,
  criarProdutor,
  listarCooperadosSemProdutor
} from '@/lib/comercializacao/produtores.actions'
import { Btn } from '@/components/ui/Btn'
import { cpfInvalidoMsg } from '@/lib/utils/cpf'

const C = {
  cor: '#92400e', corLt: '#FDF8F4',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', sub: '#78716C',
}

type Produtor = {
  id: string; nome: string; cpf: string | null; telefone: string | null
  email: string | null; municipio: string | null; endereco: string | null
  tipo: 'externo' | 'cooperado'; cooperado_id: string | null
  area_total_ha: number | null; area_cacau_ha: number | null
  tem_certificacao: boolean; tipo_certificacao: string | null
  banco: string | null; agencia: string | null; conta_bancaria: string | null
  tipo_conta: string | null; chave_pix: string | null; ativo: boolean
  cooperados: { nome_completo: string } | null
}

type Cooperado = { id: string; nome: string }

const formVazio = {
  nome: '', cpf: '', telefone: '', email: '', municipio: '', endereco: '',
  tipo: 'externo' as 'externo' | 'cooperado', cooperado_id: '',
  area_total_ha: '', area_cacau_ha: '', tem_certificacao: false, tipo_certificacao: '',
  banco: '', agencia: '', conta_bancaria: '', tipo_conta: '', chave_pix: '',
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
    } catch (e: any) { console.error('[carregar] ERRO:', e?.message ?? e) }
  }

  function handleBuscaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setBusca(isCPFInput(v) ? formatarBuscaCPF(v) : v)
  }

  async function handleSalvar() {
    if (!form.nome) return
    if (form.cpf) {
      const erroCpf = cpfInvalidoMsg(form.cpf)
      if (erroCpf) { alert(erroCpf); return }
    }
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
      setForm(formVazio); setNovoForm(false)
      await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) { setErroMsg(e.message); setStatus('erro') }
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

  const inp: React.CSSProperties = {
    padding: '8px 12px', border: `1px solid ${C.borda}`,
    borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box',
  }

  return (
    <>
      <style>{`
        .prod-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .prod-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .prod-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .prod-content { padding: 16px; }
        }
      `}</style>

      <header className="prod-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.corLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-user-check" style={{ fontSize: 20, color: C.cor }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>
              Produtores
              {produtores.length > 0 && <span style={{ fontSize: 14, fontWeight: 400, color: C.sub, marginLeft: 8 }}>{produtores.length}</span>}
            </h1>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
              <Link href="/comercializacao" style={{ color: C.sub, textDecoration: 'none' }}>Comercialização</Link>
              {' / '}Produtores
            </div>
          </div>
        </div>
        <Btn variante="azul" icone="ti-plus" onClick={() => { setForm(formVazio); setNovoForm(true) }}>
          + Novo produtor
        </Btn>
      </header>

      <div className="prod-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>

        {status === 'sucesso' && (
          <div style={{ marginBottom: 16, color: '#166534', fontSize: 13 }}>✓ Produtor salvo com sucesso.</div>
        )}

        <div style={{ marginBottom: 16 }}>
          <input
            placeholder="Buscar por nome, CPF ou município..."
            value={busca}
            onChange={handleBuscaChange}
            style={{ width: '100%', maxWidth: 360, padding: '8px 12px', border: `1px solid ${C.borda}`, borderRadius: 8, fontSize: 14 }}
          />
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.borda}`, background: '#FAFAF8' }}>
                {['Nome', 'Tipo', 'Município', 'CPF', 'Telefone', 'Área cacau', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: h === '' ? 'right' : 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.sub }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {produtoresFiltrados.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid #F0EDE8` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => router.push(`/comercializacao/produtores/${p.id}`)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.txt, fontWeight: 600, fontSize: 14, padding: 0, textAlign: 'left' }}
                    >
                      {p.nome}
                    </button>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 99,
                      background: p.tipo === 'cooperado' ? '#DBEAFE' : C.corLt,
                      color:      p.tipo === 'cooperado' ? '#1E40AF' : C.cor }}>
                      {p.tipo === 'cooperado' ? 'Cooperado' : 'Externo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: C.sub, fontSize: 13 }}>{p.municipio ?? '—'}</td>
                  <td style={{ padding: '12px 16px', color: C.sub, fontSize: 13 }}>{exibirCPF(p.cpf)}</td>
                  <td style={{ padding: '12px 16px', color: C.sub, fontSize: 13 }}>{exibirTelefone(p.telefone)}</td>
                  <td style={{ padding: '12px 16px', color: C.sub, fontSize: 13 }}>{p.area_cacau_ha ? `${p.area_cacau_ha} ha` : '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 99,
                      background: p.ativo ? '#DCFCE7' : '#F1F0EB',
                      color:      p.ativo ? '#166534' : C.sub }}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Btn variante="cinza" tamanho="sm" icone="ti-eye" onClick={() => router.push(`/comercializacao/produtores/${p.id}`)}>
                      Ver ficha
                    </Btn>
                  </td>
                </tr>
              ))}
              {produtoresFiltrados.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: C.sub }}>
                  {busca ? 'Nenhum produtor encontrado.' : 'Nenhum produtor cadastrado ainda.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {novoForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, overflowY: 'auto', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 620, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.txt }}>Novo produtor</div>
              <button onClick={() => setNovoForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.sub, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Nome *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))} style={inp}>
                  <option value="externo">Externo</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>CPF</label>
                <input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: mascararCPF(e.target.value) }))} placeholder="000.000.000-00" style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Telefone</label>
                <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: mascararTelefone(e.target.value) }))} placeholder="(73) 99999-0000" style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>E-mail</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Município</label>
                <input value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} style={inp} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Endereço</label>
                <input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Área total (ha)</label>
                <input type="number" step="0.01" value={form.area_total_ha} onChange={e => setForm(f => ({ ...f, area_total_ha: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Área cacau (ha)</label>
                <input type="number" step="0.01" value={form.area_cacau_ha} onChange={e => setForm(f => ({ ...f, area_cacau_ha: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Certificação</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '8px 0' }}>
                  <input type="checkbox" checked={form.tem_certificacao} onChange={e => setForm(f => ({ ...f, tem_certificacao: e.target.checked }))} />
                  Possui certificação
                </label>
              </div>
              {form.tem_certificacao && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: C.sub }}>Tipo de certificação</label>
                  <input value={form.tipo_certificacao} onChange={e => setForm(f => ({ ...f, tipo_certificacao: e.target.value }))} placeholder="Ex: Orgânico, UTZ, Rainforest" style={inp} />
                </div>
              )}
              <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${C.borda}`, paddingTop: 12, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>Dados para pagamento</span>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Chave Pix</label>
                <input value={form.chave_pix} onChange={e => setForm(f => ({ ...f, chave_pix: e.target.value }))} placeholder="CPF, telefone, e-mail ou chave aleatória" style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Banco</label>
                <input value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Agência</label>
                <input value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Conta</label>
                <input value={form.conta_bancaria} onChange={e => setForm(f => ({ ...f, conta_bancaria: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>Tipo de conta</label>
                <select value={form.tipo_conta} onChange={e => setForm(f => ({ ...f, tipo_conta: e.target.value }))} style={inp}>
                  <option value="">Selecionar...</option>
                  <option value="corrente">Corrente</option>
                  <option value="poupanca">Poupança</option>
                  <option value="pix">Pix</option>
                </select>
              </div>
            </div>

            {status === 'erro' && <div style={{ marginTop: 12, color: '#991B1B', fontSize: 13 }}>{erroMsg}</div>}

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <Btn variante="cinza" onClick={() => setNovoForm(false)}>Cancelar</Btn>
              <Btn variante="verde" icone="ti-check" disabled={status === 'salvando'} onClick={handleSalvar}>
                {status === 'salvando' ? 'Salvando...' : 'Salvar'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
