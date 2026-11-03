export const empresasDoPerfil = (perfil) =>
  [...(perfil?.empresas || []), ...(perfil?.outraEmpresa?.trim() ? [perfil.outraEmpresa.trim()] : [])]

export function formatarReais(valor, comSimbolo = true) {
  const texto = Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return comSimbolo ? `R$ ${texto}` : texto
}

// "1.234,56" ou "180" → número
export const lerReais = (texto) => {
  const limpo = String(texto ?? '').replace(/[^\d,.]/g, '')
  if (!limpo) return null
  const n = limpo.includes(',') ? Number(limpo.replace(/\./g, '').replace(',', '.')) : Number(limpo)
  return Number.isFinite(n) ? n : null
}

export function formatarDuracao(ms) {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

export const formatarData = (t) => new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
