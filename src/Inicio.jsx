import Logo from './Logo.jsx'
import Instalar from './Instalar.jsx'
import { lerPacotes, lerEsperado } from './pacotes.js'
import { lerRota } from './rota.js'
import { lerDia } from './dia.js'
import { formatarReais } from './formato.js'

export default function Inicio({ usuario, perfil, ajudante, onAbrir, onSair, onEncerrar, onModoAjudante }) {
  const dia = lerDia(usuario.id)
  const pacotes = lerPacotes(usuario.id)
  const total = pacotes.length
  const esperado = lerEsperado(usuario.id)
  const rota = lerRota(usuario.id)
  const comEndereco = pacotes.filter((p) => p.endereco).length
  const feitas = rota ? Object.keys(rota.entregas || {}).length : 0
  const carregado = rota && rota.paradas.length > 0 && rota.carregados.length === rota.paradas.length
  const conferido = esperado > 0 && esperado === total && pacotes.every((p) => p.endereco)

  return (
    <main className="tela">
      <header className="topo">
        <Logo tamanho={36} />
        {ajudante ? <span className="selo-ajudante">Modo ajudante</span>
          : <button className="botao-texto" onClick={onSair}>Sair</button>}
      </header>
      <p className="ola">Olá, {ajudante ? 'ajudante' : perfil.nome.split(' ')[0]}!</p>

      {!dia ? (
        <button className="botao principal grande" onClick={() => onAbrir('iniciodia')}>☀ Começar o dia</button>
      ) : (
        <section className="cartao dia-atual">
          <span className="dica">Hoje</span>
          <strong>{dia.empresa} · Rota {dia.rotaNumero}</strong>
          {!ajudante && dia.valor ? <span className="dica">{formatarReais(dia.valor)}</span> : null}
        </section>
      )}

      {dia && <>

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

      <button className="cartao passo clicavel" onClick={() => onAbrir('rota')} disabled={!comEndereco}>
        <span className={`numero ${carregado ? 'feito' : ''}`}>3</span>
        <div>
          <h2>Rota e separação</h2>
          <p>Melhor ordem, mapa, bags e carregamento.</p>
          {rota && (
            <p className={carregado ? 'contagem-pequena' : 'contagem-alerta'}>
              {rota.paradas.length} paradas · {(rota.distancia / 1000).toFixed(1)} km · {rota.carregados.length} carregados
            </p>
          )}
        </div>
        <span className="seta">›</span>
      </button>

      <button className="cartao passo clicavel" onClick={() => onAbrir('emrota')} disabled={!rota?.paradas.length}>
        <span className={`numero ${rota && feitas === rota.paradas.length && feitas ? 'feito' : ''}`}>4</span>
        <div>
          <h2>Em rota</h2>
          <p>Pacote da vez, mapa e registro da entrega (foto e assinatura).</p>
          {rota && feitas > 0 && <p className="contagem-pequena">{feitas} de {rota.paradas.length} feitas</p>}
        </div>
        <span className="seta">›</span>
      </button>

      {!ajudante && <button className="botao-texto perigo centro" onClick={onEncerrar}>Encerrar o dia</button>}
      </>}

      <nav className="menu">
        <button onClick={() => onAbrir('dashboard')}>📊<span>Resultados</span></button>
        {!ajudante && <button onClick={() => onAbrir('financeiro')}>💰<span>Financeiro</span></button>}
        {!ajudante && <button onClick={() => onAbrir('minhasrotas')}>🗺<span>Minhas rotas</span></button>}
        {!ajudante && <button onClick={() => onAbrir('cadastro')}>👤<span>Meu cadastro</span></button>}
        <button onClick={onModoAjudante}>🤝<span>{ajudante ? 'Sair do modo ajudante' : 'Modo ajudante'}</span></button>
      </nav>

      <Instalar />
    </main>
  )
}
