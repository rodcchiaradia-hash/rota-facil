import { useEffect, useMemo, useRef, useState } from 'react'
import Mapa from './Mapa.jsx'
import Camera from './Camera.jsx'
import { lerRota, salvarRota, lerCasa, bagDaParada } from './rota.js'
import { localizar, otimizarRota } from './geo.js'
import { bipe } from './som.js'
import RegistroEntrega from './RegistroEntrega.jsx'
import { guardarComprovante, lerComprovante, apagarComprovante } from './comprovantes.js'

const PROBLEMAS = {
  ausente: 'Destinatário ausente',
  endereco_errado: 'Endereço errado',
  recusado: 'Recusado',
}
const DISTANCIA_ALERTA = 150 // metros

// Passo 4: durante as entregas.
export default function EmRota({ usuario, onVoltar }) {
  const [rota, setRota] = useState(() => {
    const r = lerRota(usuario.id)
    // Rotas montadas antes desta versão não tinham o número fixo da parada.
    return { ...r, entregas: r.entregas || {}, paradas: r.paradas.map((p, i) => ({ ...p, numero: p.numero ?? i + 1 })) }
  })
  const [posicao, setPosicao] = useState(null)
  const [ver, setVer] = useState('vez')
  const [problemaDe, setProblemaDe] = useState(null)
  const [escaneando, setEscaneando] = useState(false)
  const [confirmarForaDeOrdem, setConfirmarForaDeOrdem] = useState(null)
  const [trocandoDestino, setTrocandoDestino] = useState(false)
  const [registrandoDe, setRegistrandoDe] = useState(null)
  const [vendoComprovante, setVendoComprovante] = useState(null)
  const [aviso, setAviso] = useState('')
  const posicaoRef = useRef(null)
  const alertados = useRef(new Set())

  const entregas = rota.entregas || {}
  const pendentes = rota.paradas.filter((p) => !entregas[p.id])
  const feitas = rota.paradas.filter((p) => entregas[p.id]).sort((a, b) => entregas[b.id].quando - entregas[a.id].quando)
  const entregues = feitas.filter((p) => entregas[p.id].status === 'entregue').length
  const comProblema = feitas.length - entregues
  const atual = pendentes[0]
  const distancia = atual && posicao ? metros(posicao, atual) : null

  useEffect(() => salvarRota(usuario.id, rota), [rota, usuario.id])

  // GPS contínuo enquanto a tela está aberta.
  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const nova = { lat: p.coords.latitude, lon: p.coords.longitude }
        posicaoRef.current = nova
        setPosicao(nova)
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  // Mantém a tela acesa durante a rota (o GPS do navegador para com a tela apagada).
  useEffect(() => {
    let trava
    const pedir = () => navigator.wakeLock?.request('screen').then((t) => (trava = t)).catch(() => {})
    const aoVoltar = () => document.visibilityState === 'visible' && pedir()
    pedir()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar)
      trava?.release()
    }
  }, [])

  // Alerta de proximidade: uma vez por parada.
  useEffect(() => {
    if (atual && distancia !== null && distancia < DISTANCIA_ALERTA && !alertados.current.has(atual.id)) {
      alertados.current.add(atual.id)
      bipe(660, 0.2); setTimeout(() => bipe(880, 0.2), 250)
      navigator.vibrate?.([200, 100, 200])
    }
  }, [atual, distancia])

  // Recalcula a ordem das paradas que faltam a partir de onde o entregador está.
  async function recalcular(base, destino = base.destino) {
    const faltam = base.paradas.filter((p) => !base.entregas?.[p.id])
    const daqui = posicaoRef.current
    if (!daqui || !faltam.length) return
    try {
      const { ordem, caminho, distancia: d, duracao } = await otimizarRota(daqui, faltam, destino)
      setRota((r) => {
        const aindaFaltam = r.paradas.filter((p) => !r.entregas?.[p.id])
        if (aindaFaltam.length !== faltam.length) return r // mudou enquanto calculava
        const feitasAgora = r.paradas.filter((p) => r.entregas?.[p.id])
        return { ...r, destino, paradas: [...feitasAgora, ...ordem.map((i) => faltam[i])], caminho, restante: { distancia: d, duracao } }
      })
    } catch {}
  }

  function registrar(parada, status, extra = {}) {
    const foraDeOrdem = parada.id !== atual?.id
    const registro = { status, quando: Date.now(), foraDeOrdem, local: posicaoRef.current, ...extra }
    const nova = { ...rota, entregas: { ...entregas, [parada.id]: registro } }
    setRota(nova)
    setProblemaDe(null)
    setConfirmarForaDeOrdem(null)
    if (status === 'entregue') { bipe(880, 0.12); navigator.vibrate?.(80) }
    recalcular(nova)
  }

  async function confirmarEntrega(parada, { foto, assinatura, recebedor }) {
    const base = chaveComprovante(rota, parada)
    try {
      if (foto) await guardarComprovante(`${base}:foto`, foto)
      if (assinatura) await guardarComprovante(`${base}:assinatura`, assinatura)
    } catch {
      setAviso('Não foi possível guardar a foto/assinatura neste celular. A entrega foi marcada mesmo assim.')
    }
    setRegistrandoDe(null)
    registrar(parada, 'entregue', { recebedor, temFoto: !!foto, temAssinatura: !!assinatura })
  }

  function desfazer(parada) {
    const base = chaveComprovante(rota, parada)
    apagarComprovante(`${base}:foto`).catch(() => {})
    apagarComprovante(`${base}:assinatura`).catch(() => {})
    const { [parada.id]: _, ...resto } = entregas
    const nova = { ...rota, entregas: resto }
    setRota(nova)
    recalcular(nova)
  }

  function leuCodigo(codigo) {
    const parada = pendentes.find((p) => p.codigo === codigo.trim())
    setEscaneando(false)
    if (!parada) {
      bipe(220, 0.35)
      const jaFeita = feitas.find((p) => p.codigo === codigo.trim())
      return setAviso(jaFeita ? `Este pacote já foi marcado (parada ${jaFeita.numero}).` : 'Este pacote não está na rota de hoje.')
    }
    if (parada.id === atual.id) setRegistrandoDe(parada)
    else setConfirmarForaDeOrdem(parada)
  }

  async function trocarDestino(tipo, texto) {
    setAviso('')
    let destino = null
    if (tipo === 'casa') destino = lerCasa(usuario.id)
    if (tipo === 'outro') {
      const p = await localizar(texto).catch(() => null)
      if (!p) return setAviso('Não encontrei esse endereço.')
      destino = { ...p, rotulo: texto.trim() }
    }
    setTrocandoDestino(false)
    const nova = { ...rota, destino }
    setRota(nova)
    recalcular(nova, destino)
  }

  const pontos = useMemo(() => [
    ...pendentes.map((p) => ({ ...p, texto: p.numero, classe: p.id === atual?.id ? 'atual' : '', popup: `<b>${p.numero}.</b> ${p.endereco}` })),
    ...(rota.destino ? [{ ...rota.destino, texto: '⌂', classe: 'destino', popup: rota.destino.rotulo }] : []),
  ], [rota])

  const total = rota.paradas.length

  return (
    <main className="tela">
      <header className="topo">
        <button className="botao-texto" onClick={onVoltar}>‹ Voltar</button>
        <strong>Passo 4 · Em rota</strong>
        <span />
      </header>

      <section className="placar-rota">
        <div><span className="numero-grande">{entregues}</span><span>entregues</span></div>
        <div><span className="numero-grande">{pendentes.length}</span><span>faltam</span></div>
        <div><span className="numero-grande">{total}</span><span>total</span></div>
        <div className="barra"><span style={{ width: `${(feitas.length / total) * 100}%` }} /></div>
        {comProblema > 0 && <p className="dica">{comProblema} com problema</p>}
      </section>

      {aviso && <p className="erro" onClick={() => setAviso('')}>{aviso}</p>}

      {!atual ? (
        <section className="resultado ok">
          <strong>Rota concluída! 🎉</strong>
          <p>{entregues} entregues{comProblema ? ` e ${comProblema} com problema` : ''}, de {total} pacotes.</p>
        </section>
      ) : (
        <>
          <div className="abas">
            <button className={ver === 'vez' ? 'ativa' : ''} onClick={() => setVer('vez')}>Pacote da vez</button>
            <button className={ver === 'mapa' ? 'ativa' : ''} onClick={() => setVer('mapa')}>Mapa</button>
            <button className={ver === 'lista' ? 'ativa' : ''} onClick={() => setVer('lista')}>Lista</button>
          </div>

          {ver === 'vez' && (
            <section className="cartao da-vez">
              {distancia !== null && distancia < DISTANCIA_ALERTA && <div className="chegando">📍 Você está chegando!</div>}
              <div className="da-vez-topo">
                <div><span>Parada</span><strong>{atual.numero}</strong></div>
                <div><span>Bag</span><strong>{bagDaParada(atual.numero, rota.tamanhoBag)}</strong></div>
                {distancia !== null && <div><span>Distância</span><strong className="menor">{formatarDistancia(distancia)}</strong></div>}
              </div>
              <p className="endereco-grande">{atual.endereco}</p>
              {atual.codigo && <p className="dica">Código {atual.codigo}</p>}
              <div className="navegar">
                <a className="botao secundario" href={`https://www.google.com/maps/dir/?api=1&destination=${atual.lat},${atual.lon}&travelmode=driving`} target="_blank" rel="noreferrer">Google Maps</a>
                <a className="botao secundario" href={`https://waze.com/ul?ll=${atual.lat},${atual.lon}&navigate=yes`} target="_blank" rel="noreferrer">Waze</a>
              </div>
              <button className="botao verde grande" onClick={() => setRegistrandoDe(atual)}>✓ Entregue</button>
              <button className="botao-texto perigo" onClick={() => setProblemaDe(atual)}>Teve um problema</button>
            </section>
          )}

          {ver === 'mapa' && <Mapa pontos={pontos} caminho={rota.caminho} posicao={posicao} />}

          {ver === 'lista' && (
            <ol className="paradas">
              {pendentes.map((p) => (
                <li key={p.id} className={p.id === atual.id ? 'vez' : ''}>
                  <span className="numero">{p.numero}</span>
                  <span className="conteudo">
                    <span className="endereco">{p.endereco}</span>
                    <span className="dica">Bag {bagDaParada(p.numero, rota.tamanhoBag)}</span>
                  </span>
                  <button className="botao-texto" onClick={() => (p.id === atual.id ? setRegistrandoDe(p) : setConfirmarForaDeOrdem(p))}>Entregar</button>
                </li>
              ))}
            </ol>
          )}

          <div className="acoes-rota">
            <button className="botao secundario" onClick={() => setEscaneando(true)}>📷 Escanear pacote</button>
            <button className="botao secundario" onClick={() => setTrocandoDestino(true)}>⌂ Trocar destino</button>
          </div>
          <p className="dica centro">
            Destino final: {rota.destino ? rota.destino.rotulo : 'última entrega'}
            {rota.restante && ` · faltam ${(rota.restante.distancia / 1000).toFixed(1)} km`}
          </p>
        </>
      )}

      {feitas.length > 0 && (
        <details className="cartao feitas">
          <summary>Já feitas ({feitas.length})</summary>
          <ul className="lista">
            {feitas.map((p) => {
              const e = entregas[p.id]
              return (
                <li key={p.id}>
                  <span className="ordem">{p.numero}</span>
                  <span className="conteudo">
                    <span className="endereco">{p.endereco}</span>
                    <span className={e.status === 'entregue' ? 'status-ok' : 'status-problema'}>
                      {e.status === 'entregue' ? '✓ Entregue' : `⚠ ${PROBLEMAS[e.status]}`}{e.foraDeOrdem ? ' · fora de ordem' : ''}
                    </span>
                    {e.recebedor && (
                      <span className="dica">
                        {e.recebedor.nome ? `${e.recebedor.nome} (${e.recebedor.tipo.toLowerCase()})` : e.recebedor.tipo}
                        {e.temFoto ? ' · 📷' : ''}{e.temAssinatura ? ' · ✍' : ''}
                      </span>
                    )}
                    {(e.temFoto || e.temAssinatura) && (
                      <button className="link" onClick={() => setVendoComprovante(p)}>Ver comprovante</button>
                    )}
                  </span>
                  <button className="botao-texto" onClick={() => desfazer(p)}>Desfazer</button>
                </li>
              )
            })}
          </ul>
        </details>
      )}

      {problemaDe && (
        <Janela titulo={`Problema na parada ${problemaDe.numero}`} onFechar={() => setProblemaDe(null)}>
          {Object.entries(PROBLEMAS).map(([chave, texto]) => (
            <button key={chave} className="botao secundario" onClick={() => registrar(problemaDe, chave)}>{texto}</button>
          ))}
        </Janela>
      )}

      {confirmarForaDeOrdem && (
        <Janela titulo={`Parada ${confirmarForaDeOrdem.numero} (fora de ordem)`} onFechar={() => setConfirmarForaDeOrdem(null)}>
          <p>{confirmarForaDeOrdem.endereco}</p>
          <button className="botao verde" onClick={() => { setRegistrandoDe(confirmarForaDeOrdem); setConfirmarForaDeOrdem(null) }}>✓ Entregar este</button>
          <button className="botao-texto perigo" onClick={() => { setProblemaDe(confirmarForaDeOrdem); setConfirmarForaDeOrdem(null) }}>Teve um problema</button>
        </Janela>
      )}

      {escaneando && (
        <Janela titulo="Escanear pacote" onFechar={() => setEscaneando(false)}>
          <div className="camera-caixa"><Camera onLeu={leuCodigo} onErro={(m) => { setEscaneando(false); setAviso(m) }} /></div>
        </Janela>
      )}

      {registrandoDe && (
        <Janela titulo="Registrar entrega" onFechar={() => setRegistrandoDe(null)}>
          <RegistroEntrega parada={registrandoDe} onConfirmar={(dados) => confirmarEntrega(registrandoDe, dados)} />
        </Janela>
      )}

      {vendoComprovante && (
        <Janela titulo={`Comprovante · parada ${vendoComprovante.numero}`} onFechar={() => setVendoComprovante(null)}>
          <Comprovante base={chaveComprovante(rota, vendoComprovante)} registro={entregas[vendoComprovante.id]} parada={vendoComprovante} />
        </Janela>
      )}

      {trocandoDestino && (
        <Janela titulo="Onde você termina o dia?" onFechar={() => setTrocandoDestino(false)}>
          <TrocarDestino temCasa={!!lerCasa(usuario.id)} onEscolher={trocarDestino} />
        </Janela>
      )}
    </main>
  )
}

