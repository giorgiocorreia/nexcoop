'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { traduzirErro } from '@/lib/utils/erros'
import type { CategoriaDocumento } from '@/types/database'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, ContentCard, Field, Input, Select, Textarea,
  AlertBanner, MODULO_NEXCOOP, COM_C,
} from '@/components/nexcoop/ui'

const CATEGORIAS: { valor: CategoriaDocumento; label: string; icone: string }[] = [
  { valor: 'estatuto',   label: 'Estatuto',    icone: '📋' },
  { valor: 'ata',        label: 'Ata',         icone: '📝' },
  { valor: 'contrato',   label: 'Contrato',    icone: '🤝' },
  { valor: 'convenio',   label: 'Convênio',    icone: '🔗' },
  { valor: 'edital',     label: 'Edital',      icone: '📢' },
  { valor: 'certidao',   label: 'Certidão',    icone: '📜' },
  { valor: 'licenca',    label: 'Licença',     icone: '🔑' },
  { valor: 'relatorio',  label: 'Relatório',   icone: '📊' },
  { valor: 'financeiro', label: 'Financeiro',  icone: '💰' },
  { valor: 'projeto',    label: 'Projeto',     icone: '🎯' },
  { valor: 'aditivo',    label: 'Aditivo',     icone: '📎' },
  { valor: 'outro',      label: 'Outro',       icone: '📄' },
]

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

interface FormData {
  nome: string
  categoria: CategoriaDocumento
  numero_documento: string
  orgao_emissor: string
  descricao: string
  data_emissao: string
  data_validade: string
  alerta_dias: string
  restrito: boolean
  versao: string
  arquivo_url: string
}

const INICIAL: FormData = {
  nome: '', categoria: 'outro', numero_documento: '',
  orgao_emissor: '', descricao: '', data_emissao: '',
  data_validade: '', alerta_dias: '30', restrito: false,
  versao: '1', arquivo_url: '',
}

