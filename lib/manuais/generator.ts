'use server'

export const runtime = 'nodejs'

import PDFDocument from 'pdfkit'
import { createAdminClient } from '@/lib/supabase/admin'

const COR_CONTABIL = '#0F766E'
const COR_PRIMARY  = '#635BFF'
const COR_DARK     = '#1a1a2e'
const COR_GRAY     = '#6b7280'

function rgbFromHex(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

async function gerarPDFBuffer(
  titulo: string,
  subtitulo: string,
  secoes: { titulo: string; conteudo: string[] }[],
  corPrimaria: string = COR_PRIMARY,
  versao: string = '1.0',
  ano: number = new Date().getFullYear()
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth  = doc.page.width
    const pageHeight = doc.page.height
    const margin     = 50

    const addHeaderFooter = (pageNum: number) => {
      doc.save()
      doc.rect(0, 0, pageWidth, 36).fill(corPrimaria)
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
        .text(`NexCoop — ${titulo}`, margin, 13, { width: pageWidth - margin * 2 - 100, align: 'left' })
      doc.fillColor('white').fontSize(8).font('Helvetica')
        .text(`v${versao} · ${ano}`, pageWidth - margin - 100, 14, { width: 100, align: 'right' })
      doc.moveTo(margin, pageHeight - 30).lineTo(pageWidth - margin, pageHeight - 30)
        .strokeColor('#e5e3dc').lineWidth(0.5).stroke()
      doc.fillColor(COR_GRAY).fontSize(7.5).font('Helvetica')
        .text('NexCoop · nexcoop.com.br', margin, pageHeight - 20, { align: 'left' })
        .text(`Pág. ${pageNum}`, margin, pageHeight - 20, { width: pageWidth - margin * 2, align: 'right' })
      doc.restore()
    }

    let pageNum = 1

    // ── CAPA ──────────────────────────────────────────────────────────────────
    doc.rect(0, 0, pageWidth, pageHeight).fill(corPrimaria)
    doc.fillColor('white').fontSize(36).font('Helvetica-Bold').text('NexCoop', margin, 120)
    doc.fillColor('white').opacity(0.85).fontSize(18).font('Helvetica').text(titulo, margin, 170)
    doc.fillColor('white').opacity(0.65).fontSize(13).font('Helvetica').text(subtitulo, margin, 200)
    doc.fillColor('white').opacity(0.5).fontSize(10).font('Helvetica')
      .text(`Versão ${versao} · ${ano} · nexcoop.com.br`, margin, pageHeight - 80)
    doc.opacity(1)

    // ── SEÇÕES ────────────────────────────────────────────────────────────────
    for (const secao of secoes) {
      doc.addPage()
      pageNum++
      addHeaderFooter(pageNum)
      let y = 55

      doc.rect(margin, y, pageWidth - margin * 2, 32).fill(COR_DARK)
      doc.fillColor('white').fontSize(13).font('Helvetica-Bold')
        .text(secao.titulo, margin + 12, y + 9, { width: pageWidth - margin * 2 - 24 })
      y += 44

      for (const paragrafo of secao.conteudo) {
        if (y > pageHeight - 80) {
          doc.addPage(); pageNum++; addHeaderFooter(pageNum); y = 55
        }

        if (paragrafo.startsWith('##')) {
          y += 8
          doc.fillColor(corPrimaria).fontSize(11).font('Helvetica-Bold')
            .text(paragrafo.replace('## ', ''), margin, y, { width: pageWidth - margin * 2 })
          y += doc.currentLineHeight() + 6
          doc.moveTo(margin, y).lineTo(pageWidth - margin, y)
            .strokeColor('#e5e3dc').lineWidth(0.5).stroke()
          y += 6
        } else if (paragrafo.startsWith('•')) {
          doc.fillColor(corPrimaria).fontSize(10).font('Helvetica-Bold').text('•', margin + 8, y)
          doc.fillColor(COR_DARK).fontSize(10).font('Helvetica')
            .text(paragrafo.replace('• ', ''), margin + 20, y, { width: pageWidth - margin * 2 - 20 })
          y += doc.currentLineHeight() + 4
        } else if (paragrafo.startsWith('⚠')) {
          y += 4
          const boxHeight = 40
          doc.rect(margin, y, pageWidth - margin * 2, boxHeight).fill('#fffbeb')
          doc.rect(margin, y, 3, boxHeight).fill('#f59e0b')
          doc.fillColor('#92400e').fontSize(9).font('Helvetica')
            .text(paragrafo, margin + 12, y + 8, { width: pageWidth - margin * 2 - 20 })
          y += boxHeight + 8
        } else if (paragrafo === '---') {
          y += 6
          doc.moveTo(margin, y).lineTo(pageWidth - margin, y)
            .strokeColor('#e5e3dc').lineWidth(0.5).stroke()
          y += 10
        } else if (paragrafo.trim() !== '') {
          doc.fillColor(COR_DARK).fontSize(10).font('Helvetica')
            .text(paragrafo, margin, y, { width: pageWidth - margin * 2, align: 'justify' })
          y += doc.currentLineHeight() + 6
        }
      }
    }

    doc.end()
  })
}

