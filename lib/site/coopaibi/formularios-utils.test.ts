import { describe, it, expect } from 'vitest'
import {
  limpar, escaparHtml, limparCampos, montarLead, montarCorpoEmail,
  MAPA_CAMPOS, ASSUNTO, LIMITE_CAMPO,
} from './formularios-utils'

describe('limpar', () => {
  it('remove tags — o corpo do e-mail é montado com o texto do visitante', () => {
    expect(limpar('<script>alert(1)</script>oi')).toBe('alert(1)oi')
    expect(limpar('<b>João</b>')).toBe('João')
  })

  it('apara espaço nas pontas', () => {
    expect(limpar('  Maria  ')).toBe('Maria')
  })

  it('corta no limite — o PHP não tinha nenhum e aceitava megabytes num campo', () => {
    const gigante = 'a'.repeat(LIMITE_CAMPO + 500)
    expect(limpar(gigante)).toHaveLength(LIMITE_CAMPO)
  })

  it('trata null, undefined e número sem quebrar', () => {
    expect(limpar(null)).toBe('')
    expect(limpar(undefined)).toBe('')
    expect(limpar(42)).toBe('42')
  })

  it('preserva acento e emoji, que são texto legítimo do visitante', () => {
    expect(limpar('Ibirataia — produção 🌱')).toBe('Ibirataia — produção 🌱')
  })
})

describe('escaparHtml', () => {
  it('escapa & antes de < e >, senão o próprio escape seria reescapado', () => {
    expect(escaparHtml('a & b')).toBe('a &amp; b')
    expect(escaparHtml('<pre>')).toBe('&lt;pre&gt;')
  })

  it('não duplica escape de entidade já escrita pelo visitante', () => {
    // "&amp;" digitado literalmente vira "&amp;amp;" — correto: no <pre> o
    // visitante deve ver exatamente o que escreveu.
    expect(escaparHtml('&amp;')).toBe('&amp;amp;')
  })

  it('texto sem caractere especial passa intacto', () => {
    expect(escaparHtml('Cacau 100% fino')).toBe('Cacau 100% fino')
  })
})

describe('limparCampos', () => {
  it('descarta campo que ficou vazio depois de limpo', () => {
    const r = limparCampos({ nome: 'Ana', msg: '   ', vazio: '', tags: '<br>' })
    expect(r).toEqual({ nome: 'Ana' })
  })

  it('mantém a chave crua do HTML — renomear quebraria as páginas capturadas', () => {
    const r = limparCampos({ tel: '73999999999', msg: 'oi' })
    expect(Object.keys(r).sort()).toEqual(['msg', 'tel'])
  })
})

describe('montarLead', () => {
  it('cooperado: nome/email/tel/msg viram coluna', () => {
    const r = montarLead('cooperado', {
      nome: 'João Silva', email: 'j@x.com', tel: '73999999999', msg: 'quero entrar',
      cpf: '123', area: '2ha',
    })
    expect(r).toEqual({
      nome: 'João Silva', email: 'j@x.com', telefone: '73999999999', mensagem: 'quero entrar',
    })
  })

  it('parceria: o nome vem de `contato`, não de `nome` — o HTML é outro', () => {
    const r = montarLead('parceria', { contato: 'Maria', empresa: 'ACME', email: 'm@x.com' })
    expect(r?.nome).toBe('Maria')
  })

  it('agendamento_cacau: não tem e-mail no formulário, e a mensagem é `observacoes`', () => {
    const r = montarLead('agendamento_cacau', {
      nome: 'Zé', telefone: '7398888', observacoes: 'entrego terça', quantidade: '300kg',
    })
    expect(r).toEqual({
      nome: 'Zé', email: null, telefone: '7398888', mensagem: 'entrego terça',
    })
  })

  it('sem nome devolve null — não há a quem responder, e o PHP também recusava', () => {
    expect(montarLead('cooperado', { email: 'j@x.com' })).toBeNull()
    expect(montarLead('parceria', { empresa: 'ACME' })).toBeNull()
  })

  it('campo ausente vira null, nunca undefined (a coluna é nullable)', () => {
    const r = montarLead('cooperado', { nome: 'Só o nome' })
    expect(r).toEqual({ nome: 'Só o nome', email: null, telefone: null, mensagem: null })
  })

  it('os três tipos do CHECK da migration 096 estão mapeados', () => {
    expect(Object.keys(MAPA_CAMPOS).sort()).toEqual(['agendamento_cacau', 'cooperado', 'parceria'])
  })
})

describe('ASSUNTO', () => {
  it('usa os campos do formulário correspondente', () => {
    expect(ASSUNTO.cooperado({ nome: 'João' })).toBe('Novo Cooperado — João')
    expect(ASSUNTO.parceria({ cota: 'Ouro', empresa: 'ACME' }))
      .toBe('Interesse em Parceria — Ouro — ACME')
  })

  it('não quebra com campo faltando — assunto ruim é melhor que erro 500', () => {
    expect(() => ASSUNTO.parceria({})).not.toThrow()
    expect(ASSUNTO.cooperado({})).toBe('Novo Cooperado — ')
  })
})

describe('montarCorpoEmail', () => {
  it('traduz a chave crua do HTML para rótulo legível', () => {
    const corpo = montarCorpoEmail('cooperado', { nome: 'João', tel: '73999', msg: 'oi' })
    expect(corpo).toContain('Nome completo')
    expect(corpo).toContain('Telefone/WhatsApp')
    expect(corpo).not.toMatch(/^tel\s*:/m)
  })

  it('campo desconhecido cai no próprio nome, em vez de sumir do aviso', () => {
    const corpo = montarCorpoEmail('cooperado', { nome: 'João', campo_novo: 'valor' })
    expect(corpo).toContain('campo_novo')
    expect(corpo).toContain('valor')
  })

  it('inclui o IP quando há, e omite a linha quando não há', () => {
    expect(montarCorpoEmail('cooperado', { nome: 'J' }, '1.2.3.4')).toContain('IP: 1.2.3.4')
    expect(montarCorpoEmail('cooperado', { nome: 'J' })).not.toContain('IP:')
  })

  it('leva o título do formulário certo', () => {
    expect(montarCorpoEmail('parceria', { contato: 'M' })).toContain('NOVO INTERESSE DE PARCERIA')
    expect(montarCorpoEmail('agendamento_cacau', { nome: 'Z' })).toContain('NOVO AGENDAMENTO')
  })
})
