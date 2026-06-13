'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { Organizacao, PerfilCaptacao, TipoOrganizacao, Usuario, FuncaoDisponivel } from '@/types/database'
import type { UsuarioPendente } from './usuarios/page'
import { salvarOrganizacao, atualizarLogoOrg, atualizarPerfilOrg } from './actions'
import { createClient as createClientBrowser } from '@/lib/supabase/client'
import { salvarPerfilCaptacao } from '@/lib/captacao/actions'
import UsuariosGestao from './usuarios/UsuariosGestao'
import ParceirosClient from './parceiros/ParceirosClient'

// ── Cores ─────────────────────────────────────────────────────────────────────
const TEAL        = '#1D9E75'
const TEAL_DARK   = '#178a64'
const TEAL_SUC    = '#166534'
const PURPLE      = '#635BFF'
const PURPLE_DARK = '#4840CC'

// ── Listas ────────────────────────────────────────────────────────────────────
const AREAS_CAPTACAO = [
  'Agrofloresta', 'Cacau', 'Café', 'Pecuária', 'Pesca', 'Mel',
  'Plantas Medicinais', 'Clima & Meio Ambiente', 'Cooperativismo',
  'Agricultura Familiar', 'Biodiversidade', 'Turismo Rural',
  'Artesanato', 'Aquicultura', 'Apicultura', 'Segurança Alimentar',
  'Agroindústria', 'Silvicultura', 'Fruticultura', 'Horticultura',
  'Reforma Agrária', 'Desenvolvimento Rural', 'Geração de Renda',
  'Mulheres Rurais', 'Juventude Rural', 'Povos Tradicionais',
]

const PUBLICOS_ALVO = [
  'Agricultores Familiares', 'Mulheres Rurais', 'Jovens Rurais',
  'Quilombolas', 'Indígenas', 'Assentados da Reforma Agrária',
  'Pescadores Artesanais', 'Extrativistas', 'Ribeirinhos',
  'Comunidades Tradicionais', 'Pequenos Produtores',
  'Cooperados', 'Associados', 'Empreendedores Rurais',
  'Pessoas com Deficiência', 'Idosos Rurais',
]

const MUNICIPIOS_BA = [
  'Aiquara', 'Apuarema', 'Aurelino Leal', 'Barra do Rocha', 'Boa Nova',
  'Camamu', 'Dário Meira', 'Gongogi', 'Ibirapitanga', 'Ibirataia',
  'Iguaí', 'Ilhéus', 'Ipiaú', 'Itabuna', 'Itagi', 'Itagibá', 'Itamari',
  'Itapetinga', 'Ituberá', 'Jequié', 'Jitaúna', 'Manoel Vitorino',
  'Maraú', 'Nilo Peçanha', 'Nova Ibiá', 'Piraí do Norte', 'Taperoá',
  'Ubatã', 'Valença', 'Vitória da Conquista', 'Wenceslau Guimarães',
]

const ABRANGENCIAS = ['municipal', 'microrregional', 'estadual', 'nacional', 'internacional']

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Aba = 'perfil' | 'captacao' | 'usuarios' | 'parceiros' | 'seguranca'

interface Props {
  org: Organizacao | null
  isSuperAdmin: boolean
  perfilCaptacao: PerfilCaptacao | null
  usuario: Usuario
  usuarios: Usuario[]
  pendentes: UsuarioPendente[]
  funcoes: FuncaoDisponivel[]
}

