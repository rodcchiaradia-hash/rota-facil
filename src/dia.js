// Jornada do dia, histórico de dias encerrados e "Minhas rotas". Tudo no celular por enquanto.
import { lerPacotes, salvarPacotes, lerEsperado, salvarEsperado } from './pacotes.js'
import { lerRota } from './rota.js'

const ler = (chave, padrao) => {
  try { return JSON.parse(localStorage.getItem(chave)) ?? padrao } catch { return padrao }
}
const gravar = (chave, valor) => localStorage.setItem(chave, JSON.stringify(valor))

export const lerDia = (u) => ler(`rf:dia:${u}`, null)
export const salvarDia = (u, dia) => gravar(`rf:dia:${u}`, dia)
export const lerHistorico = (u) => ler(`rf:historico:${u}`, [])
export const salvarHistorico = (u, h) => gravar(`rf:historico:${u}`, h)
export const lerMinhasRotas = (u) => ler(`rf:minhas-rotas:${u}`, [])
export const salvarMinhasRotas = (u, rotas) => gravar(`rf:minhas-rotas:${u}`, rotas)
export const lerConfig = (u) => ler(`rf:config:${u}`, { precoLitro: 6.2 })
export const salvarConfig = (u, c) => gravar(`rf:config:${u}`, c)

// Resumo do dia a partir da rota e das entregas registradas.
export function resumirDia(dia, pacotes, rota) {
  const entregas = Object.values(rota?.entregas || {})
  const horarios = entregas.map((e) => e.quando).sort((a, b) => a - b)
  const inicio = rota?.iniciadaEm || dia.inicio
  const fim = horarios.at(-1) || Date.now()
  // Tempo de cada entrega = tempo desde a entrega anterior (ou desde o início da rota).
  const intervalos = horarios.map((h, i) => h - (i ? horarios[i - 1] : inicio)).filter((x) => x >= 0)
  const entreguesLista = Object.entries(rota?.entregas || {}).filter(([, e]) => e.status === 'entregue')
  let maisDemorada = null
  if (rota) {
    const ordenadas = Object.entries(rota.entregas || {}).sort((a, b) => a[1].quando - b[1].quando)
    ordenadas.forEach(([id, e], i) => {
      const t = e.quando - (i ? ordenadas[i - 1][1].quando : inicio)
      if (!maisDemorada || t > maisDemorada.tempo) {
        const p = rota.paradas.find((x) => x.id === id)
        maisDemorada = { tempo: t, endereco: p?.endereco, numero: p?.numero }
      }
    })
  }
  const trilha = analisarTrilha(rota?.trilha || [])
  return {
    totalPacotes: Math.max(pacotes.length, rota?.paradas.length || 0),
    entregues: entreguesLista.length,
    problemas: entregas.length - entreguesLista.length,
    pendentes: (rota?.paradas.length || 0) - entregas.length,
    kmPlanejado: rota ? rota.distancia / 1000 : 0,
    kmPercorrido: trilha.km,
    tempoParado: trilha.parado,
    inicio,
    fim,
    tempoTotal: horarios.length ? fim - inicio : 0,
    tempoMedio: intervalos.length ? intervalos.reduce((a, b) => a + b, 0) / intervalos.length : 0,
    maisDemorada,
  }
}

// Trilha do GPS: km rodados e tempo parado (trechos abaixo de ~3 km/h).
export function analisarTrilha(trilha) {
  let km = 0
  let parado = 0
  for (let i = 1; i < trilha.length; i++) {
    const [a, b] = [trilha[i - 1], trilha[i]]
    const m = metros(a, b)
    const s = (b.t - a.t) / 1000
    if (s <= 0 || s > 600) continue // buraco no GPS (tela apagada): ignora
    if (m / s < 0.8) parado += s * 1000
    else km += m / 1000
  }
  return { km, parado }
}

export function metros(a, b) {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Encerra o dia: guarda o resumo no histórico e limpa pacotes, conferência e rota para o próximo.
export function encerrarDia(u) {
  const dia = lerDia(u)
  const pacotes = lerPacotes(u)
  const rota = lerRota(u)
  const resumo = resumirDia(dia, pacotes, rota)
  const registro = {
    ...dia,
    fimDia: Date.now(),
    esperado: lerEsperado(u),
    resumo,
    entregas: rota ? rota.paradas.map((p) => ({ numero: p.numero, endereco: p.endereco, codigo: p.codigo, ...(rota.entregas?.[p.id] || { status: 'pendente' }) })) : [],
  }
  salvarHistorico(u, [registro, ...lerHistorico(u)])
  salvarPacotes(u, [])
  salvarEsperado(u, 0)
  localStorage.removeItem(`rf:rota:${u}`)
  localStorage.removeItem(`rf:dia:${u}`)
  return registro
}

