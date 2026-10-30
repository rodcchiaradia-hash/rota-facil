import { useEffect, useRef, useState } from 'react'
import Camera from './Camera.jsx'
import { lerRota, salvarRota, bagDaParada } from './rota.js'
import { bipe } from './som.js'

const INTERVALO_MESMO_CODIGO = 2500

// Reescaneamento ao carregar: mostra em qual parada e bag vai cada pacote.
export default function Carregar({ usuario, onVoltar }) {
  const [rota, setRota] = useState(() => lerRota(usuario.id))
  const [ultimo, setUltimo] = useState(null)
  const [erroCamera, setErroCamera] = useState('')
  const rotaRef = useRef(rota)
  const ultimaLeitura = useRef({ codigo: '', quando: 0 })

  useEffect(() => {
    rotaRef.current = rota
    salvarRota(usuario.id, rota)
  }, [rota, usuario.id])

  function marcar(id) {
    setRota((r) => (r.carregados.includes(id) ? r : { ...r, carregados: [...r.carregados, id] }))
  }

  function leu(codigo) {
    codigo = codigo.trim()
    const agora = Date.now()
    const anterior = ultimaLeitura.current
    if (anterior.codigo === codigo && agora - anterior.quando < INTERVALO_MESMO_CODIGO) return
    ultimaLeitura.current = { codigo, quando: agora }

    const r = rotaRef.current
    const indice = r.paradas.findIndex((p) => p.codigo === codigo)
    if (indice < 0) {
      bipe(220, 0.35); navigator.vibrate?.([120, 80, 120])
      return setUltimo({ tipo: 'fora', codigo })
    }
    const parada = r.paradas[indice]
    const repetido = r.carregados.includes(parada.id)
    bipe(repetido ? 440 : 880, 0.15); navigator.vibrate?.(80)
    const numero = parada.numero ?? indice + 1
    setUltimo({ tipo: repetido ? 'repetido' : 'ok', numero, bag: bagDaParada(numero, r.tamanhoBag), endereco: parada.endereco })
    marcar(parada.id)
  }

  const total = rota.paradas.length
  const carregados = rota.carregados.length
  const semCodigo = rota.paradas.map((p, i) => ({ ...p, numero: p.numero ?? i + 1 })).filter((p) => !p.codigo)

  return (
    <main className="tela tela-escanear">
      <header className="topo">
        <button className="botao-texto" onClick={onVoltar}>‹ Voltar</button>
        <strong>Carregar o carro</strong>
        <span />
      </header>

      <div className="camera-caixa">
        <Camera onLeu={leu} onErro={setErroCamera} />
        {erroCamera && <p className="erro camera-erro">{erroCamera}</p>}
      </div>

      {ultimo?.tipo === 'fora' && (
        <section className="resultado falta"><strong>Pacote fora da rota</strong><p>{ultimo.codigo} não está na rota de hoje.</p></section>
      )}
      {ultimo && ultimo.tipo !== 'fora' && (
        <section className={`etiqueta-parada ${ultimo.tipo}`}>
          <div><span>Parada</span><strong>{ultimo.numero}</strong></div>
          <div><span>Bag</span><strong>{ultimo.bag}</strong></div>
          <p>{ultimo.tipo === 'repetido' ? 'Já carregado · ' : ''}{ultimo.endereco}</p>
        </section>
      )}

      <div className="contador">
        <span className="numero-grande">{carregados}</span>
        <span>de {total} carregados</span>
      </div>
      {carregados === total && total > 0 && (
        <section className="resultado ok"><strong>Tudo carregado!</strong><p>Pode sair para as entregas.</p></section>
      )}

      {semCodigo.length > 0 && (
        <section className="cartao">
          <strong>Pacotes sem código: marque ao carregar</strong>
          <ul className="lista">
            {semCodigo.map((p) => (
              <li key={p.id}>
                <span className="ordem">{p.numero}</span>
                <span className="conteudo"><span className="endereco">{p.endereco}</span>
                  <span className="dica">Bag {bagDaParada(p.numero, rota.tamanhoBag)}</span></span>
                <input type="checkbox" className="marcar" checked={rota.carregados.includes(p.id)}
                  onChange={() => marcar(p.id)} aria-label="Carregado" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