const chaveComprovante = (rota, parada) => `${rota.criadaEm}:${parada.id}`

function Comprovante({ base, registro, parada }) {
  const [imagens, setImagens] = useState({})
  useEffect(() => {
    const urls = []
    Promise.all(['foto', 'assinatura'].map((tipo) => lerComprovante(`${base}:${tipo}`).catch(() => null)))
      .then(([foto, assinatura]) => {
        const u = (b) => { if (!b) return null; const url = URL.createObjectURL(b); urls.push(url); return url }
        setImagens({ foto: u(foto), assinatura: u(assinatura) })
      })
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [base])
  return (
    <>
      <p>{parada.endereco}</p>
      <p className="dica">
        {new Date(registro.quando).toLocaleString('pt-BR')}
        {registro.recebedor ? ` · ${registro.recebedor.nome || ''} ${registro.recebedor.nome ? '(' + registro.recebedor.tipo.toLowerCase() + ')' : registro.recebedor.tipo}` : ''}
      </p>
      {imagens.foto && <img className="previa" src={imagens.foto} alt="Foto da entrega" />}
      {imagens.assinatura && <img className="assinatura-salva" src={imagens.assinatura} alt="Assinatura" />}
    </>
  )
}

function TrocarDestino({ temCasa, onEscolher }) {
  const [texto, setTexto] = useState('')
  return (
    <>
      {temCasa && <button className="botao secundario" onClick={() => onEscolher('casa')}>⌂ Casa</button>}
      <button className="botao secundario" onClick={() => onEscolher('ultima')}>Terminar na última entrega</button>
      <div className="digitar">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Outro endereço, com número e cidade" />
        <button className="botao principal" disabled={!texto.trim()} onClick={() => onEscolher('outro', texto)}>Ok</button>
      </div>
      <p className="dica">A rota é recalculada na hora, a partir de onde você está.</p>
    </>
  )
}

function Janela({ titulo, children, onFechar }) {
  return (
    <div className="fundo-janela" onClick={onFechar}>
      <div className="janela" onClick={(e) => e.stopPropagation()}>
        <div className="topo"><strong>{titulo}</strong><button className="botao-texto" onClick={onFechar}>Fechar</button></div>
        {children}
      </div>
    </div>
  )
}

function metros(a, b) {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const formatarDistancia = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`)
