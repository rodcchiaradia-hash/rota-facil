import Logo from './Logo.jsx'
import Instalar from './Instalar.jsx'
import { lerPacotes } from './pacotes.js'

export default function Inicio({ usuario, onEscanear, onSair }) {
  const total = lerPacotes(usuario.id).length

  return (
    <main className="tela">
      <header className="topo">
        <Logo tamanho={36} />
        <button className="botao-texto" onClick={onSair}>Sair</button>
      </header>
      <p className="ola">Olá, {usuario.email}</p>

      <section className="cartao passo">
        <span className="numero">1</span>
        <div>
          <h2>Escanear pacotes</h2>
          <p>Aponte a câmera para o QR Code ou código de barras da etiqueta.</p>
          {total > 0 && <p className="contagem-pequena">{total} {total === 1 ? 'pacote escaneado' : 'pacotes escaneados'} hoje</p>}
        </div>
      </section>
      <button className="botao principal grande" onClick={onEscanear}>
        {total > 0 ? 'Continuar escaneando' : 'Começar a escanear'}
      </button>

      <section className="em-breve">
        <h3>Em breve</h3>
        <ol start={2}>
          <li>Conferência dos pacotes</li>
          <li>Rota e separação</li>
          <li>Em rota, com mapa</li>
          <li>Registro da entrega</li>
        </ol>
      </section>

      <Instalar />
    </main>
  )
}
