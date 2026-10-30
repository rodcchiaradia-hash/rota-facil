// Rota do dia e endereço de casa, guardados no celular por enquanto.
const ler = (chave, padrao) => {
  try { return JSON.parse(localStorage.getItem(chave)) ?? padrao } catch { return padrao }
}

export const lerRota = (usuarioId) => ler(`rf:rota:${usuarioId}`, null)
export const salvarRota = (usuarioId, rota) => localStorage.setItem(`rf:rota:${usuarioId}`, JSON.stringify(rota))
export const lerCasa = (usuarioId) => ler(`rf:casa:${usuarioId}`, null)
export const salvarCasa = (usuarioId, casa) => localStorage.setItem(`rf:casa:${usuarioId}`, JSON.stringify(casa))

export const bagDaParada = (numero, tamanhoBag) => Math.ceil(numero / tamanhoBag)

// A rota fica velha se os pacotes com endereço mudaram depois que ela foi montada.
export function rotaDesatualizada(rota, pacotes) {
  if (!rota) return false
  const atuais = pacotes.filter((p) => p.endereco).map((p) => p.id || p.codigo).sort().join('|')
  const naRota = [...rota.paradas.map((p) => p.id), ...rota.naoLocalizados.map((p) => p.id)].sort().join('|')
  return atuais !== naRota
}
