// Lista de pacotes do dia, guardada no próprio celular por enquanto.
const chave = (usuarioId) => `rf:pacotes:${usuarioId}`

export function lerPacotes(usuarioId) {
  try {
    return JSON.parse(localStorage.getItem(chave(usuarioId))) || []
  } catch {
    return []
  }
}

export function salvarPacotes(usuarioId, pacotes) {
  localStorage.setItem(chave(usuarioId), JSON.stringify(pacotes))
}
