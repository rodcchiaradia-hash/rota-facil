import { useState } from 'react'
import { lerMinhasRotas, salvarMinhasRotas, salvarDia } from './dia.js'
import { empresasDoPerfil, formatarReais } from './formato.js'
import { FormRota } from './MinhasRotas.jsx'

// Começo do dia: para qual empresa e qual rota você vai rodar hoje.
export default function InicioDia({ usuario, perfil, onComecou, onVoltar }) {
  const [minhas, setMinhas] = useState(() => lerMinhasRotas(usuario.id))
  const [nova, setNova] = useState(false)
  const empresas = empresasDoPerfil(perfil)

  function comecar(rota) {
    salvarDia(usuario.id, {
      inicio: Date.now(),
      empresa: rota.empresa,
      rotaNumero: rota.numero,
      rotaId: rota.id || null,
      valor: rota.valor ?? null,
      prazo: rota.prazo ?? null,
    })
    onComecou()
  }

  if (nova) {
    return (
      <FormRota inicial={{ empresa: empresas[0] || '', numero: '', regiao: '', valor: '', prazo: '', risco: '' }}
        empresas={empresas} textoBotao="Salvar e começar o dia" onCancelar={() => setNova(false)}
        onSalvar={(rota) => {
          const salva = { ...rota, id: `r${Date.now()}` }
          const lista = [...minhas, salva]
          salvarMinhasRotas(usuario.id, lista)
          setMinhas(lista)
          comecar(salva)
        }} />
    )
  }

  return (
    <main className="tela">
      <header className="topo">
        <button className="botao-texto" onClick={onVoltar}>‹ Voltar</button>
        <strong>Começar o dia</strong>
        <span />
      </header>
      <p className="dica">Qual rota você vai fazer hoje?</p>
      <ul className="lista">
        {minhas.map((r) => (
          <li key={r.id} className="clicavel-li" onClick={() => comecar(r)}>
            <span className="conteudo">
              <strong>{r.empresa} · Rota {r.numero}</strong>
              <span className="dica">{[r.regiao, r.valor ? formatarReais(r.valor) : ''].filter(Boolean).join(' · ')}</span>
            </span>
            <span className="seta">›</span>
          </li>
        ))}
      </ul>
      <button className="botao principal" onClick={() => setNova(true)}>+ Outra rota</button>
    </main>
  )
}
