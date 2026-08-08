import { describe, it, expect } from 'vitest'
import {
  linkWhatsapp, filtrarLeads, contarPorStatus, contarNoMes,
  escaparCsv, gerarCsv, nomeArquivoCsv,
} from './leads-utils'
import type { SiteLead } from '@/types/database'

function lead(over: Partial<SiteLead> = {}): SiteLead {
  return {
    id: crypto.randomUUID(),
    organizacao_id: 'org-1',
    tipo: 'cooperado',
    nome: 'João Silva',
    email: 'joao@exemplo.com',
    telefone: '73999998888',
    mensagem: null,
    dados: {},
    status: 'novo',
    observacoes: null,
    origem: null,
    user_agent: null,
    ip: null,
    criado_em: '2026-08-07T12:00:00.000Z',
    atualizado_em: '2026-08-07T12:00:00.000Z',
    ...over,
  }
}

describe('linkWhatsapp', () => {
  it('número nacional com DDD ganha o 55', () => {
    expect(linkWhatsapp('73999998888')).toBe('https://wa.me/5573999998888')
  })

  it('aceita o formato digitado pelo visitante, com máscara', () => {
    expect(linkWhatsapp('(73) 99999-8888')).toBe('https://wa.me/5573999998888')
    expect(linkWhatsapp('73 9 9999 8888')).toBe('https://wa.me/5573999998888')
  })

  it('fixo de 10 dígitos também vale — nem todo produtor tem celular', () => {
    expect(linkWhatsapp('7333334444')).toBe('https://wa.me/557333334444')
  })

  it('número que já vem com DDI não recebe outro 55', () => {
    expect(linkWhatsapp('5573999998888')).toBe('https://wa.me/5573999998888')
  })

  it('devolve null no que não dá para confiar — melhor sem botão que com número errado', () => {
    expect(linkWhatsapp('99999')).toBeNull()
    expect(linkWhatsapp('')).toBeNull()
    expect(linkWhatsapp(null)).toBeNull()
    expect(linkWhatsapp(undefined)).toBeNull()
    expect(linkWhatsapp('não tenho')).toBeNull()
    expect(linkWhatsapp('12345678901234567')).toBeNull()
  })
})

describe('filtrarLeads', () => {
  const leads = [
    lead({ nome: 'Ana', status: 'novo', tipo: 'cooperado' }),
    lead({ nome: 'Bruno', status: 'convertido', tipo: 'parceria', email: 'bruno@acme.com' }),
    lead({ nome: 'Carla', status: 'novo', tipo: 'agendamento_cacau', dados: { municipio: 'Ibirataia' } }),
  ]

  it('sem filtro devolve tudo', () => {
    expect(filtrarLeads(leads, {})).toHaveLength(3)
    expect(filtrarLeads(leads, { status: 'todos', tipo: 'todos', busca: '' })).toHaveLength(3)
  })

  it('filtra por status e por tipo', () => {
    expect(filtrarLeads(leads, { status: 'novo' }).map(l => l.nome)).toEqual(['Ana', 'Carla'])
    expect(filtrarLeads(leads, { tipo: 'parceria' }).map(l => l.nome)).toEqual(['Bruno'])
  })

  it('combina status e tipo', () => {
    expect(filtrarLeads(leads, { status: 'novo', tipo: 'cooperado' }).map(l => l.nome)).toEqual(['Ana'])
  })

  it('busca ignora caixa e acha por e-mail', () => {
    expect(filtrarLeads(leads, { busca: 'BRUNO' }).map(l => l.nome)).toEqual(['Bruno'])
    expect(filtrarLeads(leads, { busca: 'acme.com' }).map(l => l.nome)).toEqual(['Bruno'])
  })

  it('busca varre o jsonb dados — CPF e cidade não viraram coluna', () => {
    expect(filtrarLeads(leads, { busca: 'ibirataia' }).map(l => l.nome)).toEqual(['Carla'])
  })

  it('busca só de espaços não filtra nada', () => {
    expect(filtrarLeads(leads, { busca: '   ' })).toHaveLength(3)
  })

  it('lead sem dados/campos nulos não quebra a busca', () => {
    const magro = [lead({ nome: 'Zé', email: null, telefone: null, dados: {} as any })]
    expect(() => filtrarLeads(magro, { busca: 'x' })).not.toThrow()
    expect(filtrarLeads(magro, { busca: 'zé' })).toHaveLength(1)
  })
})