// ── Export principal ──────────────────────────────────────────────────────────
export default function ConfiguracoesForm(props: Props) {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const pathname      = usePathname()

  const isOrgAdmin    = props.isSuperAdmin || (props.usuario.funcoes ?? []).includes('admin')
  const showAdminTabs = isOrgAdmin && props.org !== null

  const abaAtual = (searchParams.get('aba') ?? 'perfil') as Aba

  function setAba(aba: Aba) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('aba', aba)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const tabs: { id: Aba; label: string; adminOnly?: boolean; disabled?: boolean }[] = [
    { id: 'perfil',      label: '🏢 Perfil',             adminOnly: true },
    { id: 'captacao',    label: '🎯 Captação',           adminOnly: true },
    { id: 'usuarios',    label: '👥 Usuários',           adminOnly: true },
    { id: 'parceiros',   label: '🤝 Empresas Vinculadas', adminOnly: true },
    { id: 'seguranca',   label: '🔒 Segurança',          disabled: true },
  ]

  const visiveis = tabs.filter(t => !t.adminOnly || showAdminTabs)

  const abaValida = visiveis.find(t => t.id === abaAtual && !t.disabled)
  const abaDefault = (visiveis.find(t => !t.disabled)?.id ?? 'perfil') as Aba
  const abaEfetiva: Aba = abaValida ? abaAtual : abaDefault

  return (
    <div style={{ maxWidth: '820px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Configurações</h1>
      </div>

      {/* Barra de abas */}
      <div style={{ borderBottom: '1px solid #e5e3dc', marginBottom: '1.5rem', display: 'flex' }}>
        {visiveis.map(tab => {
          const ativo    = abaEfetiva === tab.id
          const disabled = tab.disabled ?? false
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => { if (!disabled) setAba(tab.id) }}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderBottom: ativo ? `2px solid ${TEAL}` : '2px solid transparent',
                background: 'transparent',
                color: ativo ? TEAL : disabled ? '#ccc' : '#666',
                fontSize: '13px',
                fontWeight: ativo ? '600' : '400',
                cursor: disabled ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
                marginBottom: '-1px',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
              {disabled && (
                <span style={{
                  fontSize: '9px', background: '#f0eeea', color: '#999',
                  padding: '1px 5px', borderRadius: '6px', fontWeight: '500',
                }}>em breve</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Conteúdo da aba */}
      {abaEfetiva === 'perfil' && showAdminTabs && props.org && (
        <AbaPerfil org={props.org} />
      )}
      {abaEfetiva === 'captacao' && showAdminTabs && (
        <AbaCaptacao perfilCaptacao={props.perfilCaptacao} />
      )}
      {abaEfetiva === 'usuarios' && showAdminTabs && (
        <UsuariosGestao
          usuarios={props.usuarios}
          pendentes={props.pendentes}
          funcoes={props.funcoes}
          usuarioAtualId={props.usuario.id}
          isSuperAdmin={props.isSuperAdmin}
          organizacaoId={props.org?.id ?? null}
          embeddedMode
        />
      )}
      {abaEfetiva === 'parceiros' && showAdminTabs && props.org && (
        <ParceirosClient orgId={props.org.id} />
      )}
      {abaEfetiva === 'seguranca' && (
        <div style={{
          background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px',
          padding: '3rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px' }}>Segurança</div>
          <div style={{ fontSize: '13px', color: '#888' }}>Em desenvolvimento — disponível em breve.</div>
        </div>
      )}
    </div>
  )
}

// ── Aba Perfil ────────────────────────────────────────────────────────────────

function AbaPerfil({ org }: { org: Organizacao }) {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview,      setPreview]      = useState<string | null>(org.logo_url ?? null)
  const [arquivo,      setArquivo]      = useState<File | null>(null)
  const [erroLogo,     setErroLogo]     = useState('')
  const [salvandoLogo, setSalvandoLogo] = useState(false)
  const [sucessoLogo,  setSucessoLogo]  = useState(false)

  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sucesso,  setSucesso]  = useState(false)
  const [erro,     setErro]     = useState('')
  const [form, setForm] = useState({
    nome:       org.nome       ?? '',
    nome_curto: org.nome_curto ?? '',
    email:      org.email      ?? '',
    telefone:   org.telefone   ?? '',
    cidade:     org.cidade     ?? '',
    estado:     org.estado     ?? '',
    logradouro: org.logradouro ?? '',
    cep:        org.cep        ?? '',
  })

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    setErroLogo(''); setSucessoLogo(false)
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) { setErroLogo('Formato inválido. Use PNG ou JPG.'); return }
    if (file.size > 2 * 1024 * 1024) { setErroLogo('Arquivo muito grande. Máximo 2MB.'); return }
    setArquivo(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSalvarLogo() {
    if (!arquivo) return
    setSalvandoLogo(true); setErroLogo('')
    const supabase = createClientBrowser()
    const ext  = arquivo.type === 'image/png' ? 'png' : 'jpg'
    const path = `${org.id}/logo.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('logos-orgs')
      .upload(path, arquivo, { upsert: true, contentType: arquivo.type })
    if (uploadError) { setSalvandoLogo(false); setErroLogo('Erro ao enviar arquivo: ' + uploadError.message); return }
    const { data: { publicUrl } } = supabase.storage.from('logos-orgs').getPublicUrl(path)
    const res = await atualizarLogoOrg(org.id, publicUrl)
    setSalvandoLogo(false)
    if (res.error) { setErroLogo(res.error) } else { setSucessoLogo(true); setArquivo(null); router.refresh(); setTimeout(() => setSucessoLogo(false), 3000) }
  }

  async function handleSalvar() {
    setSalvando(true)
    setErro('')
    try {
      const result = await atualizarPerfilOrg(org.id, form)
      if (result?.error) {
        setErro('Erro ao salvar. Tente novamente.')
      } else {
        setSucesso(true)
        setEditando(false)
        setTimeout(() => setSucesso(false), 3000)
        router.refresh()
      }
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const inicial = (org.nome_curto || org.nome).charAt(0).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Dados da organização */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0D2B5E', margin: 0 }}>Dados da organização</h3>
          {!editando && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #e5e3dc', background: 'none', fontSize: 13, fontWeight: 600, color: '#0D2B5E', cursor: 'pointer' }}
            >
              ✏️ Editar
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>Nome completo</label>
            {editando ? (
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e3dc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            ) : (
              <div style={{ fontSize: 14, color: '#0D2B5E', padding: '8px 12px', background: '#f8f7f4', borderRadius: 8 }}>{form.nome || '—'}</div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>Nome curto</label>
            {editando ? (
              <input value={form.nome_curto} onChange={e => setForm(f => ({ ...f, nome_curto: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e3dc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            ) : (
              <div style={{ fontSize: 14, color: '#0D2B5E', padding: '8px 12px', background: '#f8f7f4', borderRadius: 8 }}>{form.nome_curto || '—'}</div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>CNPJ</label>
            <div style={{ fontSize: 14, color: '#0D2B5E', padding: '8px 12px', background: '#f8f7f4', borderRadius: 8 }}>{formatarCNPJ(org.cnpj || '')}</div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>Tipo</label>
            <div style={{ fontSize: 14, color: '#0D2B5E', padding: '8px 12px', background: '#f8f7f4', borderRadius: 8, textTransform: 'capitalize' }}>{org.tipo || '—'}</div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>E-mail</label>
            {editando ? (
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e3dc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            ) : (
              <div style={{ fontSize: 14, color: '#0D2B5E', padding: '8px 12px', background: '#f8f7f4', borderRadius: 8 }}>{form.email || '—'}</div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>Telefone</label>
            {editando ? (
              <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e3dc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            ) : (
              <div style={{ fontSize: 14, color: '#0D2B5E', padding: '8px 12px', background: '#f8f7f4', borderRadius: 8 }}>{form.telefone || '—'}</div>
            )}
          </div>
          {editando ? (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>Cidade</label>
              <input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e3dc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>Cidade / UF</label>
              <div style={{ fontSize: 14, color: '#0D2B5E', padding: '8px 12px', background: '#f8f7f4', borderRadius: 8 }}>{`${form.cidade} / ${form.estado}`}</div>
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>Plano atual</label>
            <div style={{ fontSize: 14, color: '#0D2B5E', padding: '8px 12px', background: '#f8f7f4', borderRadius: 8, textTransform: 'capitalize' }}>{org.plano || '—'}</div>
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1.5rem' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0D2B5E', marginBottom: '0.5rem' }}>Endereço</h3>
        {!editando && <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: '1rem' }}>Para alterações nos dados cadastrais, entre em contato com o suporte.</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>Endereço</label>
            {editando ? (
              <input value={form.logradouro} onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e3dc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            ) : (
              <div style={{ fontSize: 14, color: '#0D2B5E', padding: '8px 12px', background: '#f8f7f4', borderRadius: 8 }}>{form.logradouro || '—'}</div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>CEP</label>
            {editando ? (
              <input value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e3dc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            ) : (
              <div style={{ fontSize: 14, color: '#0D2B5E', padding: '8px 12px', background: '#f8f7f4', borderRadius: 8 }}>{formatarCEP(form.cep || '')}</div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', display: 'block', marginBottom: 4 }}>Estado</label>
            {editando ? (
              <input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e3dc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            ) : (
              <div style={{ fontSize: 14, color: '#0D2B5E', padding: '8px 12px', background: '#f8f7f4', borderRadius: 8 }}>{form.estado || '—'}</div>
            )}
          </div>
        </div>

        {editando && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setEditando(false)
                  setErro('')
                  setForm({
                    nome:       org.nome       ?? '',
                    nome_curto: org.nome_curto ?? '',
                    email:      org.email      ?? '',
                    telefone:   org.telefone   ?? '',
                    cidade:     org.cidade     ?? '',
                    estado:     org.estado     ?? '',
                    logradouro: org.logradouro ?? '',
                    cep:        org.cep        ?? '',
                  })
                }}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid #e5e3dc', background: 'none', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvar}
                disabled={salvando}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#0D2B5E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}
              >
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
            {erro   && <div style={{ color: '#DC2626', fontSize: 13, marginTop: '0.5rem', textAlign: 'right' }}>{erro}</div>}
            {sucesso && <div style={{ color: '#085041', fontSize: 13, marginTop: '0.5rem', textAlign: 'right' }}>✓ Dados salvos com sucesso</div>}
          </div>
        )}
      </div>

      {/* Logo */}
      <SectionCard titulo="Logo da organização">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#f1f0eb', border: '1px solid #e5e3dc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {preview ? (
              <img src={preview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 24, fontWeight: 700, color: PURPLE }}>{inicial}</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={handleArquivo} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{ padding: '8px 18px', border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '13px', fontWeight: '500', background: '#fafaf8', cursor: 'pointer', marginBottom: '0.75rem' }}
            >
              Alterar logo
            </button>
            <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.7 }}>
              <div>• Formatos aceitos: PNG ou JPG</div>
              <div>• Tamanho máximo: 2MB</div>
              <div>• Dimensões recomendadas: mínimo 200×200px, proporção 1:1</div>
              <div>• PNG com fundo transparente recomendado</div>
            </div>
          </div>
        </div>
        {erroLogo    && <Alerta tipo="erro">{erroLogo}</Alerta>}
        {sucessoLogo && <Alerta tipo="ok">Logo atualizada com sucesso!</Alerta>}
        {arquivo && !erroLogo && (
          <div style={{ marginTop: '0.5rem' }}>
            <BtnPrimary type="button" onClick={handleSalvarLogo} loading={salvandoLogo} success={sucessoLogo}>
              {salvandoLogo ? 'Enviando...' : sucessoLogo ? '✓ Salvo' : 'Salvar logo'}
            </BtnPrimary>
          </div>
        )}
      </SectionCard>

    </div>
  )
}

// ── Aba Organização ───────────────────────────────────────────────────────────

function AbaOrganizacao({ org, isSuperAdmin }: { org: Organizacao; isSuperAdmin: boolean }) {
  const router = useRouter()
  const [form, setForm] = useState({
    nome:           org.nome          ?? '',
    nome_curto:     org.nome_curto    ?? '',
    tipo:           org.tipo          ?? 'cooperativa',
    cnpj:           org.cnpj          ?? '',
    email:          org.email         ?? '',
    telefone:       org.telefone      ?? '',
    site:           org.site          ?? '',
    cep:            org.cep           ?? '',
    logradouro:     org.logradouro    ?? '',
    numero:         org.numero        ?? '',
    complemento:    org.complemento   ?? '',
    bairro:         org.bairro        ?? '',
    cidade:         org.cidade        ?? '',
    estado:         org.estado        ?? '',
    data_fundacao:  org.data_fundacao ?? '',
    registro_juceb: org.registro_juceb ?? '',
  })
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso]   = useState(false)
  const [erro, setErro]         = useState('')

  const set = (campo: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [campo]: e.target.value }))

  async function buscarCEP(cep: string) {
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length !== 8) return
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro:     data.bairro     || prev.bairro,
          cidade:     data.localidade || prev.cidade,
          estado:     data.uf         || prev.estado,
        }))
      }
    } catch { /* silencia */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true); setErro(''); setSucesso(false)
    const res = await salvarOrganizacao({ ...form, tipo: form.tipo as TipoOrganizacao })
    setSalvando(false)
    if (res.error) {
      setErro(res.error)
    } else {
      setSucesso(true)
      router.refresh()
      setTimeout(() => setSucesso(false), 2000)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {erro && <Alerta tipo="erro" style={{ marginBottom: '1rem' }}>{erro}</Alerta>}

      <SectionCard titulo="Identificação">
        <FormGrid cols="1fr 160px">
          <Field label="Nome completo" required>
            <InpText value={form.nome} onChange={set('nome')} disabled={!isSuperAdmin} />
          </Field>
          <Field label="Sigla / Nome curto">
            <InpText value={form.nome_curto} onChange={set('nome_curto')} placeholder="Ex: COOPAIBI" disabled={!isSuperAdmin} />
          </Field>
        </FormGrid>
        <FormGrid cols="1fr 1fr">
          <Field label="Tipo">
            <select value={form.tipo} onChange={set('tipo')} disabled={!isSuperAdmin} style={inp}>
              <option value="cooperativa">Cooperativa</option>
              <option value="associacao">Associação</option>
              <option value="central">Central</option>
            </select>
          </Field>
          <Field label="CNPJ">
            <InpText value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" disabled={!isSuperAdmin} />
          </Field>
        </FormGrid>
        <FormGrid cols="1fr 1fr 1fr">
          <Field label="E-mail">
            <InpText type="email" value={form.email} onChange={set('email')} placeholder="contato@org.com.br" />
          </Field>
          <Field label="Telefone">
            <InpText type="tel" value={form.telefone} onChange={set('telefone')} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="Site">
            <InpText value={form.site} onChange={set('site')} placeholder="https://..." />
          </Field>
        </FormGrid>
        {isSuperAdmin && (
          <FormGrid cols="1fr 1fr">
            <Field label="Data de fundação">
              <InpText type="date" value={form.data_fundacao} onChange={set('data_fundacao')} />
            </Field>
            <Field label="Registro JUCEB / Cartório">
              <InpText value={form.registro_juceb} onChange={set('registro_juceb')} placeholder="Número do registro" />
            </Field>
          </FormGrid>
        )}
      </SectionCard>

      <SectionCard titulo="Endereço">
        <FormGrid cols="160px 1fr">
          <Field label="CEP">
            <InpText
              value={form.cep}
              onChange={e => { set('cep')(e); if (e.target.value.replace(/\D/g, '').length === 8) buscarCEP(e.target.value) }}
              onBlur={() => buscarCEP(form.cep)}
              placeholder="00000-000"
              maxLength={9}
            />
          </Field>
          <Field label="Logradouro">
            <InpText value={form.logradouro} onChange={set('logradouro')} placeholder="Rua, Avenida…" />
          </Field>
        </FormGrid>
        <FormGrid cols="100px 1fr 1fr">
          <Field label="Número">
            <InpText value={form.numero} onChange={set('numero')} placeholder="123" />
          </Field>
          <Field label="Complemento">
            <InpText value={form.complemento} onChange={set('complemento')} placeholder="Sala, Apto…" />
          </Field>
          <Field label="Bairro">
            <InpText value={form.bairro} onChange={set('bairro')} placeholder="Bairro" />
          </Field>
        </FormGrid>
        <FormGrid cols="1fr 80px">
          <Field label="Cidade">
            <InpText value={form.cidade} onChange={set('cidade')} placeholder="Cidade" />
          </Field>
          <Field label="UF">
            <select value={form.estado} onChange={set('estado')} style={inp}>
              <option value="">UF</option>
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </Field>
        </FormGrid>
      </SectionCard>

      <BtnPrimary type="submit" loading={salvando} success={sucesso}>
        {salvando ? 'Salvando...' : sucesso ? '✓ Salvo' : 'Salvar alterações'}
      </BtnPrimary>
    </form>
  )
}

// ── Aba Captação ──────────────────────────────────────────────────────────────

function AbaCaptacao({ perfilCaptacao }: { perfilCaptacao: PerfilCaptacao | null }) {
  const [perfil, setPerfil] = useState({
    areas_tematicas: perfilCaptacao?.areas_tematicas ?? [],
    publicos_alvo:   perfilCaptacao?.publicos_alvo   ?? [],
    abrangencia:     perfilCaptacao?.abrangencia     ?? [],
    municipios:      perfilCaptacao?.municipios      ?? [],
    porte_min:       perfilCaptacao?.porte_min  != null ? String(perfilCaptacao.porte_min)  : '',
    porte_max:       perfilCaptacao?.porte_max  != null ? String(perfilCaptacao.porte_max)  : '',
    idiomas:         perfilCaptacao?.idiomas         ?? ['pt'],
    descricao_org:   perfilCaptacao?.descricao_org   ?? '',
  })

  const [salvando, setSalvando]   = useState(false)
  const [sucesso, setSucesso]     = useState(false)
  const [erro, setErro]           = useState('')
  const [modalAreas, setModalAreas]   = useState(false)
  const [modalPublicos, setModalPublicos] = useState(false)

  function toggleArray(campo: 'abrangencia' | 'idiomas', valor: string) {
    setPerfil(prev => {
      const arr = prev[campo]
      return { ...prev, [campo]: arr.includes(valor) ? arr.filter(v => v !== valor) : [...arr, valor] }
    })
  }

  async function handleSalvar() {
    setSalvando(true); setErro(''); setSucesso(false)
    const res = await salvarPerfilCaptacao({
      areas_tematicas: perfil.areas_tematicas,
      publicos_alvo:   perfil.publicos_alvo,
      abrangencia:     perfil.abrangencia,
      municipios:      perfil.municipios,
      idiomas:         perfil.idiomas,
      porte_min:       perfil.porte_min ? parseFloat(perfil.porte_min) : null,
      porte_max:       perfil.porte_max ? parseFloat(perfil.porte_max) : null,
      descricao_org:   perfil.descricao_org || null,
    })
    setSalvando(false)
    if (res.error) {
      setErro(res.error)
    } else {
      setSucesso(true)
      setTimeout(() => setSucesso(false), 2000)
    }
  }

  return (
    <div>
      <SectionCard titulo="Perfil de captação" subtitulo="Usado pelo Radar para calcular compatibilidade com editais.">
        {erro && <Alerta tipo="erro" style={{ marginBottom: '1rem' }}>{erro}</Alerta>}

        {/* Áreas temáticas */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Field label="Áreas temáticas">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <BtnAction onClick={() => setModalAreas(true)}>
                ✏ {perfil.areas_tematicas.length > 0
                  ? `${perfil.areas_tematicas.length} área${perfil.areas_tematicas.length !== 1 ? 's' : ''} selecionada${perfil.areas_tematicas.length !== 1 ? 's' : ''}`
                  : 'Selecionar áreas'}
              </BtnAction>
              {perfil.areas_tematicas.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {perfil.areas_tematicas.slice(0, 5).map(a => (
                    <Tag key={a} onRemove={() => setPerfil(p => ({ ...p, areas_tematicas: p.areas_tematicas.filter(x => x !== a) }))}>
                      {a}
                    </Tag>
                  ))}
                  {perfil.areas_tematicas.length > 5 && (
                    <span style={{ fontSize: '12px', color: '#888', alignSelf: 'center' }}>
                      +{perfil.areas_tematicas.length - 5} mais
                    </span>
                  )}
                </div>
              )}
            </div>
          </Field>
        </div>

        {/* Público-alvo */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Field label="Público-alvo">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <BtnAction onClick={() => setModalPublicos(true)}>
                ✏ {perfil.publicos_alvo.length > 0
                  ? `${perfil.publicos_alvo.length} público${perfil.publicos_alvo.length !== 1 ? 's' : ''} selecionado${perfil.publicos_alvo.length !== 1 ? 's' : ''}`
                  : 'Selecionar públicos'}
              </BtnAction>
              {perfil.publicos_alvo.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {perfil.publicos_alvo.slice(0, 4).map(p => (
                    <Tag key={p} onRemove={() => setPerfil(prev => ({ ...prev, publicos_alvo: prev.publicos_alvo.filter(x => x !== p) }))}>
                      {p}
                    </Tag>
                  ))}
                  {perfil.publicos_alvo.length > 4 && (
                    <span style={{ fontSize: '12px', color: '#888', alignSelf: 'center' }}>
                      +{perfil.publicos_alvo.length - 4} mais
                    </span>
                  )}
                </div>
              )}
            </div>
          </Field>
        </div>

        {/* Abrangência */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Field label="Abrangência geográfica">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
              {ABRANGENCIAS.map(ab => (
                <label key={ab} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#444', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={perfil.abrangencia.includes(ab)}
                    onChange={() => toggleArray('abrangencia', ab)}
                    style={{ accentColor: TEAL, width: 15, height: 15 }}
                  />
                  {ab.charAt(0).toUpperCase() + ab.slice(1)}
                </label>
              ))}
            </div>
          </Field>
        </div>

        {/* Municípios */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Field label="Municípios de atuação">
            <MunicipiosInput
              value={perfil.municipios}
              onChange={ms => setPerfil(p => ({ ...p, municipios: ms }))}
            />
          </Field>
        </div>

        {/* Porte */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Field label="Porte de projeto (R$)">
            <FormGrid cols="1fr 1fr">
              <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Valor mínimo</div>
                <InpText
                  type="number"
                  value={perfil.porte_min}
                  onChange={e => setPerfil(p => ({ ...p, porte_min: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Valor máximo (opcional)</div>
                <InpText
                  type="number"
                  value={perfil.porte_max}
                  onChange={e => setPerfil(p => ({ ...p, porte_max: e.target.value }))}
                  placeholder="sem limite"
                />
              </div>
            </FormGrid>
          </Field>
        </div>

        {/* Descrição */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Field label="Descrição da organização">
            <textarea
              value={perfil.descricao_org}
              onChange={e => setPerfil(p => ({ ...p, descricao_org: e.target.value }))}
              rows={4}
              placeholder="Ex: Cooperativa de agricultores familiares do Baixo Sul da Bahia..."
              style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = TEAL }}
              onBlur={e =>  { e.target.style.borderColor = '#d5d3cc' }}
            />
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>
              Usado pelo Claude para analisar compatibilidade com editais.
            </div>
          </Field>
        </div>

        <BtnPrimary type="button" onClick={handleSalvar} loading={salvando} success={sucesso}>
          {salvando ? 'Salvando...' : sucesso ? '✓ Salvo' : 'Salvar perfil de captação'}
        </BtnPrimary>
      </SectionCard>

      {/* Modais */}
      <ModalSeletor
        aberto={modalAreas}
        titulo="Áreas temáticas"
        opcoes={AREAS_CAPTACAO}
        selecionados={perfil.areas_tematicas}
        onFechar={() => setModalAreas(false)}
        onConfirmar={sel => { setPerfil(p => ({ ...p, areas_tematicas: sel })); setModalAreas(false) }}
      />
      <ModalSeletor
        aberto={modalPublicos}
        titulo="Público-alvo"
        opcoes={PUBLICOS_ALVO}
        selecionados={perfil.publicos_alvo}
        onFechar={() => setModalPublicos(false)}
        onConfirmar={sel => { setPerfil(p => ({ ...p, publicos_alvo: sel })); setModalPublicos(false) }}
      />
    </div>
  )
}

// ── Modal Seletor ─────────────────────────────────────────────────────────────

interface ModalSeletorProps {
  aberto: boolean
  titulo: string
  opcoes: string[]
  selecionados: string[]
  onFechar: () => void
  onConfirmar: (selecionados: string[]) => void
}

function ModalSeletor({ aberto, titulo, opcoes, selecionados, onFechar, onConfirmar }: ModalSeletorProps) {
  const [busca, setBusca]       = useState('')
  const [tmp, setTmp]           = useState<string[]>(selecionados)

  useEffect(() => {
    if (aberto) {
      setTmp(selecionados)
      setBusca('')
    }
  }, [aberto, selecionados])

  if (!aberto) return null

  const filtradas = opcoes.filter(o => o.toLowerCase().includes(busca.toLowerCase()))

  function toggle(op: string) {
    setTmp(prev => prev.includes(op) ? prev.filter(x => x !== op) : [...prev, op])
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }} onClick={onFechar}>
      <div style={{
        background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '560px',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #e5e3dc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>{titulo}</span>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        {/* Busca */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0eeea' }}>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar área..."
            autoFocus
            style={{ ...inp, background: '#f8f7f4' }}
            onFocus={e => { e.target.style.borderColor = TEAL }}
            onBlur={e =>  { e.target.style.borderColor = '#d5d3cc' }}
          />
        </div>

        {/* Grid de opções */}
        <div style={{ overflow: 'auto', padding: '14px 20px', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 12px' }}>
            {filtradas.map(op => (
              <label key={op} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: '#333', cursor: 'pointer', padding: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={tmp.includes(op)}
                  onChange={() => toggle(op)}
                  style={{ accentColor: TEAL, width: 14, height: 14, flexShrink: 0 }}
                />
                {op}
              </label>
            ))}
            {filtradas.length === 0 && (
              <div style={{ gridColumn: '1/-1', color: '#aaa', fontSize: '13px', padding: '12px 0' }}>
                Nenhuma opção encontrada.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e3dc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setTmp([])}
              style={{ ...btnSmSecondary, fontSize: '12px', padding: '6px 12px' }}
            >
              Limpar tudo
            </button>
            <button
              type="button"
              onClick={() => setTmp([...opcoes])}
              style={{ ...btnSmSecondary, fontSize: '12px', padding: '6px 12px' }}
            >
              Selecionar tudo
            </button>
          </div>
          <button
            type="button"
            onClick={() => onConfirmar(tmp)}
            style={{ padding: '8px 24px', background: TEAL, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
          >
            OK {tmp.length > 0 && `(${tmp.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Autocomplete de Municípios ────────────────────────────────────────────────

function MunicipiosInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [texto, setTexto]           = useState('')
  const [sugestoes, setSugestoes]   = useState<string[]>([])
  const [aberto, setAberto]         = useState(false)
  const containerRef                = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setTexto(v)
    if (v.length >= 2) {
      const q   = v.toLowerCase()
      const res = MUNICIPIOS_BA.filter(m => m.toLowerCase().includes(q) && !value.includes(m))
      setSugestoes(res.slice(0, 8))
      setAberto(true)
    } else {
      setSugestoes([])
      setAberto(false)
    }
  }

  function selecionar(m: string) {
    if (!value.includes(m)) onChange([...value, m])
    setTexto('')
    setSugestoes([])
    setAberto(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && texto.trim()) {
      e.preventDefault()
      const match = MUNICIPIOS_BA.find(m => m.toLowerCase() === texto.toLowerCase())
      selecionar(match ?? texto.trim())
    }
    if (e.key === 'Escape') { setAberto(false) }
  }

  function remover(m: string) {
    onChange(value.filter(x => x !== m))
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Tags */}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
          {value.map(m => (
            <Tag key={m} onRemove={() => remover(m)}>{m}</Tag>
          ))}
        </div>
      )}

      {/* Input */}
      <input
        value={texto}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (sugestoes.length > 0) setAberto(true) }}
        placeholder="Digite o município e selecione..."
        style={{ ...inp }}
        onFocusCapture={e => { e.target.style.borderColor = TEAL }}
        onBlurCapture={e =>  { e.target.style.borderColor = '#d5d3cc' }}
      />
      <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>
        Digite 2+ letras para sugerir. Enter para adicionar município não listado.
      </div>

      {/* Dropdown */}
      {aberto && sugestoes.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #d5d3cc', borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', marginTop: '2px', overflow: 'hidden',
        }}>
          {sugestoes.map(m => (
            <button
              key={m}
              type="button"
              onMouseDown={e => { e.preventDefault(); selecionar(m) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', background: 'none', border: 'none',
                fontSize: '13px', color: '#1a1a1a', cursor: 'pointer',
                borderBottom: '1px solid #f0eeea',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8f7f4' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Helpers de UI ─────────────────────────────────────────────────────────────

function SectionCard({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{titulo}</div>
        {subtitulo && <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>{subtitulo}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {children}
      </div>
    </div>
  )
}

function FormGrid({ cols, children }: { cols: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '12px' }}>
      {children}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function InpText({
  value, onChange, placeholder, type = 'text', disabled = false,
  maxLength, onBlur,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  disabled?: boolean
  maxLength?: number
  onBlur?: () => void
}) {
  const style: React.CSSProperties = disabled
    ? { ...inp, background: '#f0eeea', color: '#888', cursor: 'not-allowed' }
    : { ...inp }

  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      onBlur={onBlur}
      style={style}
      onFocus={e => { if (!disabled) e.target.style.borderColor = TEAL }}
      onBlurCapture={e => { e.target.style.borderColor = '#d5d3cc' }}
    />
  )
}

function Tag({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '12px', padding: '3px 8px', borderRadius: '10px',
      background: '#E6F7F1', color: TEAL, fontWeight: '500',
    }}>
      {children}
      <button
        type="button"
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEAL, fontSize: '13px', padding: 0, lineHeight: 1, marginLeft: '1px' }}
      >
        ×
      </button>
    </span>
  )
}

function Alerta({ tipo, children, style }: { tipo: 'erro' | 'ok'; children: React.ReactNode; style?: React.CSSProperties }) {
  const ok = tipo === 'ok'
  return (
    <div style={{
      background: ok ? '#E6F7F1' : '#fef2f2',
      border: `1px solid ${ok ? '#1D9E7533' : '#fca5a5'}`,
      borderRadius: '8px', padding: '8px 12px',
      fontSize: '13px', color: ok ? '#166534' : '#dc2626',
      ...style,
    }}>
      {children}
    </div>
  )
}

function BtnPrimary({
  children, type = 'button', onClick, loading = false, success = false,
}: {
  children: React.ReactNode
  type?: 'button' | 'submit'
  onClick?: () => void
  loading?: boolean
  success?: boolean
}) {
  const [hover, setHover] = useState(false)
  const bg = success ? TEAL_SUC : loading ? TEAL : hover ? TEAL_DARK : TEAL
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '10px 24px', background: bg, color: '#fff',
        border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
        transition: 'background 0.15s',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  )
}

function BtnAction({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 16px', background: hover ? '#E0E3FF' : '#EEF0FF',
        color: PURPLE_DARK, border: 'none', borderRadius: '8px',
        fontSize: '13px', fontWeight: '500', cursor: 'pointer',
        transition: 'background 0.15s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  )
}

// ── Estilos base ──────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #d5d3cc',
  borderRadius: '8px', fontSize: '13px', background: '#fafaf8',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}

function formatarCNPJ(v: string) {
  const n = v.replace(/\D/g, '')
  return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') || v
}

function formatarCEP(v: string) {
  const n = v.replace(/\D/g, '')
  return n.replace(/^(\d{5})(\d{3})$/, '$1-$2') || v
}

const btnSmSecondary: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e3dc', borderRadius: '8px',
  color: '#444', cursor: 'pointer', fontSize: '13px',
  padding: '10px 24px',
}
