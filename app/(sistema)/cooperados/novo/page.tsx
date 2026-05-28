async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  if (!form.nome_completo.trim()) {
    setErro('Nome completo é obrigatório.')
    setAbaAtiva('pessoal')
    return
  }
  setSalvando(true)
  setErro('')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.push('/login'); return }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  if (!usuario?.organizacao_id) {
    setErro('Usuário sem organização vinculada.')
    setSalvando(false)
    return
  }

  // ── GUARD DE LIMITE ──────────────────────────────────────
  const { verificarLimiteFiliados } = await import('@/lib/assinatura')
  const limite = await verificarLimiteFiliados(usuario.organizacao_id)
  if (!limite.permitido) {
    setLimiteInfo(limite)
    setSalvando(false)
    return
  }
  // ────────────────────────────────────────────────────────

  const payload = { /* ... igual ao original ... */ }

  const { data, error } = await supabase
    .from('cooperados')
    .insert(payload)
    .select()
    .single()

  if (error) {
    setErro(`Erro ao salvar: ${error.message}`)
    setSalvando(false)
    return
  }

  router.push(`/cooperados/${data.id}`)
}