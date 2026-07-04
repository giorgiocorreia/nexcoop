'use client'

import { useEffect, useState } from 'react'
import { listarCompradores, criarComprador, editarComprador } from '@/lib/comercializacao/compradores.actions'
import { Btn } from '@/components/ui/Btn'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Modal } from '@/components/comercializacao/ui/Modal'
import { Field, Input, Select } from '@/components/comercializacao/ui/Field'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { EmptyState } from '@/components/comercializacao/ui/EmptyState'
import { COM_C } from '@/components/comercializacao/ui/tokens'

type Comprador = {
  id: string; nome: string; tipo: 'exportador' | 'industria' | 'trader' | 'outro'
  cnpj: string | null; contato: string | null; email: string | null
  telefone: string | null; ie: string | null; logradouro: string | null
  numero: string | null; bairro: string | null; cep: string | null
  municipio: string | null; uf: string | null; ativo: boolean
}

const TIPO_LABEL: Record<string, string> = { exportador: 'Exportador', industria: 'Indústria', trader: 'Trader', outro: 'Outro' }
const TIPO_CORES: Record<string, { bg: string; color: string }> = {
  exportador: { bg: COM_C.azulLt, color: '#1E40AF' },
  industria:  { bg: '#F3E8FF', color: '#6B21A8' },
  trader:     { bg: COM_C.marromLt, color: COM_C.marrom },
  outro:      { bg: '#F1F0EB', color: COM_C.txtSub }
}

const formVazio = {
  nome: '', tipo: 'industria' as 'exportador' | 'industria' | 'trader' | 'outro',
  cnpj: '', contato: '', email: '', telefone: '', ie: '',
  logradouro: '', numero: '', bairro: '', cep: '', municipio: '', uf: 'BA'
}

function mascaraCNPJ(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 14)
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function mascaraCEP(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
}

function mascaraTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

function formatarCNPJ(cnpj: string | null): string {
  if (!cnpj) return '—'
  const d = cnpj.replace(/\D/g, '')
  return d.length !== 14 ? cnpj : mascaraCNPJ(d)
}

