// Banco de endereços já usados neste celular, para não digitar de novo quem recebe sempre.
const CHAVE = 'rf:enderecos'
const LIMITE = 2000

const so = (v) => String(v || '').replace(/\D/g, '')
const igual = (a, b) => so(a.cep) === so(b.cep) && String(a.numero).trim().toLowerCase() === String(b.numero).trim().toLowerCase()
  && String(a.complemento || '').trim().toLowerCase() === String(b.complemento || '').trim().toLowerCase()

export function lerEnderecos() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || [] } catch { return [] }
}

export function lembrarEndereco(campos) {
  if (!campos?.rua || !campos?.numero) return
  const lista = lerEnderecos()
  const achado = lista.find((e) => igual(e, campos))
  const item = { ...(achado || {}), ...campos, vezes: (achado?.vezes || 0) + 1, ultimo: Date.now() }
  const resto = lista.filter((e) => e !== achado)
  try { localStorage.setItem(CHAVE, JSON.stringify([item, ...resto].slice(0, LIMITE))) } catch { /* sem espaço */ }
}

// Endereços já usados com o mesmo CEP (os mais usados primeiro).
export function enderecosDoCep(cep) {
  const d = so(cep)
  if (d.length !== 8) return []
  return lerEnderecos().filter((e) => so(e.cep) === d).sort((a, b) => b.vezes - a.vezes || b.ultimo - a.ultimo).slice(0, 5)
}

// Busca livre por rua, número ou bairro.
export function buscarEnderecos(texto) {
  const termos = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean)
  if (!termos.length) return []
  return lerEnderecos().filter((e) => {
    const alvo = [e.rua, e.numero, e.complemento, e.bairro, e.cidade, e.cep].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    return termos.every((t) => alvo.includes(t))
  }).slice(0, 6)
}
