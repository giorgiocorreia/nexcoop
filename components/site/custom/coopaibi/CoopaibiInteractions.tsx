'use client'

import { useEffect } from 'react'

// Reimplementação em React dos <script> inline do site original da COOPAIBI
// (removidos na extração — ver components/site/custom/coopaibi/content/*).
// O HTML injetado via dangerouslySetInnerHTML preserva os atributos
// onclick="..." originais (o navegador os registra normalmente, mesmo
// vindos de innerHTML) — por isso basta expor as mesmas funções em
// `window` com o mesmo nome/assinatura que o HTML já espera.
//
// Tradução (idioma PT/EN, translate.php): NÃO portada — o seletor de
// idioma foi removido do HTML extraído. Pendência documentada no relatório
// da tarefa.
export type CoopaibiPage =
  | 'index'
  | 'acoes'
  | 'cooperado'
  | 'parceiro'
  | 'relatorio'
  | 'homens-de-barro'
  | 'loja'
  | 'videos'

export default function CoopaibiInteractions({ page, slug }: { page: CoopaibiPage; slug: string }) {
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>

    // ── Menu mobile (todas as páginas) ──────────────────────────────
    w.toggleMenu = () => {
      document.getElementById('nav-mobile')?.classList.toggle('open')
    }
    const navLinks = document.querySelectorAll('.nav-mobile a')
    const fecharMenu = () => document.getElementById('nav-mobile')?.classList.remove('open')
    navLinks.forEach((a) => a.addEventListener('click', fecharMenu))
    // Páginas dinâmicas (Loja/Vídeos, ver CoopaibiChrome.tsx) usam JSX puro
    // em vez de onclick="toggleMenu()" no HTML — o botão leva um atributo
    // marcador e o listener é ligado aqui.
    const toggleBtn = document.querySelector<HTMLButtonElement>('[data-coopaibi-toggle-menu]')
    const onToggleClick = () => (w.toggleMenu as () => void)()
    toggleBtn?.addEventListener('click', onToggleClick)

    // ── Reveal on scroll (index/acoes/cooperado/parceiro) ───────────
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible')
        })
      },
      { threshold: 0.1 }
    )
    document
      .querySelectorAll(
        '.sist-card,.num-card,.noticia-card,.cota-card,.imp-block,.step-card,.tipo-card,.req-card,.prog-card,.palestra-item,.acao-card,.fw-item'
      )
      .forEach((el) => obs.observe(el))

    // ── Ações: filtro de categorias ──────────────────────────────────
    if (page === 'acoes') {
      w.filtrar = (btn: HTMLElement, cat: string) => {
        document.querySelectorAll('.filtro-btn').forEach((b) => b.classList.remove('ativo'))
        btn.classList.add('ativo')
        const cards = document.querySelectorAll<HTMLElement>('#acoes-grid .acao-card, #acoes-grid .acao-placeholder')
        const destaque = document.querySelector<HTMLElement>('.destaque-section')
        if (cat === 'todos') {
          cards.forEach((c) => (c.style.display = ''))
          if (destaque) destaque.style.display = ''
        } else if (cat === 'evento') {
          if (destaque) destaque.style.display = ''
          cards.forEach((c) => {
            c.style.display = c.dataset.cat === 'evento' || c.dataset.cat === 'placeholder' ? '' : 'none'
          })
        } else {
          if (destaque) destaque.style.display = cat === 'evento' ? '' : 'none'
          cards.forEach((c) => {
            if (c.dataset.cat === 'placeholder') { c.style.display = ''; return }
            c.style.display = c.dataset.cat === cat ? '' : 'none'
          })
        }
      }
    }

    // ── Cooperado: envio do formulário ───────────────────────────────
    if (page === 'cooperado') {
      w.enviarForm = () => {
        const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null)?.value.trim() ?? ''
        const nome = val('f-nome')
        const tel = val('f-tel')
        const local = val('f-local')
        const perfil = val('f-perfil')
        const termo = (document.getElementById('f-termo') as HTMLInputElement | null)?.checked
        if (!nome || !tel || !local || !perfil) {
          alert('Por favor, preencha todos os campos obrigatórios (*).')
          return
        }
        if (!termo) {
          alert('Por favor, aceite os termos de adesão para continuar.')
          return
        }
        const btn = document.querySelector<HTMLButtonElement>('.btn-enviar')
        if (btn) { btn.disabled = true; btn.textContent = 'Enviando...' }
        fetch(`/api/site/${slug}/interesse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome,
            telefone: tel,
            email: val('f-email'),
            cpf: val('f-cpf'),
            localidade: local,
            area: val('f-area'),
            perfil,
            atividade: val('f-ativ'),
            mensagem: val('f-msg'),
            origem: 'quero-ser-cooperado-coopaibi',
          }),
        })
          .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
          .then(({ ok, j }) => {
            if (ok && !j.error) {
              const box = document.getElementById('success-box')
              box?.classList.add('show')
              if (btn) { btn.style.background = '#888'; btn.style.cursor = 'default'; btn.textContent = '✓ Enviado com sucesso!' }
              box?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } else {
              alert('Erro: ' + (j.error ?? 'não foi possível enviar.'))
              if (btn) { btn.disabled = false; btn.textContent = 'Enviar manifestação de interesse →' }
            }
          })
          .catch(() => {
            alert('Falha de conexão. Tente novamente ou entre em contato pelo telefone.')
            if (btn) { btn.disabled = false; btn.textContent = 'Enviar manifestação de interesse →' }
          })
      }
    }

    // ── Parceiro: seleção de cota + envio ────────────────────────────
    if (page === 'parceiro') {
      w.selecionarCota = (cota: string) => {
        setTimeout(() => {
          const sel = document.getElementById('p-cota') as HTMLSelectElement | null
          if (!sel) return
          const prefixo = cota.split(' —')[0]
          for (let i = 0; i < sel.options.length; i++) {
            if (sel.options[i].text.indexOf(prefixo) !== -1) { sel.selectedIndex = i; break }
          }
        }, 300)
      }
      w.enviarParceria = () => {
        const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null)?.value.trim() ?? ''
        const empresa = val('p-empresa')
        const contato = val('p-contato')
        const tel = val('p-tel')
        const email = val('p-email')
        const cota = val('p-cota')
        const termo = (document.getElementById('p-termo') as HTMLInputElement | null)?.checked
        if (!empresa || !contato || !tel || !email || !cota) {
          alert('Por favor, preencha todos os campos obrigatórios (*).')
          return
        }
        if (!termo) {
          alert('Por favor, autorize o contato para continuar.')
          return
        }
        const btn = document.querySelector<HTMLButtonElement>('.btn-enviar-parc')
        if (btn) { btn.disabled = true; btn.textContent = 'Enviando...' }
        fetch(`/api/site/${slug}/interesse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: contato,
            telefone: tel,
            email,
            empresa,
            cargo: val('p-cargo'),
            segmento: val('p-segmento'),
            cota,
            mensagem: val('p-msg'),
            perfil: `Parceria — ${cota}`,
            origem: 'seja-parceiro-coopaibi',
          }),
        })
          .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
          .then(({ ok, j }) => {
            if (ok && !j.error) {
              const box = document.getElementById('success-parc')
              box?.classList.add('show')
              if (btn) { btn.style.background = '#888'; btn.style.cursor = 'default'; btn.textContent = '✓ Enviado com sucesso!' }
              box?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } else {
              alert('Erro: ' + (j.error ?? 'não foi possível enviar.'))
              if (btn) { btn.disabled = false; btn.textContent = 'Enviar proposta de parceria →' }
            }
          })
          .catch(() => {
            alert('Falha de conexão. Tente novamente ou entre em contato diretamente.')
            if (btn) { btn.disabled = false; btn.textContent = 'Enviar proposta de parceria →' }
          })
      }
    }

    // ── Homens de Barro: partículas de brasa + reveal ────────────────
    let emberEls: HTMLElement[] = []
    if (page === 'homens-de-barro') {
      const container = document.getElementById('embers')
      if (container) {
        for (let i = 0; i < 25; i++) {
          const e = document.createElement('div')
          e.className = 'ember'
          const left = Math.random() * 100
          const dur = 4 + Math.random() * 6
          const delay = Math.random() * 8
          const drift = (Math.random() - 0.5) * 120
          const size = 1 + Math.random() * 3
          e.style.cssText = `left:${left}%;--dur:${dur}s;--delay:${delay}s;--drift:${drift}px;width:${size}px;height:${size}px;background:hsl(${20 + Math.random() * 20},90%,${50 + Math.random() * 20}%);`
          container.appendChild(e)
          emberEls.push(e)
        }
      }
      const reveals = document.querySelectorAll('.reveal')
      const revealObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
              setTimeout(() => entry.target.classList.add('visible'), i * 80)
              revealObs.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.12 }
      )
      reveals.forEach((el) => revealObs.observe(el))
      return () => {
        revealObs.disconnect()
        emberEls.forEach((e) => e.remove())
      }
    }

    return () => {
      obs.disconnect()
      navLinks.forEach((a) => a.removeEventListener('click', fecharMenu))
      toggleBtn?.removeEventListener('click', onToggleClick)
    }
  }, [page, slug])

  return null
}