export default function CompradoresPage() {
  const [compradores, setCompradores] = useState<Comprador[]>([])
  const [editando, setEditando] = useState<Comprador | null>(null)
  const [form, setForm] = useState(formVazio)
  const [abrirModal, setAbrirModal] = useState(false)
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const data = await listarCompradores()
    setCompradores((data ?? []) as unknown as Comprador[])
  }

  function abrirNovo() {
    setEditando(null); setForm(formVazio); setAbrirModal(true)
  }

  function abrirEdicao(c: Comprador) {
    setEditando(c)
    setForm({
      nome: c.nome, tipo: c.tipo,
      cnpj: c.cnpj ? mascaraCNPJ(c.cnpj) : '',
      contato: c.contato ?? '', email: c.email ?? '',
      telefone: c.telefone ? mascaraTelefone(c.telefone) : '',
      ie: c.ie ?? '', logradouro: c.logradouro ?? '', numero: c.numero ?? '',
      bairro: c.bairro ?? '', cep: c.cep ? mascaraCEP(c.cep) : '',
      municipio: c.municipio ?? '', uf: c.uf ?? 'BA'
    })
    setAbrirModal(true)
  }

  function fecharModal() { setAbrirModal(false); setEditando(null); setErroMsg(''); setStatus('idle') }

  async function handleSalvar() {
    if (!form.nome) return
    setStatus('salvando')
    try {
      const payload = {
        nome: form.nome, tipo: form.tipo,
        cnpj: form.cnpj ? form.cnpj.replace(/\D/g, '') : undefined,
        contato: form.contato || undefined, email: form.email || undefined,
        telefone: form.telefone ? form.telefone.replace(/\D/g, '') : undefined,
        ie: form.ie || undefined, logradouro: form.logradouro || undefined,
        numero: form.numero || undefined, bairro: form.bairro || undefined,
        cep: form.cep ? form.cep.replace(/\D/g, '') : undefined,
        municipio: form.municipio || undefined, uf: form.uf || undefined
      }
      if (editando) {
        await editarComprador(editando.id, { ...payload, ativo: editando.ativo })
      } else {
        await criarComprador(payload)
      }
      fecharModal(); await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) { setErroMsg(e.message); setStatus('erro') }
  }

  return (
    <PageLayout
      titulo="Compradores"
      subtitulo={compradores.length > 0 ? `${compradores.length} cadastrados` : undefined}
      breadcrumb={[{ label: 'Compradores' }]}
      icone="ti-building-store"
      fullHeight
      acoes={
        <Btn variante="marrom" icone="ti-plus" onClick={abrirNovo}>
          Novo comprador
        </Btn>
      }
    >
      {status === 'sucesso' && (
        <div style={{ marginBottom: 16, color: COM_C.verde, fontSize: 13 }}>✓ Comprador salvo com sucesso.</div>
      )}

      {compradores.length === 0 ? (
        <EmptyState
          emoji="🏢"
          titulo="Nenhum comprador cadastrado ainda"
          descricao="Cadastre compradores para vincular aos lotes de venda."
          acao={{ label: 'Novo comprador', onClick: abrirNovo }}
        />
      ) : (
        <ContentCard noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nome', 'Tipo', 'CNPJ', 'Contato', 'Telefone', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: h === '' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compradores.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.nome}</td>
                    <td>
                      <Badge label={TIPO_LABEL[c.tipo]} bg={TIPO_CORES[c.tipo].bg} cor={TIPO_CORES[c.tipo].color} />
                    </td>
                    <td style={{ color: COM_C.txtSub }}>{formatarCNPJ(c.cnpj)}</td>
                    <td style={{ color: COM_C.txtSub }}>{c.contato ?? '—'}</td>
                    <td style={{ color: COM_C.txtSub }}>{c.telefone ? mascaraTelefone(c.telefone) : '—'}</td>
                    <td>
                      <Badge
                        label={c.ativo ? 'Ativo' : 'Inativo'}
                        bg={c.ativo ? COM_C.verdeLt : '#F1F0EB'}
                        cor={c.ativo ? COM_C.verde : COM_C.txtSub}
                        dot
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Btn variante="marrom-outline" tamanho="sm" onClick={() => abrirEdicao(c)}>
                        Editar
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContentCard>
      )}

      {abrirModal && (
        <Modal
          titulo={editando ? 'Editar comprador' : 'Novo comprador'}
          onClose={fecharModal}
          largura={560}
          footer={
            <>
              <Btn variante="cinza" onClick={fecharModal}>Cancelar</Btn>
              <Btn variante="marrom" onClick={handleSalvar} disabled={status === 'salvando'}>
                {status === 'salvando' ? 'Salvando...' : 'Salvar'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 2 }}>
                <Field label="Nome *">
                  <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Tipo *">
                  <Select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))}>
                    <option value="exportador">Exportador</option>
                    <option value="industria">Indústria</option>
                    <option value="trader">Trader</option>
                    <option value="outro">Outro</option>
                  </Select>
                </Field>
              </div>
            </div>
            <Field label="CNPJ">
              <Input value={form.cnpj} placeholder="00.000.000/0001-00" onChange={e => setForm(f => ({ ...f, cnpj: mascaraCNPJ(e.target.value) }))} />
            </Field>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="Contato (nome)">
                  <Input value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Telefone">
                  <Input value={form.telefone} placeholder="(00) 00000-0000" onChange={e => setForm(f => ({ ...f, telefone: mascaraTelefone(e.target.value) }))} />
                </Field>
              </div>
            </div>
            <Field label="E-mail">
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </Field>

            <div style={{ borderTop: `1px solid ${COM_C.borda}`, paddingTop: 12, marginTop: 4 }}>
              <div className="com-section-label">Endereço fiscal</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Inscrição Estadual (IE)">
                  <Input value={form.ie} onChange={e => setForm(f => ({ ...f, ie: e.target.value }))} placeholder="Ex: 12345678" />
                </Field>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 3 }}>
                    <Field label="Logradouro">
                      <Input value={form.logradouro} onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))} placeholder="Rua, Av, Rod..." />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="Número">
                      <Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="S/N" />
                    </Field>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 2 }}>
                    <Field label="Bairro">
                      <Input value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="CEP">
                      <Input value={form.cep} placeholder="00000-000" onChange={e => setForm(f => ({ ...f, cep: mascaraCEP(e.target.value) }))} />
                    </Field>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 3 }}>
                    <Field label="Município">
                      <Input value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="UF">
                      <Input value={form.uf} maxLength={2} onChange={e => setForm(f => ({ ...f, uf: e.target.value.toUpperCase() }))} />
                    </Field>
                  </div>
                </div>
              </div>
            </div>

            {editando && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={editando.ativo} onChange={e => setEditando(c => c && ({ ...c, ativo: e.target.checked }))} />
                Ativo
              </label>
            )}
          </div>

          {status === 'erro' && <div style={{ marginTop: 12, color: COM_C.vermelho, fontSize: 13 }}>{erroMsg}</div>}
        </Modal>
      )}
    </PageLayout>
  )
}