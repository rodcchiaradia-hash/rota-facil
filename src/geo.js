// Localização dos endereços e cálculo da ordem das paradas, com serviços grátis do OpenStreetMap.
// Nominatim/Photon: endereço → coordenadas. OSRM: melhor ordem entre as paradas.

const CHAVE_CACHE = 'rf:geocache'
let cache
const lerCache = () => (cache ??= JSON.parse(localStorage.getItem(CHAVE_CACHE) || '{}'))
const gravarCache = () => localStorage.setItem(CHAVE_CACHE, JSON.stringify(cache))

let ultimaChamada = 0
// O Nominatim pede no máximo uma consulta por segundo.
async function esperarVez() {
  const espera = ultimaChamada + 1100 - Date.now()
  if (espera > 0) await new Promise((r) => setTimeout(r, espera))
  ultimaChamada = Date.now()
}

async function nominatim(params) {
  await esperarVez()
  const url = new URL('https://nominatim.openstreetmap.org/search')
  Object.entries({ ...params, format: 'jsonv2', limit: 1, countrycodes: 'br', 'accept-language': 'pt-BR' })
    .forEach(([k, v]) => v && url.searchParams.set(k, v))
  const r = await fetch(url)
  if (!r.ok) throw new Error('nominatim')
  const [achado] = await r.json()
  return achado ? { lat: +achado.lat, lon: +achado.lon } : null
}

async function photon(texto) {
  const r = await fetch(`https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(texto)}`)
  if (!r.ok) return null
  const [f] = (await r.json()).features || []
  return f ? { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] } : null
}

// Tenta do mais preciso (rua e número) ao menos preciso (só o CEP).
export async function localizar(pacoteOuTexto) {
  const campos = typeof pacoteOuTexto === 'object' ? pacoteOuTexto.campos : null
  const texto = typeof pacoteOuTexto === 'object' ? pacoteOuTexto.endereco : pacoteOuTexto
  const chave = texto.toLowerCase().trim()
  if (lerCache()[chave]) return lerCache()[chave]

  const [cidade, uf] = (campos?.cidade || '').split('/')
  const tentativas = campos
    ? [
        () => nominatim({ street: `${campos.numero} ${campos.rua}`, city: cidade, state: uf, postalcode: campos.cep }),
        () => nominatim({ street: `${campos.numero} ${campos.rua}`, city: cidade, state: uf }),
        () => photon(`${campos.rua} ${campos.numero} ${cidade}`),
        () => nominatim({ street: campos.rua, city: cidade, state: uf }),
        () => campos.cep && nominatim({ postalcode: campos.cep }),
      ]
    : [
        () => nominatim({ q: semComplemento(texto) }),
        () => photon(semComplemento(texto)),
        () => cepDoTexto(texto) && nominatim({ postalcode: cepDoTexto(texto) }),
      ]
  for (const tentar of tentativas) {
    try {
      const ponto = await tentar()
      if (ponto) {
        lerCache()[chave] = ponto
        gravarCache()
        return ponto
      }
    } catch {}
  }
  return null
}

const semComplemento = (t) => t.replace(/\s-\s[^,]*/, '').replace(/CEP\s*/i, '')
const cepDoTexto = (t) => t.match(/\d{5}-\d{3}/)?.[0]

export function minhaLocalizacao() {
  return new Promise((ok, falha) => {
    if (!navigator.geolocation) return falha(new Error('sem GPS'))
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude }),
      falha,
      { enableHighAccuracy: true, timeout: 15000 },
    )
  })
}

// Melhor ordem saindo da partida e terminando no destino (ou na última entrega, se não houver destino).
// Retorna a ordem dos índices das paradas, distância (m), tempo (s) e o desenho do caminho.
export async function otimizarRota(partida, paradas, destino) {
  const pontos = [partida, ...paradas, ...(destino ? [destino] : [])]
  const coords = pontos.map((p) => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`).join(';')
  // Sem destino, calcula ida e volta e depois descarta a volta: o OSRM só fixa o fim junto com o início.
  const params = destino ? 'source=first&destination=last&roundtrip=false' : 'source=first&roundtrip=true'
  const r = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coords}?${params}&overview=full&geometries=geojson`)
  if (!r.ok) throw new Error('rota')
  const d = await r.json()
  if (d.code !== 'Ok') throw new Error(d.code)
  const viagem = d.trips[0]
  const ordem = d.waypoints
    .map((w, i) => ({ i, pos: w.waypoint_index }))
    .filter(({ i }) => i > 0 && i <= paradas.length)
    .sort((a, b) => a.pos - b.pos)
    .map(({ i }) => i - 1)
  let { distance, duration } = viagem
  if (!destino) {
    const volta = viagem.legs.at(-1)
    distance -= volta.distance
    duration -= volta.duration
  }
  const caminho = viagem.geometry.coordinates.map(([lon, lat]) => [lat, lon])
  return { ordem, distancia: distance, duracao: duration, caminho }
}
