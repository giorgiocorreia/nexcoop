// Termo do "membro" nas telas de Mensalidades.
// Só a associação difere: cooperativa e central mantêm exatamente os rótulos
// atuais ("Filiado"/"filiados"/"cooperado"), para não alterar nada nessas orgs.
// Função pura — sem I/O, NÃO leva 'use server'.
export function termoMensalidade(tipoOrg?: string | null) {
  const assoc = tipoOrg === 'associacao'
  return {
    Singular: assoc ? 'Associado'  : 'Filiado',    // início de frase / cabeçalho
    plural:   assoc ? 'associados' : 'filiados',    // meio de frase
    membro:   assoc ? 'associado'  : 'cooperado',   // "Histórico do X"
  }
}
