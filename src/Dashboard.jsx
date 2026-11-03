import { useState } from 'react'
import { lerHistorico, lerDia, lerConfig, salvarConfig, resumirDia } from './dia.js'
import { lerPacotes } from './pacotes.js'
import { lerRota } from './rota.js'
import { formatarDuracao, formatarReais, formatarData, lerReais } from './formato.js'
import ResumoDia, { Indicador } from './ResumoDia.jsx'

export const PERIODOS = { hoje: 'Hoje', semana: '7 dias', quinzena: '15 dias', mes: '30 dias', tudo: 'Tudo' }
const DIAS = { hoje: 0, semana: 7, quinzena: 15, mes: 30, tudo: 100000 }

// Todos os dias (encerrados + o de hoje, se aberto), do mais novo para o mais velho.
export function todosOsDias(u) {
  const hoje = lerDia(u)
  const atual = hoje ? [{ ...hoje, aberto: true, resumo: resumirDia(hoje, lerPacotes(u), lerRota(u)) }] : []
  return [...atual, ...lerHistorico(u)]
}

export function filtrarDias(dias, periodo, empresa) {
  const corte = new Date()
  corte.setHours(0, 0, 0, 0)
  corte.setDate(corte.getDate() - DIAS[periodo])
  return dias.filter((d) => d.inicio >= corte.getTime() && (!empresa || d.empresa === empresa))
}

// Resultados e jornada: entregas, tempos, km e combustível no período.
export default function Dashboard({ usuario, perfil, ajudante, onVoltar }) {
  const [periodo, setPeriodo] = useState('semana')
  const [empresa, setEmpresa] = useState('')
  const [config, setConfig] = useState(() => lerConfig(usuario.id))
  const [aberto, setAberto] = useState(null)
  const todos = todosOsDias(usuario.id)
  const dias = filtrarDias(todos, periodo, empresa)
  const empresas = [...new Set(todos.map((d) => d.empresa))]

  if (aberto) return <ResumoDia dia={aberto} mostrarDinheiro={!ajudante} onVoltar={() => setAberto(null)} />

  const soma = (f) => dias.reduce((t, d) => t + (f(d.resumo) || 0), 0)
  const entregues = soma((r) => r.entregues)
  const tempoEntregas = dias.reduce((t, d) => t + d.resumo.tempoMedio * (d.resumo.entregues + d.resumo.problemas), 0)
  const feitas = soma((r) => r.entregues + r.problemas)
  const km = soma((r) => r.kmPercorrido || r.kmPlanejado)
  const consumo = perfil?.consumo
  const litros = consumo ? km / consumo : null
  const maisDemorada = dias.map((d) => d.resumo.maisDemorada).filter(Boolean).sort((a, b) => b.tempo - a.tempo)[0]

  function mudarPreco(e) {
    const nova = { ...config, precoLitro: lerReais(e.target.value) ?? config.precoLitro }
    setConfig(nova)
    salvarConfig(usuario.id, nova)
  }

  return (
    <main className="tela">
      <header className="topo">
        <button className="botao-texto" onClick={onVoltar}>‹ Voltar</button>
        <strong>Resultados</strong>
        <span />
      </header>

      <div className="opcoes">
        {Object.entries(PERIODOS).map(([k, nome]) => (
          <button key={k} className={periodo === k ? 'ativa' : ''} onClick={() => setPeriodo(k)}>{nome}</button>
        ))}
      </div>
      {empresas.length > 1 && (
        <select className="seletor-empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
          <option value="">Todas as empresas</option>
          {empresas.map((e) => <option key={e}>{e}</option>)}
        </select>
      )}

      {!dias.length ? <p className="dica centro">Nenhum dia neste período.</p> : (
        <>
          <section className="indicadores">
            <Indicador valor={dias.length} nome={dias.length === 1 ? 'dia' : 'dias'} />
            <Indicador valor={entregues} nome="entregues" />
            <Indicador valor={soma((r) => r.problemas)} nome="com problema" />
            <Indicador valor={soma((r) => Math.max(r.pendentes, 0))} nome="pendentes" />
            <Indicador valor={formatarDuracao(soma((r) => r.tempoTotal))} nome="tempo total" />
            <Indicador valor={formatarDuracao(feitas ? tempoEntregas / feitas : 0)} nome="média por entrega" />
            <Indicador valor={km.toFixed(1)} nome="km" />
            <Indicador valor={formatarDuracao(soma((r) => r.tempoParado))} nome="tempo parado" />
            {litros !== null && <Indicador valor={litros.toFixed(1)} nome="litros (estimado)" />}
            {litros !== null && !ajudante && <Indicador valor={formatarReais(litros * config.precoLitro)} nome="combustível" />}
          </section>
          {maisDemorada && <p className="dica">Entrega mais demorada: {formatarDuracao(maisDemorada.tempo)} · {maisDemorada.endereco}</p>}
          {!consumo && <p className="dica">Para calcular o combustível, informe o consumo do veículo em "Meu cadastro".</p>}
          {consumo && !ajudante && (
            <label className="linha-preco">Preço do litro (R$)
              <input defaultValue={formatarReais(config.precoLitro, false)} onBlur={mudarPreco} inputMode="decimal" />
            </label>
          )}

          <h3 className="subtitulo">Dias</h3>
          <ul className="lista">
            {dias.map((d, i) => (
              <li key={i} className="clicavel-li" onClick={() => setAberto(d)}>
                <span className="conteudo">
                  <strong>{formatarData(d.inicio)}{d.aberto ? ' · hoje (aberto)' : ''}</strong>
                  <span className="dica">{d.empresa} · Rota {d.rotaNumero} · {d.resumo.entregues} entregues</span>
                </span>
                <span className="seta">›</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
