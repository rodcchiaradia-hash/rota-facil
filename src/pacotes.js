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

// Quantidade de pacotes que o entregador pegou na base (informada por ele no passo 2).
const chaveEsperado = (usuarioId) => `rf:esperado:${usuarioId}`

export function lerEsperado(usuarioId) {
  return Number(localStorage.getItem(chaveEsperado(usuarioId))) || 0
}

export function salvarEsperado(usuarioId, quantidade) {
  localStorage.setItem(chaveEsperado(usuarioId), String(quantidade))
}