async function uploadManual(buffer: Buffer, nomeArquivo: string): Promise<string> {
  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from('manuais')
    .upload(nomeArquivo, buffer, { contentType: 'application/pdf', upsert: true })
  if (error) throw new Error(`Erro no upload: ${error.message}`)
  const { data: urlData } = supabase.storage.from('manuais').getPublicUrl(nomeArquivo)
  return urlData.publicUrl
}

async function salvarUrlManual(chave: string, url: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('configuracoes_sistema')
    .update({ valor: url, updated_at: new Date().toISOString() })
    .eq('chave', chave)
  if (error) throw new Error(error.message)
}

// ── MANUAL CONTÁBIL ──────────────────────────────────────────────────────────

export async function gerarManualContabil(): Promise<string> {
  const secoes = [
    {
      titulo: '1. Visão Geral do Módulo Contábil',
      conteudo: [
        'O Módulo Contábil do NexCoop oferece escrituração contábil completa integrada à gestão operacional da cooperativa ou associação.',
        'Diferente de sistemas genéricos, o NexCoop foi construído com os conceitos legais e contábeis do cooperativismo brasileiro como base.',
        '## Funcionalidades incluídas',
        '• Plano de Contas hierárquico configurável (padrão NBC TG 1000)',
        '• Escrituração em partidas dobradas',
        '• Balancete mensal com drill-down',
        '• DRE — Demonstrativo de Resultado do Exercício',
        '• Balanço Patrimonial com verificação de equilíbrio',
        '• Livro Razão por conta e período',
        '• Livro Diário cronológico',
        '• Sobras/Superávit e destinações obrigatórias',
        '• Fechamento de exercício com hash SHA-256',
        '• De/Para entre planos de contas',
        '• Importação de NF-e via XML',
        '• Exportação SPED ECD auxiliar',
        '⚠ Posicionamento: o NexCoop não substitui o sistema contábil do escritório. Ele organiza os dados para que o contador trabalhe com eficiência.',
      ],
    },
    {
      titulo: '2. Perfis de Acesso',
      conteudo: [
        '## Administrador da Organização',
        '• Acesso completo ao módulo contábil',
        '• Configura plano de contas e percentuais de destinação',
        '• Importa NF-e e visualiza todos os relatórios',
        '• Pode fechar o exercício (recomendado que seja feito pelo contador)',
        '• Gerencia o vínculo com o escritório de contabilidade',
        '---',
        '## Contador / Auxiliar Contábil',
        '• Acesso exclusivo à seção CONTÁBIL e ESCRITÓRIO',
        '• Classifica lançamentos financeiros nas contas contábeis',
        '• Consulta relatórios, faz De/Para, exporta SPED ECD',
        '• Fecha o exercício com CRC registrado',
        '• Não vê dados operacionais da organização',
        '---',
        'O contador é vinculado pela organização em Configurações → Contador. Ao inativar, o acesso é removido imediatamente.',
      ],
    },
    {
      titulo: '3. Plano de Contas',
      conteudo: [
        'O plano de contas é a estrutura hierárquica que organiza todas as contas contábeis da organização.',
        '## Como carregar o plano padrão',
        '• Acesse CONTÁBIL → Plano de Contas',
        '• Clique em "+ Carregar Plano Padrão" (cooperativa ou associação)',
        '• O sistema insere automaticamente a estrutura completa',
        '• Use "+ Nova Conta" para adicionar contas específicas',
        '---',
        '## Estrutura do plano (cooperativa)',
        '• 1. ATIVO — Circulante e Não Circulante',
        '• 2. PASSIVO — Circulante e Não Circulante',
        '• 3. PATRIMÔNIO LÍQUIDO — Capital, Reservas (REFAC, Fundo de Reserva), Sobras',
        '• 4. RECEITAS — Ato Cooperativo e Não-Cooperativo',
        '• 5. DESPESAS — Operacionais e Administrativas',
        '---',
        '## Estrutura do plano (associação)',
        '• 1. ATIVO — Circulante e Não Circulante',
        '• 2. PASSIVO — Circulante',
        '• 3. PATRIMÔNIO SOCIAL — Fundo Social, Reservas, Superávit/Déficit',
        '• 4. RECEITAS — Contribuições, Doações, Projetos',
        '• 5. DESPESAS — Administrativas, Projetos',
      ],
    },
    {
      titulo: '4. Escrituração',
      conteudo: [
        'A escrituração classifica cada lançamento financeiro em uma partida dobrada — conta a débito e conta a crédito.',
        '## Fluxo de classificação',
        '• 1. Lançamento registrado no módulo Financeiro',
        '• 2. Aparece na aba "Pendentes" da Escrituração',
        '• 3. Contador seleciona débito e crédito no plano de contas',
        '• 4. Partida gerada e vinculada ao lançamento original',
        '• 5. Relatórios atualizados automaticamente',
        'Lançamentos classificados são imutáveis para fins de auditoria.',
      ],
    },
    {
      titulo: '5. Relatórios Contábeis',
      conteudo: [
        '## Balancete',
        'Saldos por conta no período: saldo anterior, débitos, créditos e saldo atual. Selecione mês e ano no topo da página.',
        '---',
        '## DRE — Demonstrativo de Resultado',
        'Receitas e despesas do exercício com resultado final. Para cooperativas: Sobras ou Perdas. Para associações: Superávit ou Déficit.',
        '---',
        '## Balanço Patrimonial',
        'Posição patrimonial em duas colunas: Ativo × Passivo + Patrimônio Líquido. Banner verde = equilibrado. Banner vermelho = diferença identificada.',
        '---',
        '## Livro Razão',
        'Movimentações de uma conta específica no período, com saldo progressivo linha a linha.',
        '---',
        '## Livro Diário',
        'Registro cronológico e numerado de todos os lançamentos do exercício. Botão "Imprimir" disponível.',
      ],
    },
    {
      titulo: '6. Sobras, REFAC e Fechamento',
      conteudo: [
        '## Cooperativas — Sobras e REFAC',
        '• Fundo de Reserva: mínimo 10% das sobras líquidas (Lei 5.764/71)',
        '• REFAC: Reserva de Assistência Técnica, Educacional e Social',
        '• Sobras distribuíveis: restante após destinações obrigatórias',
        '• Distribuição por cooperado: calculada automaticamente após fechamento',
        '---',
        '## Associações — Superávit e Destinações',
        '• Fundo de Reserva e REFAC são opcionais (conforme estatuto)',
        '• Resultado não é distribuído aos associados',
        '• Superávit é incorporado ao Patrimônio Social',
        '---',
        '## Fechamento de Exercício',
        '⚠ O fechamento é irreversível. Certifique-se de que todos os lançamentos foram classificados antes de prosseguir.',
        '• Gera hash SHA-256 com todos os valores e identificação do responsável',
        '• Registra CRC do contador quando feito pelo contador',
        '• Encerra o exercício — não pode ser reaberto',
      ],
    },
    {
      titulo: '7. De/Para e Exportações',
      conteudo: [
        '## De/Para — Plano de Contas',
        'Resolve o problema de inconsistência entre o plano do NexCoop e o plano do escritório de contabilidade.',
        '• Contador cadastra seu plano uma vez em Escritório → Plano de Contas',
        '• Org mapeia cada conta NexCoop para a conta correspondente do escritório',
        '• Exportações já saem com os códigos do escritório automaticamente',
        '---',
        '## Exportações disponíveis',
        '• SPED ECD (.txt) — arquivo auxiliar para a Receita Federal',
        '• Balancete, DRE, Balanço Patrimonial — PDF/Impressão',
        '• Livro Diário, Livro Razão — PDF/Impressão',
        '⚠ O SPED ECD gerado é auxiliar. Deve ser validado pelo contador no programa SPED do governo antes da entrega oficial.',
      ],
    },
    {
      titulo: '8. NF-e e Portal do Contador',
      conteudo: [
        '## Importação de NF-e',
        '• Acesse CONTÁBIL → NF-e',
        '• Clique em "+ Importar XML(s)" — aceita múltiplos arquivos',
        '• O sistema extrai: emitente, destinatário, valor, ICMS, PIS, COFINS e itens',
        '• Use "Ver" para detalhar, "Ignorar" para notas irrelevantes',
        'Suporta NF-e padrão SEFAZ versão 4.0. NFS-e e CT-e não suportados.',
        '---',
        '## Portal do Contador',
        '• Contador cria conta no NexCoop com e-mail profissional',
        '• Organização convida em Configurações → Contador',
        '• Contador vê apenas seções CONTÁBIL e ESCRITÓRIO',
        '• Inativar remove o acesso imediatamente sem excluir histórico',
        '• Um contador pode atender múltiplas organizações no mesmo login',
      ],
    },
  ]

  const buffer = await gerarPDFBuffer(
    'Manual do Módulo Contábil',
    'Guia completo para administradores e contadores',
    secoes, COR_CONTABIL, '1.0', new Date().getFullYear()
  )
  const url = await uploadManual(buffer, 'manual-contabil.pdf')
  await salvarUrlManual('manual_contabil_url', url)
  return url
}

