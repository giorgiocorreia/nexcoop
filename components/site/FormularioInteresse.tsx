'use client'

import { useState } from 'react'
import type { SiteTema } from '@/lib/site/site-utils'
import { validarInteresse } from '@/lib/site/site-utils'

// Formulário "Quero ser cooperado" — client component só pelo estado de
// envio/feedback; a validação real (fonte da verdade) roda no server, na
// route handler app/api/site/[slug]/interesse. `honeypot` é um campo
// escondido via CSS (não via `display:none`, pra não ser ignorado por bots
// que respeitam isso) que humano nenhum preenche.
export default function FormularioInteresse({ slug, tema }: { slug: string; tema: SiteTema }) {
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    const form = e.currentTarget
    const dados = {
      nome:      (form.elements.namedItem('nome') as HTMLInputElement).value,
      telefone:  (form.elements.namedItem('telefone') as HTMLInputElement).value,
      email:     (form.elements.namedItem('email') as HTMLInputElement).value,
      perfil:    (form.elements.namedItem('perfil') as HTMLSelectElement).value,
      mensagem:  (form.elements.namedItem('mensagem') as HTMLTextAreaElement).value,
      honeypot:  (form.elements.namedItem('site_url') as HTMLInputElement).value,
    }

    const validacao = validarInteresse(dados)
    if (!validacao.ok) {
      setErro(validacao.erro ?? 'Dados inválidos.')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch(`/api/site/${slug}/interesse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dados, origem: 'quero-ser-cooperado' }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setErro(json.error ?? 'Não foi possível enviar. Tente novamente.')
        setEnviando(false)
        return
      }
      setEnviado(true)
    } catch {
      setErro('Falha de conexão. Tente novamente em instantes.')
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Recebemos seu interesse!</h3>
        <p className="text-sm text-gray-500">
          Em breve nossa equipe entrará em contato pelo telefone ou e-mail informado.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Quero ser cooperado</h3>
      <p className="text-sm text-gray-500 -mt-2">Preencha seus dados e entraremos em contato em até 2 dias úteis.</p>

      {/* Honeypot — invisível via posição fora da tela, não display:none */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }} aria-hidden="true">
        <label htmlFor="site_url">Não preencher</label>
        <input type="text" id="site_url" name="site_url" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Nome completo *" name="nome" placeholder="Seu nome completo" required />
        <Campo label="Telefone / WhatsApp *" name="telefone" type="tel" placeholder="(00) 0 0000-0000" required />
      </div>
      <Campo label="E-mail" name="email" type="email" placeholder="seu@email.com" />
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1">Perfil de interesse</label>
        <select name="perfil" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Selecione...</option>
          <option>Agricultor familiar individual</option>
          <option>Grupo / Associação produtiva</option>
          <option>Pessoa jurídica / Empresa</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1">Mensagem / Observações</label>
        <textarea
          name="mensagem"
          rows={3}
          placeholder="Conte brevemente sobre sua propriedade ou dúvidas sobre a adesão..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {erro && <p className="text-sm text-red-600 font-medium">{erro}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-full py-3 text-sm font-extrabold text-white disabled:opacity-60"
        style={{ backgroundColor: tema.corSecundaria }}
      >
        {enviando ? 'Enviando...' : 'Enviar manifestação de interesse →'}
      </button>
      <p className="text-[11px] text-gray-400 text-center">
        Seus dados são usados apenas para contato de adesão. Nenhuma informação é compartilhada com terceiros.
      </p>
    </form>
  )
}

function Campo({
  label,
  name,
  type = 'text',
  placeholder,
  required,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
    </div>
  )
}
