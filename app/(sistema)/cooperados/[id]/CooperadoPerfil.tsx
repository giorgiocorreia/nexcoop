'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Cooperado, StatusCooperado } from '@/types/database'

const STATUS_CONFIG: Record<
  StatusCooperado,
  { label: string; cor: string; bg: string; border: string }
> = {
  proposta:     { label: 'Proposta',     cor: '#6366f1', bg: '#ede9fe', border: '#a5b4fc' },
  probatorio:   { label: 'Probatório',   cor: '#185FA5', bg: '#E6F1FB', border: '#93c5fd' },
  ativo:        { label: 'Ativo',        cor: '#0F6E56', bg: '#E1F5EE', border: '#6ee7b7' },
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

function InfoLinha({ label, valor }: { label: string; valor?: string | number | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f3ef' }}>
      <span style={{ fontSize: '12px', color: '#888', fontWeight: '500' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '400', textAlign: 'right', maxWidth: '60%' }}>
        {valor ?? '—'}
      </span>
    </div>
  )
}

function Secao({ titulo, icone, children }: { titulo: string; icone: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{icone}</span> {titulo}
      </div>
      {children}
    </div>
  )
}

interface Props {
  cooperado: Cooperado
}

export default function CooperadoPerfil({ cooperado: initial }: Props) {
  const router = useRouter()
  const [cooperado, setCooperado] = useState(initial)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [alterandoStatus, setAlterandoStatus] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fecha menu ao clicar fora
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

  return (
    <div style={{ maxWidth: '960px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Breadcrumb + voltar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', fontSize: '13px', color: '#888' }}>
        <button
          onClick={() => router.push('/cooperados')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1D9E75', fontSize: '13px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ← Cooperados
        </button>
        <span>/</span>
        <span style={{ color: '#1a1a1a', fontWeight: '500' }}>{cooperado.nome_completo}</span>
      </div>

      {/* Mensagem de feedback */}
      {mensagem && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem',
          background: mensagem.tipo === 'ok' ? '#E1F5EE' : '#fef2f2',
          border: `1px solid ${mensagem.tipo === 'ok' ? '#6ee7b7' : '#fca5a5'}`,
          color: mensagem.tipo === 'ok' ? '#0F6E56' : '#dc2626',
        }}>
          {mensagem.tipo === 'ok' ? '✓' : '⚠'} {mensagem.texto}
        </div>
      )}

      {/* Cabeçalho do perfil */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Avatar */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', background: '#e8f7f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: '700', color: '#0F6E56', flexShrink: 0,
            border: '2px solid #b8e8d6',
          }}>
            {iniciais}
          </div>

          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
              {cooperado.nome_completo}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
              {cooperado.numero_matricula && (
                <span style={{ fontSize: '12px', color: '#888' }}>
                  Matríc. {cooperado.numero_matricula}
                </span>
              )}
              {cooperado.numero_matricula && <span style={{ color: '#ccc' }}>·</span>}
              <span style={{ fontSize: '12px', color: '#888' }}>
                {cooperado.tipo === 'pessoa_fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </span>
              {cooperado.data_admissao && (
                <>
                  <span style={{ color: '#ccc' }}>·</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>
                    Admitido em {formatarData(cooperado.data_admissao)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status com dropdown inline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowStatusMenu(prev => !prev)}
              disabled={alterandoStatus}
              title="Clique para alterar o status"
              style={{
                padding: '6px 14px 6px 10px', borderRadius: '20px',
                border: `1.5px solid ${st.border}`, background: st.bg,
                color: st.cor, fontSize: '12px', fontWeight: '700',
                cursor: alterandoStatus ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'opacity 0.1s',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: st.cor, flexShrink: 0, display: 'inline-block' }} />
              {alterandoStatus ? 'Alterando…' : st.label}
              <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
            </button>

            {showStatusMenu && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: '#fff', border: '1px solid #e5e3dc', borderRadius: '10px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden',
                minWidth: '160px',
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
                        color: ativo ? cfg.cor : '#444',
                        fontSize: '13px', textAlign: 'left', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontWeight: ativo ? '600' : '400',
                      }}
                      onMouseEnter={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = '#f8f7f4' }}
                      onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.cor, flexShrink: 0 }} />
                      {cfg.label}
                      {ativo && <span style={{ marginLeft: 'auto', fontSize: '11px' }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => router.push(`/cooperados/${cooperado.id}/editar`)}
            style={{
              padding: '7px 16px', border: '1px solid #d5d3cc', borderRadius: '8px',
              background: '#fff', fontSize: '13px', color: '#444', cursor: 'pointer',
              fontWeight: '500',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8f7f4' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
          >
            ✏️ Editar
          </button>
        </div>
      </div>

      {/* Grid de seções */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

        {/* Dados pessoais */}
        <Secao titulo="Dados pessoais" icone="👤">
          {cooperado.tipo === 'pessoa_fisica' ? (
            <>
              <InfoLinha label="CPF" valor={formatarCPF(cooperado.cpf)} />
              <InfoLinha label="RG" valor={cooperado.rg} />
              <InfoLinha label="Data de nascimento" valor={formatarData(cooperado.data_nascimento)} />
              <InfoLinha label="Sexo" valor={cooperado.sexo === 'M' ? 'Masculino' : cooperado.sexo === 'F' ? 'Feminino' : cooperado.sexo === 'outro' ? 'Outro' : null} />
            </>
          ) : (
            <>
              <InfoLinha label="CNPJ" valor={cooperado.cnpj_pj} />
              <InfoLinha label="Representante" valor={cooperado.representante_nome} />
              <InfoLinha label="CPF do representante" valor={formatarCPF(cooperado.representante_cpf)} />
            </>
          )}
        </Secao>

        {/* Contato */}
        <Secao titulo="Contato" icone="📞">
          <InfoLinha label="E-mail" valor={cooperado.email} />
          <InfoLinha label="Telefone" valor={cooperado.telefone} />
          <InfoLinha label="WhatsApp" valor={cooperado.whatsapp} />
        </Secao>

        {/* Endereço */}
        <Secao titulo="Endereço" icone="📍">
          {cooperado.logradouro ? (
            <InfoLinha
              label="Logradouro"
              valor={`${cooperado.logradouro}${cooperado.numero ? `, ${cooperado.numero}` : ''}${cooperado.complemento ? ` — ${cooperado.complemento}` : ''}`}
            />
          ) : null}
          <InfoLinha label="Bairro" valor={cooperado.bairro} />
          <InfoLinha label="Cidade / UF" valor={cooperado.cidade && cooperado.estado ? `${cooperado.cidade} / ${cooperado.estado}` : cooperado.cidade || cooperado.estado} />
          <InfoLinha label="CEP" valor={cooperado.cep} />
        </Secao>

        {/* Propriedade rural */}
        <Secao titulo="Propriedade rural" icone="🌱">
          <InfoLinha label="Nome da propriedade" valor={cooperado.nome_propriedade} />
          <InfoLinha label="Área total" valor={cooperado.area_total_ha != null ? `${cooperado.area_total_ha} ha` : null} />
          <InfoLinha label="CAF" valor={cooperado.caf_numero} />
          <InfoLinha label="Situação CAF" valor={cooperado.caf_situacao} />
          <InfoLinha label="Validade CAF" valor={formatarData(cooperado.caf_validade)} />
          <InfoLinha label="DAP" valor={cooperado.dap_numero} />
        </Secao>

        {/* Cadastro */}
        <Secao titulo="Cadastro" icone="📋">
          <InfoLinha label="Matrícula" valor={cooperado.numero_matricula} />
          <InfoLinha label="Data de admissão" valor={formatarData(cooperado.data_admissao)} />
          {cooperado.data_saida && (
            <InfoLinha label="Data de saída" valor={formatarData(cooperado.data_saida)} />
          )}
          {cooperado.motivo_saida && (
            <InfoLinha label="Motivo de saída" valor={cooperado.motivo_saida} />
          )}
          <InfoLinha label="Cadastrado em" valor={new Date(cooperado.criado_em).toLocaleDateString('pt-BR')} />
          <InfoLinha label="Última atualização" valor={new Date(cooperado.atualizado_em).toLocaleDateString('pt-BR')} />
        </Secao>

        {/* Localização */}
        {(cooperado.latitude || cooperado.longitude) && (
          <Secao titulo="Geolocalização" icone="🗺️">
            <InfoLinha label="Latitude" valor={cooperado.latitude?.toString()} />
            <InfoLinha label="Longitude" valor={cooperado.longitude?.toString()} />
            <div style={{ marginTop: '10px' }}>
              <a
                href={`https://maps.google.com/?q=${cooperado.latitude},${cooperado.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#185FA5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                🗺️ Ver no Google Maps →
              </a>
            </div>
          </Secao>
        )}
      </div>

      {/* Rodapé com ID */}
      <p style={{ fontSize: '11px', color: '#bbb', marginTop: '1rem', textAlign: 'right' }}>
        ID: {cooperado.id}
      </p>
    </div>
  )
}
