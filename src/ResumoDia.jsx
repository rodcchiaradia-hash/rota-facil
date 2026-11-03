import { formatarDuracao, formatarReais, formatarData } from './formato.js'

const NOMES = { entregue: '✓ Entregue', ausente: '⚠ Ausente', endereco_errado: '⚠ Endereço errado', recusado: '⚠ Recusado', pendente: '○ Não entregue' }

// Resumo de um dia (ao encerrar ou ao abrir pelo histórico).
export default function ResumoDia({ dia, mostrarDinheiro = true, onVoltar }) {
  const r = dia.resumo
  return (
    <main className="tela">
      <header className="topo">
        <button className="botao-texto" onClick={onVoltar}>‹ Voltar</button>
        <strong>{formatarData(dia.inicio)}</strong>
        <span />
      </header>
      <section className="cartao">
        <strong>{dia.empresa} · Rota {dia.rotaNumero}</strong>
        {mostrarDinheiro && dia.valor ? <span className="dica">{formatarReais(dia.valor)}</span> : null}
      </section>
      <section className="indicadores">
        <Indicador valor={r.entregues} nome="entregues" />
        <Indicador valor={r.problemas} nome="com problema" />
        <Indicador valor={r.pendentes} nome="não entregues" />
        <Indicador valor={formatarDuracao(r.tempoTotal)} nome="tempo total" />
        <Indicador valor={formatarDuracao(r.tempoMedio)} nome="média por entrega" />
        <Indicador valor={(r.kmPercorrido || r.kmPlanejado).toFixed(1)} nome={r.kmPercorrido ? 'km rodados' : 'km (planejado)'} />
        {r.tempoParado > 0 && <Indicador valor={formatarDuracao(r.tempoParado)} nome="tempo parado" />}
      </section>
      {r.maisDemorada && (
        <p className="dica">Entrega mais demorada: parada {r.maisDemorada.numero} ({formatarDuracao(r.maisDemorada.tempo)}) · {r.maisDemorada.endereco}</p>
      )}
      {dia.entregas?.length > 0 && (
        <ul className="lista">
          {dia.entregas.map((e, i) => (
            <li key={i}>
              <span className="ordem">{e.numero}</span>
              <span className="conteudo">
                <span className="endereco">{e.endereco}</span>
                <span className={e.status === 'entregue' ? 'status-ok' : 'status-problema'}>
                  {NOMES[e.status]}{e.quando ? ` · ${new Date(e.quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export function Indicador({ valor, nome }) {
  return <div className="indicador"><strong>{valor}</strong><span>{nome}</span></div>
}
