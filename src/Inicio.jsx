import Logo from './Logo.jsx'
import Instalar from './Instalar.jsx'
import { lerPacotes, lerEsperado } from './pacotes.js'

export default function Inicio({ usuario, onAbrir, onSair }) {
  const pacotes = lerPacotes(usuario.id)
  const total = pacotes.length
  const esperado = lerEsperado(usuario.id)
  const conferido = esperado > 0 && esperado === total && pacotes.every((p) => p.endereco)

  return (
    <main className="tela">
      <header className="topo">
        <Logo tamanho={36} />
        <button className="botao-texto" onClick={onSair}>Sair</button>
      </header>
      <p className="ola">Olá, {usuario.email}</p>

      <button className="cartao passo clicavel" onClick={() => onAbrir('escanear')}>
        <span className={`numero ${total ? 'feito' : ''}`}>1</span>
        <div>
          <h2>Escanear pacotes</h2>
          <p>Código de barras e foto do endereço.</p>
          {total > 0 && <p className="contagem-pequena">{total} {total === 1 ? 'pacote escaneado' : 'pacotes escaneados'}</p>}
        </div>
        <span className="seta">›</span>
      </button>

      <button className="cartao passo clicavel" onClick={() => onAbrir('conferir')} disabled={!total}>
        <span className={`numero ${conferido ? 'feito' : ''}`}>2</span>
        <div>
          <h2>Conferência</h2>
          <p>Quantos pegou x quantos escaneou.</p>
          {conferido && <p className="contagem-pequena">Tudo certo</p>}
          {esperado > 0 && !conferido && <p className="contagem-alerta">{total} de {esperado} · confira</p>}
        </div>
        <span className="seta">›</span>
      </button>

      <section className="em-breve">
        <h3>Em breve</h3>
        <ol start={3}>
          <li>Rota e separação</li>
          <li>Em rota, com mapa</li>
          <li>Registro da entrega</li>
        </ol>
      </section>

      <Instalar />
    </main>
  )
}
