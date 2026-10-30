import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pino = (texto, classe) =>
  L.divIcon({ className: '', html: `<div class="pino ${classe}"><span>${texto}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30] })

// Mapa do OpenStreetMap com a partida, as paradas numeradas e o destino.
export default function Mapa({ rota }) {
  const caixa = useRef(null)

  useEffect(() => {
    const mapa = L.map(caixa.current, { zoomControl: true, attributionControl: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(mapa)

    const pontos = []
    if (rota.caminho?.length) L.polyline(rota.caminho, { color: '#1F6FEB', weight: 5, opacity: 0.8 }).addTo(mapa)
    L.marker([rota.partida.lat, rota.partida.lon], { icon: pino('▶', 'partida') }).addTo(mapa).bindPopup('Partida')
    pontos.push([rota.partida.lat, rota.partida.lon])
    rota.paradas.forEach((p, i) => {
      L.marker([p.lat, p.lon], { icon: pino(i + 1, '') }).addTo(mapa).bindPopup(`<b>${i + 1}.</b> ${p.endereco}`)
      pontos.push([p.lat, p.lon])
    })
    if (rota.destino) {
      L.marker([rota.destino.lat, rota.destino.lon], { icon: pino('⌂', 'destino') }).addTo(mapa).bindPopup(rota.destino.rotulo)
      pontos.push([rota.destino.lat, rota.destino.lon])
    }
    mapa.fitBounds(pontos, { padding: [30, 30] })
    return () => mapa.remove()
  }, [rota])

  return <div ref={caixa} className="mapa" />
}