export default function NovoDocumentoPage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm]         = useState<FormData>(INICIAL)
  const [arquivo, setArquivo]   = useState<File | null>(null)
  const [progresso, setProgresso] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  const set = (campo: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [campo]: e.target.value }))

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setArquivo(f)
    if (f) setForm(p => ({ ...p, arquivo_url: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim())                      { setErro('Nome é obrigatório.'); return }
    if (!arquivo && !form.arquivo_url.trim())   { setErro('Selecione um arquivo ou informe a URL do documento.'); return }

    setSalvando(true)
    setErro('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: usuario } = await supabase
      .from('usuarios').select('organizacao_id').eq('id', user.id).single()

    if (!usuario?.organizacao_id) {
      setErro('Usuário sem organização vinculada.')
      setSalvando(false)
      return
    }

    let arquivoUrl = form.arquivo_url.trim()

    if (arquivo) {
      setProgresso('uploading')
      const ext  = arquivo.name.split('.').pop() ?? 'bin'
      const path = `${usuario.organizacao_id}/${form.categoria}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('documentos')
        .upload(path, arquivo, { contentType: arquivo.type, upsert: false })

      if (uploadErr) {
        const msg = uploadErr.message.includes('Bucket not found')
          ? 'Bucket "documentos" não existe no Supabase Storage. Crie-o primeiro ou informe a URL manualmente.'
          : traduzirErro(uploadErr.message)
        setErro(msg)
        setSalvando(false)
        setProgresso('idle')
        return
      }

      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path)
      arquivoUrl = urlData.publicUrl
      setProgresso('done')
    }

    const payload = {
      organizacao_id:   usuario.organizacao_id,
      nome:             form.nome.trim(),
      categoria:        form.categoria,
      numero_documento: form.numero_documento.trim() || null,
      orgao_emissor:    form.orgao_emissor.trim()    || null,
      descricao:        form.descricao.trim()        || null,
      data_emissao:     form.data_emissao            || null,
      data_validade:    form.data_validade           || null,
      alerta_dias:      parseInt(form.alerta_dias, 10) || 30,
      restrito:         form.restrito,
      versao:           parseInt(form.versao, 10)    || 1,
      arquivo_url:      arquivoUrl,
      tamanho_bytes:    arquivo ? arquivo.size  : null,
      tipo_mime:        arquivo ? arquivo.type  : null,
      usuario_id:       user.id,
    }

    const { data, error: insertErr } = await supabase
      .from('documentos').insert(payload).select().single()

    if (insertErr) {
      setErro(traduzirErro(insertErr.message))
      setSalvando(false)
      return
    }

    router.push(`/documentos/${data.id}`)
  }

  const catAtual = CATEGORIAS.find(c => c.valor === form.categoria)!

  return (
    <PageLayout
      titulo="Novo Documento"
      icone="ti-files"
      modulo={MODULO_NEXCOOP}
      breadcrumb={[
        { label: 'Documentos', href: '/documentos' },
        { label: 'Novo' },
      ]}
      fullHeight
    >
      <div style={{ maxWidth: 720 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <ContentCard title="Identificação">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Nome do documento *">
                  <Input type="text" value={form.nome} onChange={set('nome')}
                    placeholder="Ex.: Estatuto Social 2024" required
                  />
                </Field>

                <Field label="Categoria *">
                  <Select value={form.categoria} onChange={set('categoria')}>
                    {CATEGORIAS.map(c => (
                      <option key={c.valor} value={c.valor}>{c.icone} {c.label}</option>
                    ))}
                  </Select>
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Número / Código">
                    <Input type="text" value={form.numero_documento} onChange={set('numero_documento')}
                      placeholder="Ex.: 001/2024"
                    />
                  </Field>
                  <Field label="Órgão emissor">
                    <Input type="text" value={form.orgao_emissor} onChange={set('orgao_emissor')}
                      placeholder="Ex.: JUCEB, Receita Federal"
                    />
                  </Field>
                </div>

                <Field label="Descrição">
                  <Textarea value={form.descricao} onChange={set('descricao')}
                    placeholder="Resumo ou observações sobre o documento…"
                    rows={3} style={{ minHeight: 72 }}
                  />
                </Field>
              </div>
            </ContentCard>

            <ContentCard title="Arquivo">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Enviar arquivo" hint="PDF, DOCX, XLSX, imagem — máx. 20 MB. Requer bucket 'documentos' no Supabase Storage.">
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: `2px dashed ${arquivo ? COM_C.roxo : COM_C.borda}`,
                      borderRadius: 10, padding: '1.25rem', textAlign: 'center',
                      cursor: 'pointer', background: arquivo ? COM_C.roxoLt : '#fafaf8',
                      transition: 'all 0.15s',
                    }}
                  >
                    {arquivo ? (
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{catAtual.icone}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: COM_C.roxo }}>{arquivo.name}</div>
                        <div style={{ fontSize: 11, color: COM_C.txtSub, marginTop: 2 }}>
                          {arquivo.type} · {formatBytes(arquivo.size)}
                        </div>
                        <button type="button" onClick={e => { e.stopPropagation(); setArquivo(null); if (fileRef.current) fileRef.current.value = '' }}
                          style={{ marginTop: 8, fontSize: 11, color: COM_C.vermelho, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                          Remover
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 28, marginBottom: 4 }}>📁</div>
                        <div style={{ fontSize: 13, color: COM_C.txtSub }}>Clique para selecionar um arquivo</div>
                        <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 2 }}>ou arraste e solte aqui</div>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" onChange={handleArquivo} style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                  />
                  {progresso === 'uploading' && (
                    <div style={{ fontSize: 12, color: '#854F0B', marginTop: 6 }}>⏳ Enviando arquivo…</div>
                  )}
                </Field>

                <Field label="Ou informe a URL do arquivo" hint="Use se o arquivo já estiver hospedado em outro lugar.">
                  <Input type="url" value={form.arquivo_url} onChange={set('arquivo_url')}
                    placeholder="https://…" disabled={!!arquivo}
                    style={{ opacity: arquivo ? 0.5 : 1, cursor: arquivo ? 'not-allowed' : 'text' }}
                  />
                </Field>
              </div>
            </ContentCard>

            <ContentCard title="Datas e Validade">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Data de emissão">
                    <Input type="date" value={form.data_emissao} onChange={set('data_emissao')} />
                  </Field>
                  <Field label="Data de validade">
                    <Input type="date" value={form.data_validade} onChange={set('data_validade')} />
                  </Field>
                </div>

                <Field label="Alerta de vencimento (dias)" hint="Quantos dias antes do vencimento o sistema deve alertar.">
                  <Input type="number" value={form.alerta_dias} onChange={set('alerta_dias')}
                    min="1" max="365" placeholder="30" style={{ maxWidth: 160 }}
                  />
                </Field>
              </div>
            </ContentCard>

            <ContentCard title="Configurações">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Versão" hint="Número de versão do documento.">
                  <Input type="number" value={form.versao} onChange={set('versao')}
                    min="1" placeholder="1" style={{ maxWidth: 120 }}
                  />
                </Field>

                <Field label="Acesso restrito" hint="Somente administradores podem visualizar.">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingTop: 4 }}>
                    <div
                      onClick={() => setForm(p => ({ ...p, restrito: !p.restrito }))}
                      style={{
                        width: 36, height: 20, borderRadius: 10,
                        background: form.restrito ? COM_C.roxo : COM_C.borda,
                        position: 'relative', cursor: 'pointer', flexShrink: 0,
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 2, transition: 'left 0.2s',
                        left: form.restrito ? 18 : 2,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                    <span style={{ fontSize: 13, color: form.restrito ? COM_C.roxo : COM_C.txtSub, fontWeight: form.restrito ? 600 : 400 }}>
                      {form.restrito ? 'Restrito' : 'Público interno'}
                    </span>
                  </label>
                </Field>
              </div>
            </ContentCard>

            {erro && <AlertBanner tipo="erro">{erro}</AlertBanner>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 32 }}>
              <Btn variante="cinza" onClick={() => router.push('/documentos')}>Cancelar</Btn>
              <Btn type="submit" variante="roxo" icone="ti-check" disabled={salvando}>
                {salvando ? (progresso === 'uploading' ? 'Enviando arquivo…' : 'Salvando…') : 'Cadastrar documento'}
              </Btn>
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  )
}