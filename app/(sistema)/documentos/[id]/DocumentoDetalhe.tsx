'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Documento, CategoriaDocumento } from '@/types/database'
import { traduzirErro } from '@/lib/utils/erros'

// ─── Configurações ────────────────────────────────────────────────────────────

const CATEGORIA_CONFIG: Record<CategoriaDocumento, { label: string; cor: string; bg: string; icone: string }> = {
  estatuto:   { label: 'Estatuto',    cor: '#185FA5', bg: '#E6F1FB', icone: '📋' },
  ata:        { label: 'Ata',         cor: '#4840CC', bg: '#EEF0FF', icone: '📝' },
  contrato:   { label: 'Contrato',    cor: '#6366f1', bg: '#ede9fe', icone: '🤝' },
  convenio:   { label: 'Convênio',    cor: '#7c3aed', bg: '#f5f3ff', icone: '🔗' },
  edital:     { label: 'Edital',      cor: '#0e7490', bg: '#ecfeff', icone: '📢' },
  certidao:   { label: 'Certidão',    cor: '#854F0B', bg: '#FAEEDA', icone: '📜' },
  licenca:    { label: 'Licença',     cor: '#993C1D', bg: '#FAECE7', icone: '🔑' },
  relatorio:  { label: 'Relatório',   cor: '#374151', bg: '#f3f4f6', icone: '📊' },
  financeiro: { label: 'Financeiro',  cor: '#4840CC', bg: '#EEF0FF', icone: '💰' },
  projeto:    { label: 'Projeto',     cor: '#6366f1', bg: '#ede9fe', icone: '🎯' },
  aditivo:    { label: 'Aditivo',     cor: '#854F0B', bg: '#FAEEDA', icone: '📎' },
  outro:      { label: 'Outro',       cor: '#374151', bg: '#f3f4f6', icone: '📄' },
}

const CATEGORIAS_LIST = Object.entries(CATEGORIA_CONFIG) as [CategoriaDocumento, typeof CATEGORIA_CONFIG[CategoriaDocumento]][]

// ─── Helpers ─────────────────────────────────────────────────────────────────

type StatusValidade = 'vencido' | 'alerta' | 'ok' | 'sem_validade'

function calcStatus(doc: Documento): StatusValidade {
  if (!doc.data_validade) return 'sem_validade'
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const val  = new Date(doc.data_validade + 'T00:00:00')
  if (val < hoje) return 'vencido'
  const alerta = new Date(hoje); alerta.setDate(alerta.getDate() + doc.alerta_dias)
  if (val <= alerta) return 'alerta'
  return 'ok'
}

function diasAteVencimento(dataValidade: string): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const val  = new Date(dataValidade + 'T00:00:00')
  return Math.round((val.getTime() - hoje.getTime()) / 86_400_000)
}

