import { useState } from 'react'
import { lerPacotes } from './pacotes.js'
import { lerRota, salvarRota, lerCasa, salvarCasa, bagDaParada, rotaDesatualizada } from './rota.js'
import { localizar, minhaLocalizacao, otimizarRota } from './geo.js'
import Mapa, { pontosDaRota } from './Mapa.jsx'

// Passo 3: partida, destino final, melhor ordem das entregas e separação em bags.
export default function Rota({ usuario, onVoltar, onCarregar, onEmRota }) {
  const pacotes = lerPacotes(usuario.id).filter((p) => p.endereco)
  const [rota, setRota] = useState(() => lerRota(usuario.id))
  const [casa, setCasa] = useState(() => lerCasa(usuario.id))
  const [partidaTexto, setPartidaTexto] = useState('')
  const [usarGps, setUsarGps] = useState(true)
  const [tipoDestino, setTipoDestino] = useState(() => (lerCasa(usuario.id) ? 'casa' : 'ultima'))
  const [destinoTexto, setDestinoTexto] = useState('')
  const [casaTexto, setCasaTexto] = useState('')
  const [progresso, setProgresso] = useState('')
  const [erro, setErro] = useState('')
  const [ver, setVer] = useState('mapa')

  async function guardarCasa() {
    setErro('')
    setProgresso('Localizando sua casa…')
    const ponto = await localizar(casaTexto).catch(() => null)
    setProgresso('')
    if (!ponto) return setErro('Não encontrei esse endereço. Confira rua, número e cidade.')
    const nova = { ...ponto, rotulo: casaTexto.trim() }
    salvarCasa(usuario.id, nova)
    setCasa(nova)
    setCasaTexto('')
  }

  async function montar() {
    setErro('')
    try {
      setProgresso('Pegando sua localização…')
      let partida
      if (usarGps) partida = { ...(await minhaLocalizacao()), rotulo: 'Minha localização' }
      else {
        const p = await localizar(partidaTexto)
        if (!p) throw new Error('Não encontrei o endereço de partida.')
        partida = { ...p, rotulo: partidaTexto.trim() }
      }

      let destino = null
      if (tipoDestino === 'casa') destino = casa
      if (tipoDestino === 'outro') {
        setProgresso('Localizando o destino final…')
        const p = await localizar(destinoTexto)
        if (!p) throw new Error('Não encontrei o endereço do destino final.')
        destino = { ...p, rotulo: destinoTexto.trim() }
      }

      const localizados = []
      const naoLocalizados = []
      for (const [i, p] of pacotes.entries()) {
        setProgresso(`Localizando endereços no mapa… ${i + 1} de ${pacotes.length}`)
        const ponto = await localizar(p)
        const item = { id: p.id || p.codigo, codigo: p.codigo, endereco: p.endereco }
        if (ponto) localizados.push({ ...item, ...ponto })
        else naoLocalizados.push(item)
      }
      if (!localizados.length) throw new Error('Nenhum endereço foi encontrado no mapa.')

      setProgresso('Calculando a melhor ordem de entrega…')
      const { ordem, distancia, duracao, caminho } = await otimizarRota(partida, localizados, destino)
      const nova = {
        partida, destino, caminho, distancia, duracao, naoLocalizados,
        paradas: ordem.map((i, n) => ({ ...localizados[i], numero: n + 1 })),
        entregas: {},
        tamanhoBag: rota?.tamanhoBag || 10,
        carregados: [],
        criadaEm: Date.now(),
      }
      salvarRota(usuario.id, nova)
      setRota(nova)
    } catch (e) {
      setErro(e.code === 1 ? 'Sem permissão para usar o GPS. Libere a localização ou digite o endereço de partida.'
        : e.message?.startsWith('Não') || e.message?.startsWith('Nenhum') ? e.message
        : 'Não foi possível calcular a rota agora. Verifique a internet e tente de novo.')
    } finally {
      setProgresso('')
    }
  }

  function mudarBag(tamanho) {
    const nova = { ...rota, tamanhoBag: tamanho }
    salvarRota(usuario.id, nova)
    setRota(nova)
  }

  const desatualizada = rotaDesatualizada(rota, pacotes)
  const bags = rota ? Math.ceil(rota.paradas.length / rota.tamanhoBag) : 0

  return (
    <main className="tela">
      <header className="topo">
        <button className="botao-texto" onClick={onVoltar}>‹ Voltar</button>
        <strong>Passo 3 · Rota</strong>
        <span />
      </header>

      <section className="cartao">
        <strong>De onde você sai?</strong>
        <div className="opcoes">
          <button type="button" className={usarGps ? 'ativa' : ''} onClick={() => setUsarGps(true)}>📍 Onde estou agora</button>
          <button type="button" className={!usarGps ? 'ativa' : ''} onClick={() => setUsarGps(false)}>Outro endereço</button>
        </div>
        {!usarGps && (
          <input value={partidaTexto} onChange={(e) => setPartidaTexto(e.target.value)}
            placeholder="Ex.: Rua X, 100, Belo Horizonte" />
        )}

        <strong>Onde você termina o dia?</strong>
        <div className="opcoes">
          <button type="button" className={tipoDestino === 'casa' ? 'ativa' : ''} onClick={() => setTipoDestino('casa')}>⌂ Casa</button>
          <button type="button" className={tipoDestino === 'outro' ? 'ativa' : ''} onClick={() => setTipoDestino('outro')}>Outro</button>
          <button type="button" className={tipoDestino === 'ultima' ? 'ativa' : ''} onClick={() => setTipoDestino('ultima')}>Na última entrega</button>
        </div>
        {tipoDestino === 'casa' && (casa ? (
          <p className="dica">Casa: {casa.rotulo} · <button type="button" className="link" onClick={() => setCasa(null)}>trocar</button></p>
        ) : (
          <div className="digitar">
            <input value={casaTexto} onChange={(e) => setCasaTexto(e.target.value)} placeholder="Endereço de casa, com número e cidade" />
            <button type="button" className="botao principal" onClick={guardarCasa} disabled={!casaTexto.trim()}>Salvar</button>
          </div>
        ))}
        {tipoDestino === 'outro' && (
          <input value={destinoTexto} onChange={(e) => setDestinoTexto(e.target.value)} placeholder="Ex.: Rua Y, 50, Belo Horizonte" />
        )}

        <button className="botao principal grande" onClick={montar}
          disabled={!!progresso || !pacotes.length || (!usarGps && !partidaTexto.trim())
            || (tipoDestino === 'casa' && !casa) || (tipoDestino === 'outro' && !destinoTexto.trim())}>
          {rota ? 'Montar a rota de novo' : 'Montar a rota'}
        </button>
        {progresso && <p className="dica">{progresso}</p>}
        {erro && <p className="erro">{erro}</p>}
        {!pacotes.length && <p className="dica">Escaneie pacotes com endereço antes de montar a rota.</p>}
      </section>

      {rota && desatualizada && (
        <section className="resultado sobra">
          <strong>A lista de pacotes mudou</strong>
          <p>Monte a rota de novo para incluir as mudanças.</p>
        </section>
      )}

      {rota && (
        <>
          <section className="resumo-rota">
            <div><span className="numero-grande">{rota.paradas.length}</span><span>paradas</span></div>
            <div><span className="numero-grande">{(rota.distancia / 1000).toFixed(1)}</span><span>km</span></div>
            <div><span className="numero-grande">{formatarTempo(rota.duracao)}</span><span>sem trânsito</span></div>
          </section>

          {rota.naoLocalizados.length > 0 && (
            <section className="resultado falta">
              <strong>{rota.naoLocalizados.length} {rota.naoLocalizados.length === 1 ? 'endereço não encontrado' : 'endereços não encontrados'} no mapa</strong>
              {rota.naoLocalizados.map((p) => <p key={p.id}>• {p.endereco}</p>)}
              <p>Esses ficaram fora da rota. Confira o endereço no passo 1.</p>
            </section>
          )}

          <div className="abas">
            <button className={ver === 'mapa' ? 'ativa' : ''} onClick={() => setVer('mapa')}>Mapa</button>
            <button className={ver === 'lista' ? 'ativa' : ''} onClick={() => setVer('lista')}>Paradas</button>
            <button className={ver === 'bags' ? 'ativa' : ''} onClick={() => setVer('bags')}>Bags</button>
          </div>

          {ver === 'mapa' && <Mapa pontos={pontosDaRota(rota)} caminho={rota.caminho} />}

          {ver === 'lista' && (
            <ol className="paradas">
              <li className="ponta">▶ {rota.partida.rotulo}</li>
              {rota.paradas.map((p, i) => (
                <li key={p.id}>
                  <span className="numero">{i + 1}</span>
                  <span className="conteudo">
                    <span className="endereco">{p.endereco}</span>
                    <span className="dica">Bag {bagDaParada(i + 1, rota.tamanhoBag)}{p.codigo ? ` · ${p.codigo}` : ''}</span>
                  </span>
                </li>
              ))}
              <li className="ponta">{rota.destino ? `⌂ ${rota.destino.rotulo}` : '■ Fim na última entrega'}</li>
            </ol>
          )}

          {ver === 'bags' && (
            <section className="cartao">
              <label>
                Pacotes por bag
                <div className="seletor">
                  <button type="button" className="botao secundario" onClick={() => mudarBag(Math.max(1, rota.tamanhoBag - 1))}>−</button>
                  <input readOnly value={rota.tamanhoBag} />
                  <button type="button" className="botao secundario" onClick={() => mudarBag(rota.tamanhoBag + 1)}>+</button>
                </div>
              </label>
              <ul className="lista-bags">
                {Array.from({ length: bags }, (_, b) => {
                  const ini = b * rota.tamanhoBag + 1
                  const fim = Math.min((b + 1) * rota.tamanhoBag, rota.paradas.length)
                  return <li key={b}><strong>Bag {b + 1}</strong><span>paradas {ini} a {fim}</span></li>
                })}
              </ul>
              <p className="dica">A bag 1 sai primeiro. Escreva o número da parada em cada pacote ao carregar.</p>
            </section>
          )}

          <button className="botao secundario" onClick={onCarregar}>
            Carregar o carro: reescanear pacotes
          </button>
          <button className="botao principal grande" onClick={onEmRota}>
            🚚 Começar as entregas
          </button>
        </>
      )}
    </main>
  )
}

function formatarTempo(segundos) {
  const min = Math.round(segundos / 60)
  return min < 60 ? `${min}min` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}
