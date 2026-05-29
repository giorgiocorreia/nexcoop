'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CategoriaDocumento } from '@/types/database'

// ─── Configurações ────────────────────────────────────────────────────────────

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

// ─── Helpers visuais ──────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #d5d3cc',
  borderRadius: '8px', fontSize: '13px', background: '#fafaf8',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const fo = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
  (e.target.style.borderColor = '#635BFF')
const bl = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
  (e.target.style.borderColor = '#d5d3cc')

function InputGroup({ label, children, required, dica }: {
  label: string; children: React.ReactNode; required?: boolean; dica?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
      {dica && <p style={{ fontSize: '11px', color: '#aaa', marginTop: '4px', margin: 0 }}>{dica}</p>}
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
        {titulo}
      </p>
      {children}
    </div>
  )
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

// ─── Form ─────────────────────────────────────────────────────────────────────

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
  arquivo_url: string  // preenchido manualmente ou via upload
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
    if (f) setForm(p => ({ ...p, arquivo_url: '' })) // limpa URL manual se houver arquivo
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

    // Upload para Supabase Storage se houver arquivo selecionado
    if (arquivo) {
      setProgresso('uploading')
      const ext  = arquivo.name.split('.').pop() ?? 'bin'
      const path = `${usuario.organizacao_id}/${form.categoria}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('documentos')
        .upload(path, arquivo, { contentType: arquivo.type, upsert: false })

      if (uploadErr) {
        // Se o bucket não existir, mostra mensagem clara
        const msg = uploadErr.message.includes('Bucket not found')
          ? 'Bucket "documentos" não existe no Supabase Storage. Crie-o primeiro ou informe a URL manualmente.'
          : `Erro no upload: ${uploadErr.message}`
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
      setErro(`Erro ao salvar: ${insertErr.message}`)
      setSalvando(false)
      return
    }

    router.push(`/documentos/${data.id}`)
  }

  const catAtual = CATEGORIAS.find(c => c.valor === form.categoria)!

  return (
    <div style={{ maxWidth: '720px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/documentos')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', padding: '4px' }}>
          ←
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Novo documento</h1>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>Cadastre um documento institucional</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ── Seção 1: Identificação ───────────────────────────────────────── */}
          <Secao titulo="Identificação">
            <InputGroup label="Nome do documento" required>
              <input type="text" value={form.nome} onChange={set('nome')}
                placeholder="Ex.: Estatuto Social 2024" required style={inp} onFocus={fo} onBlur={bl}
              />
            </InputGroup>

            <InputGroup label="Categoria" required>
              <select value={form.categoria} onChange={set('categoria')} style={inp} onFocus={fo} onBlur={bl}>
                {CATEGORIAS.map(c => (
                  <option key={c.valor} value={c.valor}>{c.icone} {c.label}</option>
                ))}
              </select>
            </InputGroup>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <InputGroup label="Número / Código">
                <input type="text" value={form.numero_documento} onChange={set('numero_documento')}
                  placeholder="Ex.: 001/2024" style={inp} onFocus={fo} onBlur={bl}
                />
              </InputGroup>
              <InputGroup label="Órgão emissor">
                <input type="text" value={form.orgao_emissor} onChange={set('orgao_emissor')}
                  placeholder="Ex.: JUCEB, Receita Federal" style={inp} onFocus={fo} onBlur={bl}
                />
              </InputGroup>
            </div>

            <InputGroup label="Descrição">
              <textarea value={form.descricao} onChange={set('descricao')}
                placeholder="Resumo ou observações sobre o documento…"
                rows={3} style={{ ...inp, resize: 'vertical', minHeight: '72px' }}
                onFocus={fo} onBlur={bl}
              />
            </InputGroup>
          </Secao>

          {/* ── Seção 2: Arquivo ─────────────────────────────────────────────── */}
          <Secao titulo="Arquivo">
            <InputGroup label="Enviar arquivo" dica="PDF, DOCX, XLSX, imagem — máx. 20 MB. Requer bucket 'documentos' no Supabase Storage.">
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${arquivo ? '#635BFF' : '#d5d3cc'}`,
                  borderRadius: '10px', padding: '1.25rem', textAlign: 'center',
                  cursor: 'pointer', background: arquivo ? '#f0fbf7' : '#fafaf8',
                  transition: 'all 0.15s',
                }}
              >
                {arquivo ? (
                  <div>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{catAtual.icone}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#4840CC' }}>{arquivo.name}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                      {arquivo.type} · {formatBytes(arquivo.size)}
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); setArquivo(null); if (fileRef.current) fileRef.current.value = '' }}
                      style={{ marginTop: '8px', fontSize: '11px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      Remover
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '28px', marginBottom: '4px' }}>📁</div>
                    <div style={{ fontSize: '13px', color: '#555' }}>Clique para selecionar um arquivo</div>
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>ou arraste e solte aqui</div>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" onChange={handleArquivo} style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
              />
              {progresso === 'uploading' && (
                <div style={{ fontSize: '12px', color: '#854F0B', marginTop: '6px' }}>⏳ Enviando arquivo…</div>
              )}
            </InputGroup>

            <InputGroup label="Ou informe a URL do arquivo" dica="Use se o arquivo já estiver hospedado em outro lugar.">
              <input type="url" value={form.arquivo_url} onChange={set('arquivo_url')}
                placeholder="https://…" disabled={!!arquivo}
                style={{ ...inp, opacity: arquivo ? 0.5 : 1, cursor: arquivo ? 'not-allowed' : 'text' }}
                onFocus={fo} onBlur={bl}
              />
            </InputGroup>
          </Secao>

          {/* ── Seção 3: Datas ───────────────────────────────────────────────── */}
          <Secao titulo="Datas e Validade">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <InputGroup label="Data de emissão">
                <input type="date" value={form.data_emissao} onChange={set('data_emissao')}
                  style={inp} onFocus={fo} onBlur={bl}
                />
              </InputGroup>
              <InputGroup label="Data de validade">
                <input type="date" value={form.data_validade} onChange={set('data_validade')}
                  style={inp} onFocus={fo} onBlur={bl}
                />
              </InputGroup>
            </div>

            <InputGroup label="Alerta de vencimento (dias)"
              dica="Quantos dias antes do vencimento o sistema deve alertar.">
              <input type="number" value={form.alerta_dias} onChange={set('alerta_dias')}
                min="1" max="365" placeholder="30"
                style={{ ...inp, maxWidth: '160px' }} onFocus={fo} onBlur={bl}
              />
            </InputGroup>
          </Secao>

          {/* ── Seção 4: Configurações ───────────────────────────────────────── */}
          <Secao titulo="Configurações">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <InputGroup label="Versão" dica="Número de versão do documento.">
                <input type="number" value={form.versao} onChange={set('versao')}
                  min="1" placeholder="1"
                  style={{ ...inp, maxWidth: '120px' }} onFocus={fo} onBlur={bl}
                />
              </InputGroup>

              <InputGroup label="Acesso restrito" dica="Somente administradores podem visualizar.">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingTop: '4px' }}>
                  <div
                    onClick={() => setForm(p => ({ ...p, restrito: !p.restrito }))}
                    style={{
                      width: '36px', height: '20px', borderRadius: '10px',
                      background: form.restrito ? '#635BFF' : '#d5d3cc',
                      position: 'relative', cursor: 'pointer', flexShrink: 0,
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: '2px', transition: 'left 0.2s',
                      left: form.restrito ? '18px' : '2px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                  <span style={{ fontSize: '13px', color: form.restrito ? '#4840CC' : '#555', fontWeight: form.restrito ? '600' : '400' }}>
                    {form.restrito ? 'Restrito' : 'Público interno'}
                  </span>
                </label>
              </InputGroup>
            </div>
          </Secao>

          {/* Erro */}
          {erro && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>
              ⚠ {erro}
            </div>
          )}

          {/* Ações */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
            <button type="button" onClick={() => router.push('/documentos')}
              style={{ padding: '9px 20px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#555', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              style={{ padding: '9px 24px', border: 'none', borderRadius: '8px', background: salvando ? '#9F9BFF' : '#635BFF', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: salvando ? 'not-allowed' : 'pointer' }}>
              {salvando ? (progresso === 'uploading' ? 'Enviando arquivo…' : 'Salvando…') : '✓ Cadastrar documento'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
