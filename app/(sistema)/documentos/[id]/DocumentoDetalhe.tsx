'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Documento, CategoriaDocumento } from '@/types/database'
import { traduzirErro } from '@/lib/utils/erros'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, ContentCard, Badge, Field, Input, Select, Textarea,
  AlertBanner, InfoRow, Modal, MODULO_NEXCOOP, COM_C,
} from '@/components/nexcoop/ui'

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

interface Props { documento: Documento }

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

  async function handleExcluir() {
    setExcluindo(true)
    const supabase = createClient()
    await supabase.from('documentos').delete().eq('id', doc.id)
    router.push('/documentos')
  }

  const dias = doc.data_validade ? diasAteVencimento(doc.data_validade) : null

  const bannerTexto = sv === 'vencido'
    ? `Documento vencido há ${Math.abs(dias!)} dia${Math.abs(dias!) !== 1 ? 's' : ''}`
    : sv === 'alerta'
    ? dias === 0 ? 'Vence hoje!' : `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`
    : null

  return (
    <PageLayout
      titulo={doc.nome}
      subtitulo={cat.label}
      icone="ti-files"
      modulo={MODULO_NEXCOOP}
      breadcrumb={[
        { label: 'Documentos', href: '/documentos' },
        { label: cat.label },
      ]}
      fullHeight
      acoes={
        !editando ? (
          <>
            {doc.restrito && <Badge label="RESTRITO" bg={COM_C.vermelhoLt} cor={COM_C.vermelho} />}
            <Btn variante="cinza" icone="ti-pencil" onClick={() => { setEditando(true); setErro('') }}>
              Editar
            </Btn>
            <Btn variante="cinza" icone="ti-trash" onClick={() => setConfirmarExclusao(true)} style={{ color: COM_C.vermelho, borderColor: '#fca5a5' }}>
              Excluir
            </Btn>
          </>
        ) : undefined
      }
    >
      <div style={{ maxWidth: 780 }}>
        {bannerTexto && !editando && (
          <AlertBanner tipo={sv === 'vencido' ? 'erro' : 'info'}>{bannerTexto}</AlertBanner>
        )}

        {!editando && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ContentCard title="Arquivo" action={
              <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: COM_C.roxo, color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                Baixar / Visualizar
              </a>
            }>
              <div style={{ fontSize: 13, color: COM_C.txt, fontWeight: 500 }}>
                {doc.tipo_mime || 'Tipo desconhecido'}
                {formatBytes(doc.tamanho_bytes) && (
                  <span style={{ color: COM_C.txtSub, fontWeight: 400, marginLeft: 8 }}>{formatBytes(doc.tamanho_bytes)}</span>
                )}
              </div>
              {doc.versao > 1 && (
                <div style={{ fontSize: 11, color: COM_C.txtSub, marginTop: 4 }}>Versão {doc.versao}</div>
              )}
            </ContentCard>

            <ContentCard title="Identificação">
              <InfoRow label="Categoria"       valor={cat.label} />
              <InfoRow label="Número"          valor={doc.numero_documento} />
              <InfoRow label="Órgão emissor"   valor={doc.orgao_emissor} />
              {doc.descricao && (
                <div style={{ padding: '9px 0', borderBottom: `1px solid ${COM_C.borda}` }}>
                  <div style={{ fontSize: 12, color: COM_C.txtSub, fontWeight: 500, marginBottom: 4 }}>Descrição</div>
                  <div style={{ fontSize: 13, color: COM_C.txt, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{doc.descricao}</div>
                </div>
              )}
            </ContentCard>

            <ContentCard title="Datas e Validade">
              <InfoRow label="Data de emissão"  valor={formatarData(doc.data_emissao)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: `1px solid ${COM_C.borda}` }}>
                <span style={{ fontSize: 12, color: COM_C.txtSub, fontWeight: 500 }}>Data de validade</span>
                <div style={{ textAlign: 'right' }}>
                  {doc.data_validade ? (
                    <>
                      <span style={{
                        fontSize: 13,
                        color: sv === 'vencido' ? '#993C1D' : sv === 'alerta' ? '#854F0B' : COM_C.txt,
                        fontWeight: sv !== 'ok' && sv !== 'sem_validade' ? 700 : 400,
                      }}>
                        {formatarData(doc.data_validade)}
                      </span>
                      {dias !== null && (
                        <div style={{ fontSize: 11, color: sv === 'vencido' ? COM_C.vermelho : sv === 'alerta' ? '#854F0B' : COM_C.txtSub, marginTop: 1 }}>
                          {dias < 0 ? `${Math.abs(dias)}d vencido` : dias === 0 ? 'Vence hoje' : `em ${dias} dias`}
                        </div>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: 13, color: '#A8A29E' }}>—</span>
                  )}
                </div>
              </div>
              <InfoRow label="Alerta antecipado" valor={`${doc.alerta_dias} dias antes`} />
            </ContentCard>

            <ContentCard title="Informações do sistema">
              <InfoRow label="Versão"           valor={`v${doc.versao}`} />
              <InfoRow label="Acesso"           valor={doc.restrito ? 'Restrito' : 'Público interno'} />
              <InfoRow label="Cadastrado em"    valor={formatarDataHora(doc.criado_em)} />
              <InfoRow label="Atualizado em"    valor={formatarDataHora(doc.atualizado_em)} />
            </ContentCard>
          </div>
        )}

        {editando && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ContentCard title="Identificação">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Nome *">
                  <Input type="text" value={editForm.nome} onChange={setE('nome')} />
                </Field>

                <Field label="Categoria">
                  <Select value={editForm.categoria} onChange={setE('categoria')}>
                    {CATEGORIAS_LIST.map(([val, cfg]) => (
                      <option key={val} value={val}>{cfg.icone} {cfg.label}</option>
                    ))}
                  </Select>
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Número / Código">
                    <Input type="text" value={editForm.numero_documento} onChange={setE('numero_documento')} />
                  </Field>
                  <Field label="Órgão emissor">
                    <Input type="text" value={editForm.orgao_emissor} onChange={setE('orgao_emissor')} />
                  </Field>
                </div>

                <Field label="Descrição">
                  <Textarea value={editForm.descricao} onChange={setE('descricao')}
                    rows={3} style={{ minHeight: 68 }}
                  />
                </Field>
              </div>
            </ContentCard>

            <ContentCard title="Arquivo">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Substituir arquivo (opcional)">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Btn variante="cinza" icone="ti-folder" onClick={() => fileRef.current?.click()}>
                      {novoArquivo ? novoArquivo.name : 'Selecionar arquivo'}
                    </Btn>
                    {novoArquivo && (
                      <Btn variante="cinza" onClick={() => { setNovoArquivo(null); if (fileRef.current) fileRef.current.value = '' }}>
                        Remover
                      </Btn>
                    )}
                    <input ref={fileRef} type="file" style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                      onChange={e => setNovoArquivo(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  {uploadStatus === 'uploading' && (
                    <div style={{ fontSize: 12, color: '#854F0B', marginTop: 4 }}>⏳ Enviando arquivo…</div>
                  )}
                </Field>

                <Field label="URL do arquivo">
                  <Input type="url" value={editForm.arquivo_url} onChange={setE('arquivo_url')}
                    disabled={!!novoArquivo}
                    style={{ opacity: novoArquivo ? 0.5 : 1, cursor: novoArquivo ? 'not-allowed' : 'text' }}
                  />
                </Field>
              </div>
            </ContentCard>

            <ContentCard title="Datas e Validade">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Data de emissão">
                    <Input type="date" value={editForm.data_emissao} onChange={setE('data_emissao')} />
                  </Field>
                  <Field label="Data de validade">
                    <Input type="date" value={editForm.data_validade} onChange={setE('data_validade')} />
                  </Field>
                </div>
                <Field label="Alerta (dias antes do vencimento)">
                  <Input type="number" value={editForm.alerta_dias} onChange={setE('alerta_dias')}
                    min="1" max="365" style={{ maxWidth: 140 }}
                  />
                </Field>
              </div>
            </ContentCard>

            <ContentCard title="Configurações">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Versão">
                  <Input type="number" value={editForm.versao} onChange={setE('versao')}
                    min="1" style={{ maxWidth: 100 }}
                  />
                </Field>
                <Field label="Acesso">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingTop: 6 }}>
                    <div
                      onClick={() => setEditForm(p => ({ ...p, restrito: !p.restrito }))}
                      style={{
                        width: 36, height: 20, borderRadius: 10,
                        background: editForm.restrito ? COM_C.roxo : COM_C.borda,
                        position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 2, transition: 'left 0.2s',
                        left: editForm.restrito ? 18 : 2,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                    <span style={{ fontSize: 13, color: editForm.restrito ? COM_C.roxo : COM_C.txtSub, fontWeight: editForm.restrito ? 600 : 400 }}>
                      {editForm.restrito ? 'Restrito' : 'Público interno'}
                    </span>
                  </label>
                </Field>
              </div>
            </ContentCard>

            {erro && <AlertBanner tipo="erro">{erro}</AlertBanner>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 32 }}>
              <Btn variante="cinza" onClick={() => { setEditando(false); setErro(''); setNovoArquivo(null) }}>
                Cancelar
              </Btn>
              <Btn variante="roxo" icone="ti-check" onClick={handleSalvar} disabled={salvando}>
                {salvando ? (uploadStatus === 'uploading' ? 'Enviando arquivo…' : 'Salvando…') : 'Salvar alterações'}
              </Btn>
            </div>
          </div>
        )}

        {confirmarExclusao && (
          <Modal
            titulo="Excluir documento?"
            subtitulo={`O documento "${doc.nome}" será removido permanentemente do sistema. Esta ação não pode ser desfeita.`}
            onClose={() => setConfirmarExclusao(false)}
            footer={
              <>
                <Btn variante="cinza" onClick={() => setConfirmarExclusao(false)}>Cancelar</Btn>
                <Btn variante="azul" onClick={handleExcluir} disabled={excluindo} style={{ background: excluindo ? '#fca5a5' : COM_C.vermelho, borderColor: excluindo ? '#fca5a5' : COM_C.vermelho }}>
                  {excluindo ? 'Excluindo…' : 'Sim, excluir'}
                </Btn>
              </>
            }
          >{null}</Modal>
        )}
      </div>
    </PageLayout>
  )
}