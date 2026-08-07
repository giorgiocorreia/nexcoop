'use client'

/**
 * Hub Contábil de NF-e — layout e abas próprios.
 * Não usa FiscalHubClient da comercialização.
 */

import { useEffect, useState } from 'react'
import ContabilNfeSaidas from './ContabilNfeSaidas'
import ContabilNfeEntradas from './ContabilNfeEntradas'
import ContabilNfeDevolucoes from './ContabilNfeDevolucoes'
import {
  listarNfeSaidaContabil,
  listarEntradasContabil,
  listarDevolucoesContabil,
} from './actions'
import { PageLayout, MODULO_CONTABIL } from '@/components/nexcoop/ui'
import { Tabs } from '@/components/comercializacao/ui/Tabs'

type Aba = 'saidas' | 'entradas' | 'devolucoes'

export default function ContabilNfeHub({ orgId }: { orgId: string }) {
  const [aba, setAba] = useState<Aba>('saidas')
  const [badges, setBadges] = useState({ saidas: 0, entradas: 0, devolucoes: 0 })

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const [saidas, entradas, devolucoes] = await Promise.all([
          listarNfeSaidaContabil(),
          listarEntradasContabil(),
          listarDevolucoesContabil(orgId),
        ])
        if (cancelado) return
        setBadges({
          saidas: Array.isArray(saidas) ? saidas.length : 0,
          entradas: Array.isArray(entradas) ? entradas.length : 0,
          devolucoes: Array.isArray(devolucoes) ? devolucoes.length : 0,
        })
      } catch {
        /* badges opcionais */
      }
    })()
    return () => {
      cancelado = true
    }
  }, [orgId])

  const abas = [
    {
      id: 'saidas' as const,
      label: 'NF-e Saídas',
      icon: 'ti-arrow-up-right',
      badge: badges.saidas,
    },
    {
      id: 'entradas' as const,
      label: 'NF-e Entradas',
      icon: 'ti-arrow-down-left',
      badge: badges.entradas,
    },
    {
      id: 'devolucoes' as const,
      label: 'Devoluções',
      icon: 'ti-refresh-alert',
      badge: badges.devolucoes,
    },
  ]

  return (
    <PageLayout
      titulo="NF-e — Notas Fiscais"
      subtitulo="Consulta contábil das notas emitidas"
      icone="ti-file-invoice"
      modulo={MODULO_CONTABIL}
      breadcrumb={[{ label: 'NF-e' }]}
      fullHeight
    >
      <Tabs tabs={abas} ativa={aba} onChange={id => setAba(id as Aba)} />

      {aba === 'saidas' && <ContabilNfeSaidas />}
      {aba === 'entradas' && <ContabilNfeEntradas />}
      {aba === 'devolucoes' && <ContabilNfeDevolucoes orgId={orgId} />}
    </PageLayout>
  )
}
