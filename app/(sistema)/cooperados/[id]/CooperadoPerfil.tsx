'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Cooperado, StatusCooperado } from '@/types/database'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, ContentCard, Badge, InfoRow, AlertBanner,
  MODULO_NEXCOOP, COM_C,
} from '@/components/nexcoop/ui'
import CotasSection from './CotasSection'
import PagamentosSection from './PagamentosSection'
import AcessoSistemaCard from './AcessoSistemaCard'
import type { AcessoCooperado } from './page'

const STATUS_CONFIG: Record<
  StatusCooperado,
  { label: string; cor: string; bg: string; border: string }
> = {
  proposta:     { label: 'Proposta',     cor: '#6366f1', bg: '#ede9fe', border: '#a5b4fc' },
  probatorio:   { label: 'Probatório',   cor: '#185FA5', bg: '#E6F1FB', border: '#93c5fd' },
  ativo:        { label: 'Ativo',        cor: '#4840CC', bg: '#EEF0FF', border: '#6ee7b7' },
  inadimplente: { label: 'Inadimplente', cor: '#854F0B', bg: '#FAEEDA', border: '#fcd34d' },
  suspenso:     { label: 'Suspenso',     cor: '#993C1D', bg: '#FAECE7', border: '#f9a8d4' },
  demitido:     { label: 'Demitido',     cor: '#7f1d1d', bg: '#fee2e2', border: '#fca5a5' },
  excluido:     { label: 'Excluído',     cor: '#374151', bg: '#f3f4f6', border: '#d1d5db' },
}

const TODOS_STATUS: StatusCooperado[] = [
  'proposta', 'probatorio', 'ativo', 'inadimplente', 'suspenso', 'demitido', 'excluido',
]

