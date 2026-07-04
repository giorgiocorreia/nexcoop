'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listarProdutores,
  criarProdutor,
  listarCooperadosSemProdutor
} from '@/lib/comercializacao/produtores.actions'
import { Btn } from '@/components/ui/Btn'
import { cpfInvalidoMsg } from '@/lib/utils/cpf'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Modal } from '@/components/comercializacao/ui/Modal'
import { Field, Input, Select } from '@/components/comercializacao/ui/Field'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { EmptyState } from '@/components/comercializacao/ui/EmptyState'
import { COM_C } from '@/components/comercializacao/ui/tokens'

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

  return (
    <PageLayout
      titulo="Produtores"
      subtitulo={produtores.length > 0 ? `${produtores.length} cadastrados` : undefined}
      breadcrumb={[{ label: 'Produtores' }]}
      icone="ti-user-check"
      fullHeight
      acoes={
        <Btn variante="marrom" icone="ti-plus" onClick={() => { setForm(formVazio); setNovoForm(true) }}>
          Novo produtor
        </Btn>
      }
    >
      {status === 'sucesso' && (
        <div style={{ marginBottom: 16, color: COM_C.verde, fontSize: 13 }}>✓ Produtor salvo com sucesso.</div>
      )}

      <div style={{ marginBottom: 16, maxWidth: 360 }}>
        <Input
          placeholder="Buscar por nome, CPF ou município..."
          value={busca}
          onChange={handleBuscaChange}
        />
      </div>

      {produtoresFiltrados.length === 0 ? (
        <EmptyState
          emoji="👨‍🌾"
          titulo={busca ? 'Nenhum produtor encontrado' : 'Nenhum produtor cadastrado ainda'}
          descricao={busca ? 'Tente outro termo de busca.' : 'Cadastre o primeiro produtor para começar.'}
          acao={!busca ? { label: 'Novo produtor', onClick: () => { setForm(formVazio); setNovoForm(true) } } : undefined}
        />
      ) : (
        <ContentCard noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nome', 'Tipo', 'Município', 'CPF', 'Telefone', 'Área cacau', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: h === '' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {produtoresFiltrados.map(p => (
                  <tr key={p.id}>
                    <td>
                      <button
                        onClick={() => router.push(`/comercializacao/produtores/${p.id}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: COM_C.txt, fontWeight: 600, fontSize: 14, padding: 0, textAlign: 'left' }}
                      >
                        {p.nome}
                      </button>
                    </td>
                    <td>
                      <Badge
                        label={p.tipo === 'cooperado' ? 'Cooperado' : 'Externo'}
                        bg={p.tipo === 'cooperado' ? COM_C.azulLt : COM_C.marromLt}
                        cor={p.tipo === 'cooperado' ? '#1E40AF' : COM_C.marrom}
                      />
                    </td>
                    <td style={{ color: COM_C.txtSub }}>{p.municipio ?? '—'}</td>
                    <td style={{ color: COM_C.txtSub }}>{exibirCPF(p.cpf)}</td>
                    <td style={{ color: COM_C.txtSub }}>{exibirTelefone(p.telefone)}</td>
                    <td style={{ color: COM_C.txtSub }}>{p.area_cacau_ha ? `${p.area_cacau_ha} ha` : '—'}</td>
                    <td>
                      <Badge
                        label={p.ativo ? 'Ativo' : 'Inativo'}
                        bg={p.ativo ? COM_C.verdeLt : '#F1F0EB'}
                        cor={p.ativo ? COM_C.verde : COM_C.txtSub}
                        dot
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Btn variante="cinza" tamanho="sm" icone="ti-eye" onClick={() => router.push(`/comercializacao/produtores/${p.id}`)}>
                        Ver ficha
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContentCard>
      )}

      {novoForm && (
        <Modal
          titulo="Novo produtor"
          onClose={() => setNovoForm(false)}
          largura={620}
          footer={
            <>
              <Btn variante="cinza" onClick={() => setNovoForm(false)}>Cancelar</Btn>
              <Btn variante="verde" icone="ti-check" disabled={status === 'salvando'} onClick={handleSalvar}>
                {status === 'salvando' ? 'Salvando...' : 'Salvar'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Nome *">
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </Field>
            </div>
            <Field label="Tipo">
              <Select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))}>
                <option value="externo">Externo</option>
              </Select>
            </Field>
            <Field label="CPF">
              <Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: mascararCPF(e.target.value) }))} placeholder="000.000.000-00" />
            </Field>
            <Field label="Telefone">
              <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: mascararTelefone(e.target.value) }))} placeholder="(73) 99999-0000" />
            </Field>
            <Field label="E-mail">
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Município">
              <Input value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Endereço">
                <Input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
              </Field>
            </div>
            <Field label="Área total (ha)">
              <Input type="number" step="0.01" value={form.area_total_ha} onChange={e => setForm(f => ({ ...f, area_total_ha: e.target.value }))} />
            </Field>
            <Field label="Área cacau (ha)">
              <Input type="number" step="0.01" value={form.area_cacau_ha} onChange={e => setForm(f => ({ ...f, area_cacau_ha: e.target.value }))} />
            </Field>
            <Field label="Certificação">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '8px 0' }}>
                <input type="checkbox" checked={form.tem_certificacao} onChange={e => setForm(f => ({ ...f, tem_certificacao: e.target.checked }))} />
                Possui certificação
              </label>
            </Field>
            {form.tem_certificacao && (
              <Field label="Tipo de certificação">
                <Input value={form.tipo_certificacao} onChange={e => setForm(f => ({ ...f, tipo_certificacao: e.target.value }))} placeholder="Ex: Orgânico, UTZ, Rainforest" />
              </Field>
            )}
            <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${COM_C.borda}`, paddingTop: 12, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: COM_C.txtSub, fontWeight: 600 }}>Dados para pagamento</span>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Chave Pix">
                <Input value={form.chave_pix} onChange={e => setForm(f => ({ ...f, chave_pix: e.target.value }))} placeholder="CPF, telefone, e-mail ou chave aleatória" />
              </Field>
            </div>
            <Field label="Banco">
              <Input value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} />
            </Field>
            <Field label="Agência">
              <Input value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))} />
            </Field>
            <Field label="Conta">
              <Input value={form.conta_bancaria} onChange={e => setForm(f => ({ ...f, conta_bancaria: e.target.value }))} />
            </Field>
            <Field label="Tipo de conta">
              <Select value={form.tipo_conta} onChange={e => setForm(f => ({ ...f, tipo_conta: e.target.value }))}>
                <option value="">Selecionar...</option>
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupança</option>
                <option value="pix">Pix</option>
              </Select>
            </Field>
          </div>

          {status === 'erro' && <div style={{ marginTop: 12, color: COM_C.vermelho, fontSize: 13 }}>{erroMsg}</div>}
        </Modal>
      )}
    </PageLayout>
  )
}