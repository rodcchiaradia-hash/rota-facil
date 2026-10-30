// ViaCEP é grátis e sem cadastro; BrasilAPI fica de reserva se ele cair.
export async function buscarCep(cep) {
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    if (r.ok) {
      const d = await r.json()
      if (d.erro) return null
      return { rua: d.logradouro, bairro: d.bairro, cidade: `${d.localidade}/${d.uf}` }
    }
  } catch {}
  const r = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`)
  if (r.status === 404) return null
  if (!r.ok) throw new Error('falha')
  const d = await r.json()
  return { rua: d.street || '', bairro: d.neighborhood || '', cidade: `${d.city}/${d.state}` }
}

export const formatarCep = (valor) => {
  const d = valor.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export function montarEndereco({ cep, rua, numero, complemento, bairro, cidade }) {
  const linhaRua = [rua.trim(), numero.trim()].filter(Boolean).join(', ')
  return [
    complemento.trim() ? `${linhaRua} - ${complemento.trim()}` : linhaRua,
    bairro.trim(),
    cidade.trim(),
    cep.length === 9 ? `CEP ${cep}` : '',
  ].filter(Boolean).join(', ')
}