function formatarCPF(cpf: string | null) {
  if (!cpf) return '—'
  const s = cpf.replace(/\D/g, '')
  if (s.length !== 11) return cpf
  return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6,9)}-${s.slice(9)}`
}

function formatarData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

type Propriedade = {
  id: string
  nome: string | null
  area_total_ha: number | null
  latitude: number | null
  longitude: number | null
  caf_numero: string | null
  caf_situacao: string | null
  caf_validade: string | null
  dap_numero: string | null
}

interface Props {
  cooperado:  Cooperado
  propriedades: Propriedade[]
  orgTipo:    string | null
  orgNome:    string | null
  usuarioId:  string
  ehAdmin:    boolean
  acesso:     AcessoCooperado
}

export default function CooperadoPerfil({ cooperado: initial, propriedades, orgTipo, orgNome, usuarioId, ehAdmin, acesso }: Props) {
  const router = useRouter()
  const [cooperado, setCooperado] = useState(initial)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [alterandoStatus, setAlterandoStatus] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pagamentosRef = useRef<{ carregar: () => void } | null>(null)

  const labelPlural = orgTipo === 'cooperativa' ? 'Cooperados' : 'Filiados'

  const handleCotaAtualizada = useCallback(() => {
    pagamentosRef.current?.carregar()
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function alterarStatus(novoStatus: StatusCooperado) {
    if (novoStatus === cooperado.status) { setShowStatusMenu(false); return }
    setAlterandoStatus(true)
    setShowStatusMenu(false)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('cooperados')
      .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
      .eq('id', cooperado.id)
      .select()
      .single()

    if (error) {
      setMensagem({ tipo: 'erro', texto: `Erro ao atualizar status: ${error.message}` })
    } else {
      setCooperado(data)
      setMensagem({ tipo: 'ok', texto: `Status alterado para "${STATUS_CONFIG[novoStatus].label}" com sucesso.` })
    }
    setAlterandoStatus(false)
    setTimeout(() => setMensagem(null), 4000)
  }

  const st = STATUS_CONFIG[cooperado.status]
  const iniciais = cooperado.nome_completo
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()

  const subtituloParts: string[] = []
  if (cooperado.numero_matricula) subtituloParts.push(`Matríc. ${cooperado.numero_matricula}`)
  subtituloParts.push(cooperado.tipo === 'pessoa_fisica' ? 'Pessoa Física' : 'Pessoa Jurídica')
  if (cooperado.data_admissao) subtituloParts.push(`Admitido em ${formatarData(cooperado.data_admissao)}`)

  return (
    <PageLayout
      titulo={cooperado.nome_completo}
      subtitulo={subtituloParts.join(' · ')}
      icone="ti-user"
      modulo={MODULO_NEXCOOP}
      breadcrumb={[
        { label: labelPlural, href: '/cooperados' },
        { label: cooperado.nome_completo },
      ]}
      acoes={
        <Badge label={st.label} bg={st.bg} cor={st.cor} dot />
      }
    >
      <div style={{ maxWidth: 960 }}>

        {mensagem && (
          <AlertBanner tipo={mensagem.tipo === 'ok' ? 'ok' : 'erro'}>
            {mensagem.texto}
          </AlertBanner>
        )}

        <div style={{ marginBottom: 16 }}>
        <ContentCard padding="1.5rem">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: COM_C.roxoLt,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, color: COM_C.roxo, flexShrink: 0,
                border: `2px solid ${COM_C.borda}`,
              }}>
                {iniciais}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COM_C.txt }}>
                  {cooperado.nome_completo}
                </div>
                <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 4 }}>
                  {subtituloParts.join(' · ')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowStatusMenu(prev => !prev)}
                  disabled={alterandoStatus}
                  title="Clique para alterar o status"
                  style={{
                    padding: '6px 14px 6px 10px', borderRadius: 20,
                    border: `1.5px solid ${st.border}`, background: st.bg,
                    color: st.cor, fontSize: 12, fontWeight: 700,
                    cursor: alterandoStatus ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'opacity 0.1s', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.cor, flexShrink: 0, display: 'inline-block' }} />
                  {alterandoStatus ? 'Alterando…' : st.label}
                  <i className="ti ti-chevron-down" style={{ fontSize: 10, opacity: 0.6 }} />
                </button>

                {showStatusMenu && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                    background: '#fff', border: `1px solid ${COM_C.borda}`, borderRadius: 10,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden',
                    minWidth: 160,
                  }}>
                    {TODOS_STATUS.map(s => {
                      const cfg = STATUS_CONFIG[s]
                      const ativo = s === cooperado.status
                      return (
                        <button
                          key={s}
                          onClick={() => alterarStatus(s)}
                          style={{
                            width: '100%', padding: '9px 14px', border: 'none',
                            background: ativo ? cfg.bg : 'transparent',
                            color: ativo ? cfg.cor : COM_C.txt,
                            fontSize: 13, textAlign: 'left', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontWeight: ativo ? 600 : 400, fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = COM_C.bg }}
                          onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.cor, flexShrink: 0 }} />
                          {cfg.label}
                          {ativo && <i className="ti ti-check" style={{ marginLeft: 'auto', fontSize: 12 }} />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <Btn
                variante="cinza"
                icone="ti-pencil"
                onClick={() => router.push(`/cooperados/${cooperado.id}/editar`)}
              >
                Editar
              </Btn>
            </div>
          </div>
        </ContentCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          <ContentCard title="Dados pessoais">
            {cooperado.tipo === 'pessoa_fisica' ? (
              <>
                <InfoRow label="CPF" valor={formatarCPF(cooperado.cpf)} />
                <InfoRow label="RG" valor={cooperado.rg} />
                <InfoRow label="Data de nascimento" valor={formatarData(cooperado.data_nascimento)} />
                <InfoRow label="Sexo" valor={cooperado.sexo === 'M' ? 'Masculino' : cooperado.sexo === 'F' ? 'Feminino' : cooperado.sexo === 'outro' ? 'Outro' : null} />
              </>
            ) : (
              <>
                <InfoRow label="CNPJ" valor={cooperado.cnpj_pj} />
                <InfoRow label="Representante" valor={cooperado.representante_nome} />
                <InfoRow label="CPF do representante" valor={formatarCPF(cooperado.representante_cpf)} />
              </>
            )}
            {(cooperado.conjuge_nome || cooperado.conjuge_cpf) && (
              <>
                <InfoRow label="Cônjuge" valor={cooperado.conjuge_nome} />
                <InfoRow label="CPF do cônjuge" valor={formatarCPF(cooperado.conjuge_cpf)} />
              </>
            )}
          </ContentCard>

          <ContentCard title="Contato">
            <InfoRow label="E-mail" valor={cooperado.email} />
            <InfoRow label="Telefone" valor={cooperado.telefone} />
            <InfoRow label="WhatsApp" valor={cooperado.whatsapp} />
          </ContentCard>

          <ContentCard title="Endereço">
            {cooperado.logradouro ? (
              <InfoRow
                label="Logradouro"
                valor={`${cooperado.logradouro}${cooperado.numero ? `, ${cooperado.numero}` : ''}${cooperado.complemento ? ` — ${cooperado.complemento}` : ''}`}
              />
            ) : null}
            <InfoRow label="Bairro" valor={cooperado.bairro} />
            <InfoRow label="Cidade / UF" valor={cooperado.cidade && cooperado.estado ? `${cooperado.cidade} / ${cooperado.estado}` : cooperado.cidade || cooperado.estado} />
            <InfoRow label="CEP" valor={cooperado.cep} />
          </ContentCard>

          <ContentCard title={`Propriedades rurais${propriedades.length > 0 ? ` (${propriedades.length})` : ''}`}>
            {propriedades.length === 0 ? (
              <div style={{ fontSize: 13, color: COM_C.txtSub }}>Nenhuma propriedade cadastrada.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {propriedades.map((p, i) => (
                  <div key={p.id} style={i > 0 ? { paddingTop: 16, borderTop: `1px solid ${COM_C.borda}` } : undefined}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COM_C.txt, marginBottom: 6 }}>
                      {p.nome || `Propriedade ${i + 1}`}
                    </div>
                    <InfoRow label="Área total" valor={p.area_total_ha != null ? `${p.area_total_ha} ha` : null} />
                    <InfoRow label="CAF" valor={p.caf_numero} />
                    <InfoRow label="Situação CAF" valor={p.caf_situacao} />
                    <InfoRow label="Validade CAF" valor={formatarData(p.caf_validade)} />
                    <InfoRow label="DAP" valor={p.dap_numero} />
                    {(p.latitude != null && p.longitude != null) && (
                      <InfoRow label="Coordenadas" valor={`${p.latitude}, ${p.longitude}`} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ContentCard>

          <ContentCard title="Cadastro">
            <InfoRow label="Matrícula" valor={cooperado.numero_matricula} />
            <InfoRow label="Data de admissão" valor={formatarData(cooperado.data_admissao)} />
            {cooperado.data_saida && (
              <InfoRow label="Data de saída" valor={formatarData(cooperado.data_saida)} />
            )}
            {cooperado.motivo_saida && (
              <InfoRow label="Motivo de saída" valor={cooperado.motivo_saida} />
            )}
            <InfoRow label="Cadastrado em" valor={new Date(cooperado.criado_em).toLocaleDateString('pt-BR')} />
            <InfoRow label="Última atualização" valor={new Date(cooperado.atualizado_em).toLocaleDateString('pt-BR')} />
          </ContentCard>

          {(cooperado.latitude || cooperado.longitude) && (
            <ContentCard title="Geolocalização">
              <InfoRow label="Latitude" valor={cooperado.latitude?.toString()} />
              <InfoRow label="Longitude" valor={cooperado.longitude?.toString()} />
              <div style={{ marginTop: 10 }}>
                <a
                  href={`https://maps.google.com/?q=${cooperado.latitude},${cooperado.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: COM_C.azul, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <i className="ti ti-map-pin" style={{ fontSize: 14 }} />
                  Ver no Google Maps
                </a>
              </div>
            </ContentCard>
          )}
        </div>

        {ehAdmin && (
          <div style={{ marginTop: 12 }}>
            <AcessoSistemaCard
              cooperadoId={cooperado.id}
              nome={cooperado.nome_completo}
              orgNome={orgNome}
              emailPadrao={cooperado.email}
              acessoInicial={acesso}
            />
          </div>
        )}

        {orgTipo === 'cooperativa' && (
          <CotasSection
            cooperadoId={cooperado.id}
            orgId={cooperado.organizacao_id}
            onCotaAtualizada={handleCotaAtualizada}
          />
        )}

        {orgTipo === 'cooperativa' && (
          <PagamentosSection
            ref={pagamentosRef}
            cooperadoId={cooperado.id}
            orgId={cooperado.organizacao_id}
            usuarioId={usuarioId}
          />
        )}

        <p style={{ fontSize: 11, color: '#bbb', marginTop: '1rem', textAlign: 'right' }}>
          ID: {cooperado.id}
        </p>
      </div>
    </PageLayout>
  )
}