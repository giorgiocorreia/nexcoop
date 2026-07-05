'use client'

import { useEffect, useRef, useState } from 'react'
import {
  getPlanoEscritorio, criarContaEscritorio,
  atualizarContaEscritorio, removerContaEscritorio,
} from '@/lib/parceiros/planoEscritorioActions'
import { PageLayout, MODULO_ESCRITORIO, COM_C } from '@/components/nexcoop/ui'

const TIPOS = ['ATIVO', 'PASSIVO', 'PATRIMONIO_LIQUIDO', 'RECEITA', 'DESPESA']
const TIPO_LABEL: Record<string, string> = {
  ATIVO: 'Ativo', PASSIVO: 'Passivo',
  PATRIMONIO_LIQUIDO: 'Patrimônio Líquido',
  RECEITA: 'Receita', DESPESA: 'Despesa',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc',
  borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
}

export default function PlanoEscritorioClient({ empresaId }: { empresaId: string }) {
  const [contas, setContas] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('ATIVO')
  const [nivel, setNivel] = useState(1)
  const [aceitaLancamento, setAceitaLancamento] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [busca, setBusca] = useState('')
  const [importando, setImportando] = useState(false)
  const [resultadoImportacao, setResultadoImportacao] = useState<string | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getPlanoEscritorio(empresaId).then(setContas)
  }, [empresaId])

  function abrirModal(conta?: any) {
    if (conta) {
      setEditando(conta)
      setCodigo(conta.codigo); setNome(conta.nome); setTipo(conta.tipo)
      setNivel(conta.nivel); setAceitaLancamento(conta.aceita_lancamento)
    } else {
      setEditando(null)
      setCodigo(''); setNome(''); setTipo('ATIVO'); setNivel(1); setAceitaLancamento(true)
    }
    setErro(''); setModal(true)
  }

  async function handleSalvar() {
    if (!codigo || !nome) { setErro('Código e nome são obrigatórios.'); return }
    setSalvando(true); setErro('')
    try {
      if (editando) {
        await atualizarContaEscritorio(editando.id, { codigo, nome, tipo, aceita_lancamento: aceitaLancamento })
      } else {
        await criarContaEscritorio({ empresa_id: empresaId, codigo, nome, tipo, nivel, aceita_lancamento: aceitaLancamento })
      }
      setContas(await getPlanoEscritorio(empresaId))
      setSucesso(editando ? 'Conta atualizada!' : 'Conta criada!')
      setTimeout(() => setSucesso(''), 3000)
      setModal(false)
    } catch (e: any) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  async function handleRemover(id: string) {
    await removerContaEscritorio(id)
    setContas(c => c.filter(x => x.id !== id))
  }

  async function handleImportarCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setResultadoImportacao(null)
    const text = await file.text()
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length < 2) {
      setImportando(false)
      setResultadoImportacao('Arquivo vazio ou sem dados além do cabeçalho.')
      if (csvInputRef.current) csvInputRef.current.value = ''
      return
    }
    const dataLines = lines.slice(1)
    let importadas = 0
    const erros: string[] = []
    for (let i = 0; i < dataLines.length; i++) {
      const parts = dataLines[i].split(',')
      const codigoRaw = parts[0]?.trim() ?? ''
      const nomeRaw   = parts[1]?.trim() ?? ''
      const tipoRaw   = parts[2]?.trim() ?? ''
      const nivelRaw  = parts[3]?.trim() ?? '1'
      const aceitaRaw = parts[4]?.trim() ?? 'false'
      if (!codigoRaw || !nomeRaw) { erros.push(`Linha ${i + 2}: código e nome são obrigatórios.`); continue }
      if (!TIPOS.includes(tipoRaw)) { erros.push(`Linha ${i + 2}: tipo "${tipoRaw}" inválido.`); continue }
      const nivelNum = parseInt(nivelRaw, 10)
      if (isNaN(nivelNum) || nivelNum < 1 || nivelNum > 5) { erros.push(`Linha ${i + 2}: nível "${nivelRaw}" inválido (1–5).`); continue }
      try {
        await criarContaEscritorio({ empresa_id: empresaId, codigo: codigoRaw, nome: nomeRaw, tipo: tipoRaw, nivel: nivelNum, aceita_lancamento: aceitaRaw.toLowerCase() === 'true' })
        importadas++
      } catch (err: any) {
        erros.push(`Linha ${i + 2} (${codigoRaw}): ${err.message}`)
      }
    }
    setContas(await getPlanoEscritorio(empresaId))
    setImportando(false)
    if (csvInputRef.current) csvInputRef.current.value = ''
    const errMsg = erros.length > 0 ? ` ${erros.length} erro${erros.length !== 1 ? 's' : ''}.` : ''
    setResultadoImportacao(`${importadas} conta${importadas !== 1 ? 's' : ''} importada${importadas !== 1 ? 's' : ''} com sucesso.${errMsg}`)
  }

  const contasFiltradas = contas.filter(c =>
    c.codigo.includes(busca) || c.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <PageLayout
      titulo="Plano de Contas do Escritório"
      subtitulo="Cadastre os códigos do seu sistema contábil para usar no De/Para com as organizações clientes"
      icone="ti-list-numbers"
      modulo={MODULO_ESCRITORIO}
      breadcrumb={[{ label: 'Plano de Contas' }]}
      acoes={
        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportarCSV} />
          <button onClick={() => csvInputRef.current?.click()} disabled={importando}
            style={{ padding: '9px 18px', border: `1px solid ${COM_C.borda}`, background: '#fff', color: COM_C.txt, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: importando ? 'not-allowed' : 'pointer' }}>
            {importando ? 'Importando...' : '↑ Importar CSV'}
          </button>
          <button onClick={() => abrirModal()}
            style={{ padding: '9px 18px', background: COM_C.verde, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova Conta
          </button>
        </div>
      }
    >
      <div style={{ maxWidth: 900 }}>

      {sucesso && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', margin: '16px 0', color: '#166534', fontSize: 13 }}>
          {sucesso}
        </div>
      )}

      {resultadoImportacao && (
        <div style={{ background: resultadoImportacao.includes('erro') ? '#fffbeb' : '#dcfce7', border: `1px solid ${resultadoImportacao.includes('erro') ? '#f59e0b' : '#86efac'}`, borderRadius: 8, padding: '10px 16px', margin: '16px 0', color: resultadoImportacao.includes('erro') ? '#92400e' : '#166534', fontSize: 13 }}>
          {resultadoImportacao}
        </div>
      )}

      <input value={busca} onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por código ou nome..."
        style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, marginBottom: 16, marginTop: 16, boxSizing: 'border-box' }} />

      {contasFiltradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', color: '#6b7280' }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>Nenhuma conta cadastrada ainda.</p>
          <p style={{ fontSize: 12 }}>
            Cadastre os códigos do plano de contas do seu sistema contábil.
            Eles serão usados no De/Para com as organizações clientes.
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a1a2e' }}>
                {['Código', 'Nome', 'Tipo', 'Lançamento', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#fff', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contasFiltradas.map((conta, i) => (
                <tr key={conta.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8f7f4' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: COM_C.verde }}>{conta.codigo}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>{conta.nome}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280' }}>{TIPO_LABEL[conta.tipo] ?? conta.tipo}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                      background: conta.aceita_lancamento ? '#dcfce7' : '#f3f4f6',
                      color: conta.aceita_lancamento ? '#166534' : '#6b7280',
                    }}>
                      {conta.aceita_lancamento ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => abrirModal(conta)}
                        style={{ padding: '5px 12px', background: '#f8f7f4', border: '1px solid #e5e3dc', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                        Editar
                      </button>
                      <button onClick={() => handleRemover(conta.id)}
                        style={{ padding: '5px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 11, color: '#dc2626', cursor: 'pointer' }}>
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 460, maxWidth: '95vw' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
              {editando ? 'Editar Conta' : 'Nova Conta'}
            </h2>
            {erro && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', marginBottom: 14, color: '#dc2626', fontSize: 12 }}>
                {erro}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Código *</label>
                  <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="1.1.01" style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nome *</label>
                  <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Caixa" style={inp} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Tipo</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)} style={inp}>
                    {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nível</label>
                  <input type="number" min={1} max={5} value={nivel}
                    onChange={e => setNivel(Number(e.target.value))} style={inp} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={aceitaLancamento}
                  onChange={e => setAceitaLancamento(e.target.checked)}
                  style={{ width: 15, height: 15 }} />
                Aceita lançamentos diretos
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setModal(false)}
                style={{ padding: '9px 18px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSalvar} disabled={salvando}
                style={{ padding: '9px 18px', background: COM_C.verde, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PageLayout>
  )
}
