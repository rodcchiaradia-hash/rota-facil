import { useState } from 'react'
import { lerHistorico, salvarHistorico, lerConfig, lerDia, salvarDia } from './dia.js'
import { todosOsDias } from './Dashboard.jsx'
import { formatarReais, formatarData, lerReais } from './formato.js'
import { Indicador } from './ResumoDia.jsx'

const PERIODOS = { semana: 'Esta semana', quinzena: 'Esta quinzena', mes: 'Este mês' }

function inicioPeriodo(periodo) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (periodo === 'semana') d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // segunda-feira
  if (periodo === 'quinzena') d.setDate(d.getDate() <= 15 ? 1 : 16)
  if (periodo === 'mes') d.setDate(1)
  return d.getTime()
}

const dataPagamento = (dia) => (dia.prazo ? (dia.fimDia || dia.inicio) + dia.prazo * 86400000 : null)

// Financeiro: só o dono da conta vê (escondido no modo ajudante).
export default function Financeiro({ usuario, perfil, onVoltar }) {
  const [periodo, setPeriodo] = useState('semana')
  const [, atualizar] = useState(0)
  const [editando, setEditando] = useState(null)
  const config = lerConfig(usuario.id)
  const todos = todosOsDias(usuario.id)
  const dias = todos.filter((d) => d.inicio >= inicioPeriodo(periodo))

  const ganhos = dias.reduce((t, d) => t + (d.valor || 0), 0)
  const km = dias.reduce((t, d) => t + (d.resumo.kmPercorrido || d.resumo.kmPlanejado || 0), 0)
  const combustivel = perfil?.consumo ? (km / perfil.consumo) * config.precoLitro : 0
  const aReceber = todos.filter((d) => !d.pago && d.valor)
  const totalAReceber = aReceber.reduce((t, d) => t + d.valor, 0)

  // Atualiza um dia, seja o de hoje (aberto) ou um do histórico.
  function alterar(dia, mudancas) {
    if (dia.aberto) salvarDia(usuario.id, { ...lerDia(usuario.id), ...mudancas })
    else salvarHistorico(usuario.id, lerHistorico(usuario.id).map((d) => (d.inicio === dia.inicio ? { ...d, ...mudancas } : d)))
    atualizar((n) => n + 1)
  }

  return (
    <main className="tela">
      <header className="topo">
        <button className="botao-texto" onClick={onVoltar}>‹ Voltar</button>
        <strong>Financeiro</strong>
        <span />
      </header>

      <div className="opcoes">
        {Object.entries(PERIODOS).map(([k, nome]) => (
          <button key={k} className={periodo === k ? 'ativa' : ''} onClick={() => setPeriodo(k)}>{nome}</button>
        ))}
      </div>

      <section className="indicadores">
        <Indicador valor={formatarReais(ganhos)} nome="ganhos" />
        <Indicador valor={dias.length} nome={dias.length === 1 ? 'rota' : 'rotas'} />
        <Indicador valor={dias.length ? formatarReais(ganhos / dias.length) : '—'} nome="média por rota" />
        {perfil?.consumo ? <Indicador valor={formatarReais(combustivel)} nome="combustível (estimado)" /> : null}
        {perfil?.consumo ? <Indicador valor={formatarReais(ganhos - combustivel)} nome="sobra" /> : null}
      </section>
      {dias.some((d) => !d.valor) && <p className="dica">Há rotas sem valor. Toque nelas abaixo para informar.</p>}

      <h3 className="subtitulo">A receber · {formatarReais(totalAReceber)}</h3>
      {!aReceber.length && <p className="dica">Nada pendente.</p>}
      <ul className="lista">
        {aReceber.map((d) => {
          const pagar = dataPagamento(d)
          const atrasado = pagar && pagar < Date.now()
          return (
            <li key={d.inicio}>
              <span className="conteudo">
                <strong>{formatarReais(d.valor)} · {d.empresa}</strong>
                <span className={atrasado ? 'status-problema' : 'dica'}>
                  Rota {d.rotaNumero} de {formatarData(d.inicio)}{pagar ? ` · ${atrasado ? 'venceu' : 'vence'} ${formatarData(pagar)}` : ''}
                </span>
              </span>
              <button className="botao-texto" onClick={() => alterar(d, { pago: true, pagoEm: Date.now() })}>Recebi</button>
            </li>
          )
        })}
      </ul>

      <h3 className="subtitulo">Rotas do período</h3>
      <ul className="lista">
        {dias.map((d) => (
          <li key={d.inicio} className="clicavel-li" onClick={() => setEditando(d)}>
            <span className="conteudo">
              <strong>{formatarData(d.inicio)} · {d.empresa} · Rota {d.rotaNumero}</strong>
              <span className={d.valor ? 'dica' : 'status-problema'}>
                {d.valor ? formatarReais(d.valor) : 'sem valor'}{d.pago ? ' · recebido ✓' : ''}
              </span>
            </span>
            <span className="seta">›</span>
          </li>
        ))}
      </ul>

      {editando && (
        <div className="fundo-janela" onClick={() => setEditando(null)}>
          <form className="janela" onClick={(e) => e.stopPropagation()} onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.target)
            alterar(editando, { valor: lerReais(f.get('valor')), prazo: Number(f.get('prazo')) || null, pago: f.get('pago') === 'on' })
            setEditando(null)
          }}>
            <div className="topo"><strong>Rota {editando.rotaNumero} · {formatarData(editando.inicio)}</strong>
              <button type="button" className="botao-texto" onClick={() => setEditando(null)}>Fechar</button></div>
            <div className="linha-dupla">
              <label>Valor (R$)<input name="valor" defaultValue={editando.valor ? formatarReais(editando.valor, false) : ''} inputMode="decimal" /></label>
              <label>Paga em (dias)<input name="prazo" defaultValue={editando.prazo ?? ''} inputMode="numeric" /></label>
            </div>
            <label className="aceite"><input type="checkbox" name="pago" defaultChecked={!!editando.pago} /> <span>Já recebi</span></label>
            <button className="botao principal">Salvar</button>
          </form>
        </div>
      )}
    </main>
  )
}
