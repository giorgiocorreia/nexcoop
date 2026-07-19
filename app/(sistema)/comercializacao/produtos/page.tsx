'use client'

import { useEffect, useState } from 'react'
import { listarProdutos, criarProduto, editarProduto } from '@/lib/comercializacao/produtos.actions'
import { Btn } from '@/components/ui/Btn'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { Modal } from '@/components/comercializacao/ui/Modal'
import { Field, Input, Select } from '@/components/comercializacao/ui/Field'
import { COM_C } from '@/components/comercializacao/ui/tokens'

type Produto = {
  id: string
  nome: string
  categoria: string | null
  unidade: string
  ativo: boolean
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [form, setForm] = useState({ nome: '', categoria: '', unidade: 'kg' })
  const [editando, setEditando] = useState<Produto | null>(null)
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const data = await listarProdutos()
    setProdutos(data)
  }

  async function handleCriar() {
    if (!form.nome) return
    setStatus('salvando')
    try {
      await criarProduto(form)
      setForm({ nome: '', categoria: '', unidade: 'kg' })
      await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) {
      setErroMsg(e.message)
      setStatus('erro')
    }
  }

  async function handleEditar() {
    if (!editando) return
    setStatus('salvando')
    try {
      await editarProduto(editando.id, {
        nome: editando.nome,
        categoria: editando.categoria ?? '',
        unidade: editando.unidade,
        ativo: editando.ativo
      })
      setEditando(null)
      await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) {
      setErroMsg(e.message)
      setStatus('erro')
    }
  }

  const totais = {
    total: produtos.length,
    ativos: produtos.filter(p => p.ativo).length,
    inativos: produtos.filter(p => !p.ativo).length,
  }

  return (
    <PageLayout
      titulo="Produtos"
      subtitulo="Cadastro de produtos para comercialização"
      breadcrumb={[{ label: 'Produtos' }]}
      icone="ti-leaf"
    >
      <div className="com-kpi-grid-3">
        <KpiCard label="Total cadastrados" value={String(totais.total)} icon="ti-leaf" cor={COM_C.marrom} corLt={COM_C.marromLt} />
        <KpiCard label="Ativos" value={String(totais.ativos)} icon="ti-circle-check" cor={COM_C.verde} corLt={COM_C.verdeLt} />
        <KpiCard label="Inativos" value={String(totais.inativos)} icon="ti-circle-x" cor={COM_C.txtSub} corLt="#F5F5F4" />
      </div>

      <div style={{ marginBottom: 24 }}>
      <ContentCard title="Novo produto" subtitle="Adicione um produto ao catálogo">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <Field label="Nome">
              <Input
                placeholder="Nome do produto"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <Field label="Categoria">
              <Input
                placeholder="Categoria"
                value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              />
            </Field>
          </div>
          <div style={{ minWidth: 120 }}>
            <Field label="Unidade">
              <Select
                value={form.unidade}
                onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
              >
                <option value="kg">kg</option>
                <option value="unidade">unidade</option>
                <option value="litro">litro</option>
                <option value="caixa">caixa</option>
              </Select>
            </Field>
          </div>
          <Btn variante="marrom" icone="ti-plus" onClick={handleCriar} disabled={status === 'salvando' || !form.nome}>
            {status === 'salvando' ? 'Salvando...' : 'Adicionar'}
          </Btn>
        </div>
        {status === 'sucesso' && (
          <div style={{ marginTop: 12, color: COM_C.verde, fontSize: 13, fontWeight: 600 }}>
            Produto salvo com sucesso.
          </div>
        )}
        {status === 'erro' && (
          <div style={{ marginTop: 12, color: COM_C.vermelho, fontSize: 13 }}>{erroMsg}</div>
        )}
      </ContentCard>
      </div>

      <ContentCard title="Catálogo" subtitle={`${produtos.length} produto${produtos.length !== 1 ? 's' : ''} cadastrado${produtos.length !== 1 ? 's' : ''}`} noPadding>
        <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Unidade</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {produtos.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.nome}</td>
                <td style={{ color: COM_C.txtSub }}>{p.categoria || '—'}</td>
                <td style={{ color: COM_C.txtSub }}>{p.unidade}</td>
                <td>
                  <Badge
                    label={p.ativo ? 'Ativo' : 'Inativo'}
                    bg={p.ativo ? COM_C.verdeLt : '#F5F5F4'}
                    cor={p.ativo ? COM_C.verde : COM_C.txtSub}
                    dot
                  />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Btn variante="marrom-outline" tamanho="sm" onClick={() => setEditando(p)}>
                    Editar
                  </Btn>
                </td>
              </tr>
            ))}
            {produtos.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: COM_C.txtSub }}>
                  Nenhum produto cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ContentCard>

      {editando && (
        <Modal
          titulo="Editar produto"
          subtitulo="Atualize os dados do produto"
          onClose={() => setEditando(null)}
          largura={400}
          footer={
            <>
              <Btn variante="cinza" onClick={() => setEditando(null)}>Cancelar</Btn>
              <Btn variante="marrom" onClick={handleEditar} disabled={status === 'salvando'}>
                {status === 'salvando' ? 'Salvando...' : 'Salvar'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Nome">
              <Input
                value={editando.nome}
                onChange={e => setEditando(p => p && ({ ...p, nome: e.target.value }))}
              />
            </Field>
            <Field label="Categoria">
              <Input
                value={editando.categoria ?? ''}
                onChange={e => setEditando(p => p && ({ ...p, categoria: e.target.value }))}
                placeholder="Categoria"
              />
            </Field>
            <Field label="Unidade">
              <Select
                value={editando.unidade}
                onChange={e => setEditando(p => p && ({ ...p, unidade: e.target.value }))}
              >
                <option value="kg">kg</option>
                <option value="unidade">unidade</option>
                <option value="litro">litro</option>
                <option value="caixa">caixa</option>
              </Select>
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: COM_C.txt, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editando.ativo}
                onChange={e => setEditando(p => p && ({ ...p, ativo: e.target.checked }))}
              />
              Ativo
            </label>
          </div>
        </Modal>
      )}
    </PageLayout>
  )
}