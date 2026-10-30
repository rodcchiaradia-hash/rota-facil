import { useRef, useState } from 'react'

// Digitar o endereço: começa pelo CEP, que preenche rua, bairro e cidade.
// O entregador só completa número e complemento.
export default function Digitar({ onSalvar }) {
  const [cep, setCep] = useState('')
  const [rua, setRua] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState('')
  const numeroRef = useRef(null)

  async function mudouCep(valor) {
    const digitos = valor.replace(/\D/g, '').slice(0, 8)
    setCep(digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos)
    setAviso('')
    if (digitos.length !== 8) return
    setBuscando(true)
    try {
      const achado = await buscarCep(digitos)
      if (!achado) {
        setAviso('CEP não encontrado. Confira o número ou preencha a rua abaixo.')
        return
      }
      setRua(achado.rua)
      setBairro(achado.bairro)
      setCidade(achado.cidade)
      // CEP geral da cidade não traz a rua: aí o cursor vai para a rua.
      if (achado.rua) numeroRef.current?.focus()
      else setAviso('Este CEP é da cidade toda. Digite a rua e o bairro.')
    } catch {
      setAviso('Sem internet para buscar o CEP. Preencha a rua abaixo.')
    } finally {
      setBuscando(false)
    }
  }

  function salvar(e) {
    e.preventDefault()
    const linhaRua = [rua.trim(), numero.trim()].filter(Boolean).join(', ')
    const partes = [
      complemento.trim() ? `${linhaRua} - ${complemento.trim()}` : linhaRua,
      bairro.trim(),
      cidade.trim(),
      cep.length === 9 ? `CEP ${cep}` : '',
    ]
    onSalvar({ endereco: partes.filter(Boolean).join(', ') })
    setCep(''); setRua(''); setBairro(''); setCidade(''); setNumero(''); setComplemento(''); setAviso('')
  }

  return (
    <form className="painel" onSubmit={salvar}>
      <label>
        CEP
        <input value={cep} onChange={(e) => mudouCep(e.target.value)} inputMode="numeric"
          autoComplete="postal-code" placeholder="00000-000" />
      </label>
      {buscando && <p className="dica">Buscando endereço…</p>}
      {aviso && <p className="erro">{aviso}</p>}

      <label>
        Rua
        <input value={rua} onChange={(e) => setRua(e.target.value)} placeholder="Preenchida pelo CEP" />
      </label>
      <div className="linha-dupla">
        <label className="numero-casa">
          Número
          <input ref={numeroRef} value={numero} onChange={(e) => setNumero(e.target.value)} inputMode="numeric" placeholder="Ex.: 120" />
        </label>
        <label>
          Complemento
          <input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, bloco, casa" />
        </label>
      </div>
      <div className="linha-dupla">
        <label>
          Bairro
          <input value={bairro} onChange={(e) => setBairro(e.target.value)} />
        </label>
        <label>
          Cidade
          <input value={cidade} onChange={(e) => setCidade(e.target.value)} />
        </label>
      </div>
      <button className="botao principal" disabled={!rua.trim() || !numero.trim()}>Salvar pacote</button>
    </form>
  )
}

// ViaCEP é grátis e sem cadastro; BrasilAPI fica de reserva se ele cair.
async function buscarCep(cep) {
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
