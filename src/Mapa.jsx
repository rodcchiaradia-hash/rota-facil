import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pino = (texto, classe) =>
  L.divIcon({ className: '', html: `<div class="pino ${classe}"><span>${texto}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30] })

// Mapa do OpenStreetMap com a partida, as paradas numeradas e o destino.
// "pontos": [{ lat, lon, texto, classe, popup }]; "posicao": onde o entregador está agora.
export default function Mapa({ pontos, caminho, posicao }) {
  const caixa = useRef(null)
  const mapaRef = useRef(null)
  const camada = useRef(null)
  const enquadrado = useRef(false)

  useEffect(() => {
    const mapa = L.map(caixa.current)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(mapa)
    camada.current = L.layerGroup().addTo(mapa)
    mapaRef.current = mapa
    return () => mapa.remove()
  }, [])

  useEffect(() => {
    const grupo = camada.current
    grupo.clearLayers()
    if (caminho?.length) L.polyline(caminho, { color: '#1F6FEB', weight: 5, opacity: 0.8 }).addTo(grupo)
    pontos.forEach((p) => {
      const m = L.marker([p.lat, p.lon], { icon: pino(p.texto, p.classe || '') }).addTo(grupo)
      if (p.popup) {
        // Texto puro: endereço lido da foto ou digitado nunca vira HTML.
        const caixaPopup = document.createElement('div')
        caixaPopup.textContent = p.popup
        m.bindPopup(caixaPopup)
      }
    })
    if (posicao) L.circleMarker([posicao.lat, posicao.lon], { radius: 9, color: '#fff', weight: 3, fillColor: '#1F6FEB', fillOpacity: 1 }).addTo(grupo)
    // Enquadra só na primeira vez, para não tirar o zoom que a pessoa escolheu.
    const todos = [...pontos.map((p) => [p.lat, p.lon]), ...(posicao ? [[posicao.lat, posicao.lon]] : [])]
    if (!enquadrado.current && todos.length) {
      mapaRef.current.fitBounds(todos, { padding: [30, 30], maxZoom: 17 })
      enquadrado.current = true
    }
  }, [pontos, caminho, posicao])

  return <div ref={caixa} className="mapa" />
}

// Pontos da rota inteira, usados no passo 3.
export function pontosDaRota(rota) {
  return [
    { ...rota.partida, texto: '▶', classe: 'partida', popup: 'Partida' },
    ...rota.paradas.map((p, i) => ({ ...p, texto: p.numero ?? i + 1, popup: `${p.numero ?? i + 1}. ${p.endereco}` })),
    ...(rota.destino ? [{ ...rota.destino, texto: '⌂', classe: 'destino', popup: rota.destino.rotulo }] : []),
  ]
}