describe('contarPorStatus', () => {
  it('conta cada status e zera os ausentes', () => {
    const c = contarPorStatus([
      lead({ status: 'novo' }), lead({ status: 'novo' }), lead({ status: 'convertido' }),
    ])
    expect(c).toEqual({ novo: 2, em_contato: 0, convertido: 1, descartado: 0 })
  })

  it('lista vazia devolve tudo zero, não objeto vazio', () => {
    expect(contarPorStatus([])).toEqual({ novo: 0, em_contato: 0, convertido: 0, descartado: 0 })
  })
})

describe('contarNoMes', () => {
  const ref = new Date('2026-08-15T00:00:00.000Z')

  it('conta só o mês corrente do calendário', () => {
    const leads = [
      lead({ criado_em: '2026-08-01T10:00:00.000Z' }),
      lead({ criado_em: '2026-08-31T10:00:00.000Z' }),
      lead({ criado_em: '2026-07-31T10:00:00.000Z' }), // mês anterior
    ]
    expect(contarNoMes(leads, ref)).toBe(2)
  })

  it('não confunde o mesmo mês de outro ano', () => {
    expect(contarNoMes([lead({ criado_em: '2025-08-10T10:00:00.000Z' })], ref)).toBe(0)
  })

  it('lista vazia é zero', () => {
    expect(contarNoMes([], ref)).toBe(0)
  })
})

describe('escaparCsv', () => {
  it('valor simples passa direto', () => {
    expect(escaparCsv('João')).toBe('João')
  })

  it('põe entre aspas quando tem o separador', () => {
    expect(escaparCsv('a;b')).toBe('"a;b"')
  })

  it('dobra aspas internas', () => {
    expect(escaparCsv('diz "oi"')).toBe('"diz ""oi"""')
  })

  it('protege quebra de linha — mensagem de formulário tem, e isso desalinharia o arquivo', () => {
    expect(escaparCsv('linha1\nlinha2')).toBe('"linha1\nlinha2"')
  })

  it('null e undefined viram campo vazio', () => {
    expect(escaparCsv(null)).toBe('')
    expect(escaparCsv(undefined)).toBe('')
  })
})

describe('gerarCsv', () => {
  it('começa com BOM, para o Excel em português não comer o acento', () => {
    expect(gerarCsv([])).toMatch(/^﻿/)
  })

  it('traz o cabeçalho mesmo sem lead nenhum', () => {
    const csv = gerarCsv([])
    expect(csv).toContain('Nome;E-mail')
    expect(csv.split('\r\n')).toHaveLength(1)
  })

  it('uma linha por lead, com rótulo legível em vez do valor cru do banco', () => {
    const csv = gerarCsv([lead({ nome: 'Ana', tipo: 'agendamento_cacau', status: 'em_contato' })])
    const linhas = csv.split('\r\n')
    expect(linhas).toHaveLength(2)
    expect(linhas[1]).toContain('Entrega de cacau')
    expect(linhas[1]).toContain('Em contato')
    expect(linhas[1]).not.toContain('agendamento_cacau')
  })

  it('achata o jsonb dados em uma coluna só, com chave=valor', () => {
    const csv = gerarCsv([lead({ dados: { cpf: '123', area: '2ha' } })])
    expect(csv).toContain('cpf=123 | area=2ha')
  })

  it('mensagem com ; e quebra de linha não estoura as colunas', () => {
    const csv = gerarCsv([lead({ mensagem: 'quero;entrar\nna cooperativa' })])
    // 10 colunas => 9 separadores fora dos campos entre aspas.
    const linha = csv.split('\r\n')[1]
    const foraDeAspas = linha.replace(/"([^"]|"")*"/g, '')
    expect(foraDeAspas.split(';')).toHaveLength(10)
  })
})

describe('nomeArquivoCsv', () => {
  it('usa a data da exportação', () => {
    expect(nomeArquivoCsv(new Date('2026-08-08T13:00:00.000Z'))).toBe('leads-site-2026-08-08.csv')
  })
})