function formatarData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function formatarDataHora(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatBytes(b: number | null) {
  if (!b) return null
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function InfoLinha({ label, valor }: { label: string; valor?: string | number | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f3ef' }}>
      <span style={{ fontSize: '12px', color: '#888', fontWeight: '500' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#1a1a1a', textAlign: 'right', maxWidth: '65%' }}>{valor ?? '—'}</span>
    </div>
  )
}

function Secao({ titulo, icone, children }: { titulo: string; icone: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{icone}</span> {titulo}
      </div>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d5d3cc',
  borderRadius: '8px', fontSize: '13px', background: '#fafaf8',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const fo = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
  (e.target.style.borderColor = '#635BFF')
const bl = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
  (e.target.style.borderColor = '#d5d3cc')

function CampoEdit({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props { documento: Documento }

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DocumentoDetalhe({ documento: initial }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [doc, setDoc]           = useState(initial)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [erro, setErro]         = useState('')
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done'>('idle')

  // Estado do formulário de edição
  const [editForm, setEditForm] = useState({
    nome:             doc.nome,
    categoria:        doc.categoria as CategoriaDocumento,
    numero_documento: doc.numero_documento ?? '',
    orgao_emissor:    doc.orgao_emissor    ?? '',
    descricao:        doc.descricao        ?? '',
    data_emissao:     doc.data_emissao     ?? '',
    data_validade:    doc.data_validade    ?? '',
    alerta_dias:      String(doc.alerta_dias),
    versao:           String(doc.versao),
    restrito:         doc.restrito,
    arquivo_url:      doc.arquivo_url,
  })

  const setE = (campo: keyof typeof editForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEditForm(p => ({ ...p, [campo]: e.target.value }))

  const sv   = calcStatus(doc)
  const cat  = CATEGORIA_CONFIG[doc.categoria]

  // ── Salvar edição ──────────────────────────────────────────────────────────
  async function handleSalvar() {
    if (!editForm.nome.trim()) { setErro('Nome é obrigatório.'); return }

    setSalvando(true)
    setErro('')

    const supabase = createClient()
    let arquivoUrl = editForm.arquivo_url

    if (novoArquivo) {
      setUploadStatus('uploading')
      const ext  = novoArquivo.name.split('.').pop() ?? 'bin'
      const path = `${doc.organizacao_id}/${editForm.categoria}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('documentos')
        .upload(path, novoArquivo, { contentType: novoArquivo.type, upsert: false })

      if (uploadErr) {
        setErro(`Erro no upload: ${uploadErr.message}`)
        setSalvando(false)
        setUploadStatus('idle')
        return
      }
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path)
      arquivoUrl = urlData.publicUrl
      setUploadStatus('done')
    }

    const payload = {
      nome:             editForm.nome.trim(),
      categoria:        editForm.categoria,
      numero_documento: editForm.numero_documento.trim() || null,
      orgao_emissor:    editForm.orgao_emissor.trim()    || null,
      descricao:        editForm.descricao.trim()        || null,
      data_emissao:     editForm.data_emissao            || null,
      data_validade:    editForm.data_validade           || null,
      alerta_dias:      parseInt(editForm.alerta_dias, 10) || 30,
      versao:           parseInt(editForm.versao, 10)    || 1,
      restrito:         editForm.restrito,
      arquivo_url:      arquivoUrl,
      tamanho_bytes:    novoArquivo ? novoArquivo.size : doc.tamanho_bytes,
      tipo_mime:        novoArquivo ? novoArquivo.type : doc.tipo_mime,
      atualizado_em:    new Date().toISOString(),
    }

    const { data, error: updateErr } = await supabase
      .from('documentos').update(payload).eq('id', doc.id).select().single()

    if (updateErr) {
      setErro(traduzirErro(updateErr.message))
      setSalvando(false)
      return
    }

    setDoc(data)
    setEditForm({
      nome:             data.nome,
      categoria:        data.categoria as CategoriaDocumento,
      numero_documento: data.numero_documento ?? '',
      orgao_emissor:    data.orgao_emissor    ?? '',
      descricao:        data.descricao        ?? '',
      data_emissao:     data.data_emissao     ?? '',
      data_validade:    data.data_validade    ?? '',
      alerta_dias:      String(data.alerta_dias),
      versao:           String(data.versao),
      restrito:         data.restrito,
      arquivo_url:      data.arquivo_url,
    })
    setNovoArquivo(null)
    setSalvando(false)
    setUploadStatus('idle')
    setEditando(false)
  }

  // ── Excluir ───────────────────────────────────────────────────────────────
  async function handleExcluir() {
    setExcluindo(true)
    const supabase = createClient()
    await supabase.from('documentos').delete().eq('id', doc.id)
    router.push('/documentos')
  }

  // ── Banner de status ───────────────────────────────────────────────────────
  const dias = doc.data_validade ? diasAteVencimento(doc.data_validade) : null

  const bannerConfig = sv === 'vencido'
    ? { bg: '#FAECE7', border: '#fca5a5', cor: '#993C1D', texto: `Documento vencido há ${Math.abs(dias!)} dia${Math.abs(dias!) !== 1 ? 's' : ''}`, icone: '⚠️' }
    : sv === 'alerta'
    ? { bg: '#FAEEDA', border: '#fcd34d', cor: '#854F0B', texto: dias === 0 ? 'Vence hoje!' : `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`, icone: '⏰' }
    : null

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '780px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
        <button onClick={() => router.push('/documentos')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', padding: '4px' }}>
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '20px' }}>{cat.icone}</span>
            <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.nome}
            </h1>
            <span style={{ fontSize: '11px', fontWeight: '600', color: cat.cor, background: cat.bg, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
              {cat.label}
            </span>
            {doc.restrito && (
              <span style={{ fontSize: '10px', fontWeight: '600', color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', padding: '2px 6px', borderRadius: '4px' }}>
                RESTRITO
              </span>
            )}
          </div>
          {doc.numero_documento && (
            <p style={{ fontSize: '13px', color: '#888', margin: '3px 0 0 28px' }}>nº {doc.numero_documento}</p>
          )}
        </div>

        {!editando && (
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => { setEditando(true); setErro('') }}
              style={{ padding: '8px 16px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#444', cursor: 'pointer', fontWeight: '500' }}>
              ✏️ Editar
            </button>
            <button onClick={() => setConfirmarExclusao(true)}
              style={{ padding: '8px 16px', border: '1px solid #fca5a5', borderRadius: '8px', background: '#fef2f2', fontSize: '13px', color: '#dc2626', cursor: 'pointer', fontWeight: '500' }}>
              🗑️ Excluir
            </button>
          </div>
        )}
      </div>

      {/* Banner de alerta de validade */}
      {bannerConfig && !editando && (
        <div style={{ background: bannerConfig.bg, border: `1px solid ${bannerConfig.border}`, borderRadius: '10px', padding: '10px 14px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{bannerConfig.icone}</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: bannerConfig.cor }}>{bannerConfig.texto}</span>
        </div>
      )}

      {/* ── MODO VISUALIZAÇÃO ─────────────────────────────────────────────────── */}
      {!editando && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Arquivo */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  📎 Arquivo
                </div>
                <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500' }}>
                  {doc.tipo_mime || 'Tipo desconhecido'}
                  {formatBytes(doc.tamanho_bytes) && (
                    <span style={{ color: '#888', fontWeight: '400', marginLeft: '8px' }}>{formatBytes(doc.tamanho_bytes)}</span>
                  )}
                </div>
                {doc.versao > 1 && (
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Versão {doc.versao}</div>
                )}
              </div>
              <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#635BFF', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                ↓ Baixar / Visualizar
              </a>
            </div>
          </div>

          {/* Identificação */}
          <Secao titulo="Identificação" icone="📋">
            <InfoLinha label="Categoria"       valor={cat.label} />
            <InfoLinha label="Número"          valor={doc.numero_documento} />
            <InfoLinha label="Órgão emissor"   valor={doc.orgao_emissor} />
            {doc.descricao && (
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f5f3ef' }}>
                <div style={{ fontSize: '12px', color: '#888', fontWeight: '500', marginBottom: '4px' }}>Descrição</div>
                <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{doc.descricao}</div>
              </div>
            )}
          </Secao>

          {/* Datas e Validade */}
          <Secao titulo="Datas e Validade" icone="📅">
            <InfoLinha label="Data de emissão"  valor={formatarData(doc.data_emissao)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f3ef' }}>
              <span style={{ fontSize: '12px', color: '#888', fontWeight: '500' }}>Data de validade</span>
              <div style={{ textAlign: 'right' }}>
                {doc.data_validade ? (
                  <>
                    <span style={{ fontSize: '13px', color: sv === 'vencido' ? '#993C1D' : sv === 'alerta' ? '#854F0B' : '#1a1a1a', fontWeight: sv !== 'ok' && sv !== 'sem_validade' ? '600' : '400' }}>
                      {formatarData(doc.data_validade)}
                    </span>
                    {dias !== null && (
                      <div style={{ fontSize: '11px', color: sv === 'vencido' ? '#dc2626' : sv === 'alerta' ? '#854F0B' : '#888', marginTop: '1px' }}>
                        {dias < 0 ? `${Math.abs(dias)}d vencido` : dias === 0 ? 'Vence hoje' : `em ${dias} dias`}
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: '13px', color: '#aaa' }}>—</span>
                )}
              </div>
            </div>
            <InfoLinha label="Alerta antecipado" valor={`${doc.alerta_dias} dias antes`} />
          </Secao>

          {/* Metadados */}
          <Secao titulo="Informações do sistema" icone="ℹ️">
            <InfoLinha label="Versão"           valor={`v${doc.versao}`} />
            <InfoLinha label="Acesso"           valor={doc.restrito ? '🔒 Restrito' : '🔓 Público interno'} />
            <InfoLinha label="Cadastrado em"    valor={formatarDataHora(doc.criado_em)} />
            <InfoLinha label="Atualizado em"    valor={formatarDataHora(doc.atualizado_em)} />
          </Secao>
        </div>
      )}

      {/* ── MODO EDIÇÃO ───────────────────────────────────────────────────────── */}
      {editando && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Identificação */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Identificação</p>

            <CampoEdit label="Nome *">
              <input type="text" value={editForm.nome} onChange={setE('nome')}
                style={inp} onFocus={fo} onBlur={bl}
              />
            </CampoEdit>

            <CampoEdit label="Categoria">
              <select value={editForm.categoria} onChange={setE('categoria')} style={inp} onFocus={fo} onBlur={bl}>
                {CATEGORIAS_LIST.map(([val, cfg]) => (
                  <option key={val} value={val}>{cfg.icone} {cfg.label}</option>
                ))}
              </select>
            </CampoEdit>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <CampoEdit label="Número / Código">
                <input type="text" value={editForm.numero_documento} onChange={setE('numero_documento')}
                  style={inp} onFocus={fo} onBlur={bl}
                />
              </CampoEdit>
              <CampoEdit label="Órgão emissor">
                <input type="text" value={editForm.orgao_emissor} onChange={setE('orgao_emissor')}
                  style={inp} onFocus={fo} onBlur={bl}
                />
              </CampoEdit>
            </div>

            <CampoEdit label="Descrição">
              <textarea value={editForm.descricao} onChange={setE('descricao')}
                rows={3} style={{ ...inp, resize: 'vertical', minHeight: '68px' }}
                onFocus={fo} onBlur={bl}
              />
            </CampoEdit>
          </div>

          {/* Arquivo */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Arquivo</p>

            <CampoEdit label="Substituir arquivo (opcional)">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ padding: '8px 14px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fafaf8', fontSize: '13px', color: '#555', cursor: 'pointer' }}>
                  📁 {novoArquivo ? novoArquivo.name : 'Selecionar arquivo'}
                </button>
                {novoArquivo && (
                  <button type="button" onClick={() => { setNovoArquivo(null); if (fileRef.current) fileRef.current.value = '' }}
                    style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                    ✕ Remover
                  </button>
                )}
                <input ref={fileRef} type="file" style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                  onChange={e => setNovoArquivo(e.target.files?.[0] ?? null)}
                />
              </div>
              {uploadStatus === 'uploading' && (
                <div style={{ fontSize: '12px', color: '#854F0B', marginTop: '4px' }}>⏳ Enviando arquivo…</div>
              )}
            </CampoEdit>

            <CampoEdit label="URL do arquivo">
              <input type="url" value={editForm.arquivo_url} onChange={setE('arquivo_url')}
                disabled={!!novoArquivo}
                style={{ ...inp, opacity: novoArquivo ? 0.5 : 1, cursor: novoArquivo ? 'not-allowed' : 'text' }}
                onFocus={fo} onBlur={bl}
              />
            </CampoEdit>
          </div>

          {/* Datas */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Datas e Validade</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <CampoEdit label="Data de emissão">
                <input type="date" value={editForm.data_emissao} onChange={setE('data_emissao')}
                  style={inp} onFocus={fo} onBlur={bl}
                />
              </CampoEdit>
              <CampoEdit label="Data de validade">
                <input type="date" value={editForm.data_validade} onChange={setE('data_validade')}
                  style={inp} onFocus={fo} onBlur={bl}
                />
              </CampoEdit>
            </div>
            <CampoEdit label="Alerta (dias antes do vencimento)">
              <input type="number" value={editForm.alerta_dias} onChange={setE('alerta_dias')}
                min="1" max="365"
                style={{ ...inp, maxWidth: '140px' }} onFocus={fo} onBlur={bl}
              />
            </CampoEdit>
          </div>

          {/* Configurações */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Configurações</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <CampoEdit label="Versão">
                <input type="number" value={editForm.versao} onChange={setE('versao')}
                  min="1" style={{ ...inp, maxWidth: '100px' }} onFocus={fo} onBlur={bl}
                />
              </CampoEdit>
              <CampoEdit label="Acesso">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingTop: '6px' }}>
                  <div
                    onClick={() => setEditForm(p => ({ ...p, restrito: !p.restrito }))}
                    style={{ width: '36px', height: '20px', borderRadius: '10px', background: editForm.restrito ? '#635BFF' : '#d5d3cc', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
                  >
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: editForm.restrito ? '18px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                  <span style={{ fontSize: '13px', color: editForm.restrito ? '#4840CC' : '#555', fontWeight: editForm.restrito ? '600' : '400' }}>
                    {editForm.restrito ? 'Restrito' : 'Público interno'}
                  </span>
                </label>
              </CampoEdit>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>
              ⚠ {erro}
            </div>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
            <button type="button" onClick={() => { setEditando(false); setErro(''); setNovoArquivo(null) }}
              style={{ padding: '9px 20px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#555', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="button" onClick={handleSalvar} disabled={salvando}
              style={{ padding: '9px 24px', border: 'none', borderRadius: '8px', background: salvando ? '#9F9BFF' : '#635BFF', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: salvando ? 'not-allowed' : 'pointer' }}>
              {salvando ? (uploadStatus === 'uploading' ? 'Enviando arquivo…' : 'Salvando…') : '✓ Salvar alterações'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de confirmação de exclusão ──────────────────────────────────── */}
      {confirmarExclusao && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.75rem', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '600', margin: '0 0 8px', color: '#1a1a1a' }}>Excluir documento?</h3>
            <p style={{ fontSize: '13px', color: '#555', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              O documento <strong>{doc.nome}</strong> será removido permanentemente do sistema. Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmarExclusao(false)}
                style={{ padding: '9px 18px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleExcluir} disabled={excluindo}
                style={{ padding: '9px 18px', border: 'none', borderRadius: '8px', background: excluindo ? '#fca5a5' : '#dc2626', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: excluindo ? 'not-allowed' : 'pointer' }}>
                {excluindo ? 'Excluindo…' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
