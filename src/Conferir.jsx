import { useState } from 'react'
import { lerPacotes, lerEsperado, salvarEsperado } from './pacotes.js'

// Passo 2: compara quantos pacotes saíram da base com quantos foram escaneados.
export default function Conferir({ usuario, onVoltar, onEscanear }) {
  const pacotes = lerPacotes(usuario.id)
  const [esperado, setEsperado] = useState(() => lerEsperado(usuario.id))
  const [digitado, setDigitado] = useState(() => (esperado ? String(esperado) : ''))

  const total = pacotes.length
  const semEndereco = pacotes.filter((p) => !p.endereco)
  const diferenca = esperado - total

  function confirmar(e) {
    e.preventDefault()
    const n = parseInt(digitado, 10)
    if (!n || n < 1) return
    salvarEsperado(usuario.id, n)
    setEsperado(n)
  }

  function mudarQuantidade(delta) {
    setDigitado(String(Math.max(1, (parseInt(digitado, 10) || 0) + delta)))
  }

  let situacao
  if (!esperado) situacao = null
  else if (diferenca > 0)
    situacao = { tipo: 'falta', titulo: diferenca === 1 ? "Falta 1 pacote" : `Faltam ${diferenca} pacotes`,
      texto: 'Procure no carro e na base e escaneie os que faltam antes de sair.' }
  else if (diferenca < 0)
    situacao = { tipo: 'sobra', titulo: `${-diferenca} a mais do que você pegou`,
      texto: 'Confira se a quantidade está certa ou se algum pacote foi escaneado por engano.' }
  else if (semEndereco.length)
    situacao = { tipo: 'sobra', titulo: 'Quantidade certa, mas falta endereço',
      texto: `${semEndereco.length} ${semEndereco.length === 1 ? 'pacote está' : 'pacotes estão'} sem endereço. Complete antes de montar a rota.` }
  else situacao = { tipo: 'ok', titulo: 'Tudo certo!', texto: `Todos os ${total} pacotes escaneados e com endereço.` }

  return (
    <main className="tela">
      <header className="topo">
        <button className="botao-texto" onClick={onVoltar}>‹ Voltar</button>
        <strong>Passo 2 · Conferência</strong>
        <span />
      </header>

      <form className="cartao" onSubmit={confirmar}>
        <label htmlFor="quantidade">Quantos pacotes você pegou na base?</label>
        <div className="seletor">
          <button type="button" className="botao secundario" onClick={() => mudarQuantidade(-1)} aria-label="Menos um">−</button>
          <input id="quantidade" value={digitado} inputMode="numeric" placeholder="0"
            onChange={(e) => setDigitado(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <button type="button" className="botao secundario" onClick={() => mudarQuantidade(1)} aria-label="Mais um">+</button>
        </div>
        <button className="botao principal" disabled={!parseInt(digitado, 10) || parseInt(digitado, 10) === esperado}>
          {esperado ? 'Atualizar quantidade' : 'Conferir'}
        </button>
      </form>

      {esperado > 0 && (
        <section className="placar">
          <div><span className="numero-grande">{total}</span><span>escaneados</span></div>
          <div className="placar-de">de</div>
          <div><span className="numero-grande">{esperado}</span><span>que você pegou</span></div>
        </section>
      )}

      {situacao && (
        <section className={`resultado ${situacao.tipo}`}>
          <strong>{situacao.titulo}</strong>
          <p>{situacao.texto}</p>
        </section>
      )}

      {situacao && situacao.tipo !== 'ok' && (
        <button className="botao principal grande" onClick={onEscanear}>
          {diferenca > 0 ? 'Escanear os que faltam' : 'Ver lista de pacotes'}
        </button>
      )}

      {semEndereco.length > 0 && (
        <section className="cartao">
          <strong>Sem endereço</strong>
          <ul className="lista-simples">
            {semEndereco.map((p) => <li key={p.id || p.codigo}>{p.codigo}</li>)}
          </ul>
          <p className="dica">Toque em "Ver lista de pacotes" e depois em "Completar endereço" em cada um.</p>
        </section>
      )}

      {situacao?.tipo === 'ok' && (
        <p className="dica centro">Próximo passo: montar a rota e separar os pacotes (em breve).</p>
      )}
    </main>
  )
}