// ── MANUAL FINANCEIRO ────────────────────────────────────────────────────────

export async function gerarManualFinanceiro(): Promise<string> {
  const secoes = [
    {
      titulo: '1. Visão Geral do Módulo Financeiro',
      conteudo: [
        'O Módulo Financeiro centraliza o controle de entradas e saídas da organização, com categorização, relatórios e integração com o módulo contábil.',
        '## Funcionalidades',
        '• Registro de lançamentos (receitas, despesas e transferências)',
        '• Status de pagamento: pendente, pago, agendado, cancelado',
        '• Filtros por mês, tipo e status',
        '• Vinculação com cooperados',
        '• Integração automática com a Escrituração Contábil',
      ],
    },
    {
      titulo: '2. Registrando Lançamentos',
      conteudo: [
        '## Como registrar uma entrada',
        '• Acesse PRINCIPAL → Financeiro',
        '• Clique em "+ Novo Lançamento"',
        '• Selecione tipo: Receita',
        '• Informe data, valor, descrição e categoria',
        '• Salve — o lançamento aparece automaticamente na Escrituração para classificação contábil',
        '---',
        '## Como registrar uma saída',
        '• Mesmo processo, selecione tipo: Despesa',
        '• Informe o fornecedor ou beneficiário quando aplicável',
        '⚠ Lançamentos registrados no Financeiro são a base da escrituração contábil. Certifique-se de preencher a descrição com clareza para facilitar a classificação pelo contador.',
        '---',
        '## Status dos lançamentos',
        '• Pendente — ainda não pago/recebido',
        '• Pago — quitado',
        '• Agendado — data futura',
        '• Cancelado — estornado ou descartado',
      ],
    },
    {
      titulo: '3. Filtros e Relatórios',
      conteudo: [
        'A tela principal do Financeiro exibe totais calculados sobre os lançamentos filtrados.',
        '## Cards de resumo',
        '• Receitas — total de entradas do período',
        '• Despesas — total de saídas do período',
        '• Saldo — diferença entre receitas e despesas',
        '• Pendentes — valores ainda não quitados',
        '---',
        '## Filtros disponíveis',
        '• Mês/ano de competência',
        '• Tipo (receita, despesa, transferência)',
        '• Status (pendente, pago, agendado, cancelado)',
        '• Busca por descrição',
        'Os totais nos cards refletem apenas os lançamentos visíveis após os filtros.',
      ],
    },
  ]

  const buffer = await gerarPDFBuffer(
    'Manual do Módulo Financeiro',
    'Guia de registro e controle de lançamentos',
    secoes, COR_PRIMARY, '1.0', new Date().getFullYear()
  )
  const url = await uploadManual(buffer, 'manual-financeiro.pdf')
  await salvarUrlManual('manual_financeiro_url', url)
  return url
}

// ── TODOS OS MANUAIS ─────────────────────────────────────────────────────────

export async function gerarTodosManuais(): Promise<Record<string, string>> {
  const urls: Record<string, string> = {}
  urls.contabil  = await gerarManualContabil()
  urls.financeiro = await gerarManualFinanceiro()
  return urls
}
