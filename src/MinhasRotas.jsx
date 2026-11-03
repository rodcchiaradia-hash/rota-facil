import { useState } from 'react'
import { lerMinhasRotas, salvarMinhasRotas } from './dia.js'
import { empresasDoPerfil, formatarReais, lerReais } from './formato.js'

const VAZIA = { empresa: '', numero: '', regiao: '', valor: '', prazo: '', risco: '' }

// Rotas que o entregador costuma fazer, com valor pago e prazo de pagamento.
export default function MinhasRotas({ usuario, perfil, onVoltar }) {
  const [rotas, setRotas] = useState(() => lerMinhasRotas(usuario.id))
  const [editando, setEditando] = useState(null)

  function salvar(rota) {
    const lista = rota.id ? rotas.map((r) => (r.id === rota.id ? rota : r)) : [...rotas, { ...rota, id: `r${Date.now()}` }]
    salvarMinhasRotas(usuario.id, lista)
    setRotas(lista)
    setEditando(null)
  }

  function apagar(rota) {
    if (!confirm(`Apagar a rota ${rota.numero} (${rota.empresa})?`)) return
    const lista = rotas.filter((r) => r.id !== rota.id)
    salvarMinhasRotas(usuario.id, lista)
    setRotas(lista)
    setEditando(null)
  }

  if (editando) {
    return <FormRota inicial={editando} empresas={empresasDoPerfil(perfil)} onSalvar={salvar}
      onApagar={editando.id ? () => apagar(editando) : null} onCancelar={() => setEditando(null)} />
  }

  return (
    <main className="tela">
      <header className="topo">
        <button className="botao-texto" onClick={onVoltar}>‹ Voltar</button>
        <strong>Minhas rotas</strong>
        <span />
      </header>
      <p className="dica">Cadastre as rotas que você costuma pegar. O valor e o prazo entram no financeiro.</p>
      {!rotas.length && <p className="dica centro">Nenhuma rota cadastrada ainda.</p>}
      <ul className="lista">
        {rotas.map((r) => (
          <li key={r.id} onClick={() => setEditando(r)} className="clicavel-li">
            <span className="conteudo">
              <strong>{r.empresa} · Rota {r.numero}</strong>
              <span className="dica">
                {[r.regiao, r.valor ? formatarReais(r.valor) : '', r.prazo ? `paga em ${r.prazo} dias` : ''].filter(Boolean).join(' · ')}
              </span>
              {r.risco && <span className="risco">🔒 {r.risco}</span>}
            </span>
            <span className="seta">›</span>
          </li>
        ))}
      </ul>
      <button className="botao principal" onClick={() => setEditando({ ...VAZIA, empresa: empresasDoPerfil(perfil)[0] || '' })}>+ Nova rota</button>
    </main>
  )
}

export function FormRota({ inicial, empresas, onSalvar, onApagar, onCancelar, textoBotao = 'Salvar rota' }) {
  const [rota, setRota] = useState({ ...inicial, valor: inicial.valor ? formatarReais(inicial.valor, false) : '' })
  const [erro, setErro] = useState('')
  const mudar = (campo) => (e) => setRota((r) => ({ ...r, [campo]: e.target.value }))

  function enviar(e) {
    e.preventDefault()
    if (!rota.empresa) return setErro('Escolha a empresa.')
    if (!rota.numero.trim()) return setErro('Digite o número ou nome da rota.')
    onSalvar({ ...rota, numero: rota.numero.trim(), valor: lerReais(rota.valor), prazo: rota.prazo ? Number(rota.prazo) : null })
  }

  return (
    <main className="tela">
      <header className="topo">
        <button className="botao-texto" onClick={onCancelar}>‹ Voltar</button>
        <strong>{inicial.id ? 'Editar rota' : 'Nova rota'}</strong>
        <span />
      </header>
      <form className="cartao" onSubmit={enviar}>
        <strong>Empresa</strong>
        <div className="opcoes">
          {empresas.map((nome) => (
            <button key={nome} type="button" className={rota.empresa === nome ? 'ativa' : ''} onClick={() => setRota((r) => ({ ...r, empresa: nome }))}>{nome}</button>
          ))}
        </div>
        <label>Número ou nome da rota
          <input value={rota.numero} onChange={mudar('numero')} placeholder="Ex.: 1234" />
        </label>
        <label>Região <span className="opcional">(opcional)</span>
          <input value={rota.regiao} onChange={mudar('regiao')} placeholder="Ex.: Buritis e Estoril" />
        </label>
        <div className="linha-dupla">
          <label>Valor da rota (R$)
            <input value={rota.valor} onChange={mudar('valor')} inputMode="decimal" placeholder="Ex.: 180,00" />
          </label>
          <label>Paga em (dias)
            <input value={rota.prazo ?? ''} onChange={(e) => setRota((r) => ({ ...r, prazo: e.target.value.replace(/\D/g, '').slice(0, 3) }))} inputMode="numeric" placeholder="Ex.: 7" />
          </label>
        </div>
        <label>Observações de risco <span className="opcional">(só você vê)</span>
          <textarea rows={2} value={rota.risco} onChange={mudar('risco')} placeholder="Ex.: evitar rua X depois das 18h" />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button className="botao principal">{textoBotao}</button>
        {onApagar && <button type="button" className="botao-texto perigo" onClick={onApagar}>Apagar rota</button>}
      </form>
    </main>
  )
}
