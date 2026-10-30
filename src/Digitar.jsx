import { useState } from 'react'

// Último recurso: digitar o código e/ou o endereço do pacote.
export default function Digitar({ onSalvar }) {
  const [codigo, setCodigo] = useState('')
  const [rua, setRua] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState(() => localStorage.getItem('rf:cidade') || '')

  const endereco = [rua, complemento, bairro, cidade].map((s) => s.trim()).filter(Boolean).join(', ')

  function salvar(e) {
    e.preventDefault()
    onSalvar({ codigo: codigo.trim(), endereco })
    localStorage.setItem('rf:cidade', cidade.trim())
    setCodigo(''); setRua(''); setComplemento(''); setBairro('')
  }

  return (
    <form className="painel" onSubmit={salvar}>
      <label>
        Código do pacote <span className="opcional">(se tiver)</span>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} autoCapitalize="characters" placeholder="Ex.: 4567891234" />
      </label>
      <label>
        Rua e número
        <input value={rua} onChange={(e) => setRua(e.target.value)} autoComplete="address-line1" placeholder="Ex.: Rua Paulo Piedade Campos, 120" />
      </label>
      <label>
        Complemento <span className="opcional">(apto, bloco, casa)</span>
        <input value={complemento} onChange={(e) => setComplemento(e.target.value)} autoComplete="address-line2" />
      </label>
      <div className="linha-dupla">
        <label>
          Bairro
          <input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Ex.: Buritis" />
        </label>
        <label>
          Cidade
          <input value={cidade} onChange={(e) => setCidade(e.target.value)} autoComplete="address-level2" placeholder="Ex.: Belo Horizonte" />
        </label>
      </div>
      <button className="botao principal" disabled={!codigo.trim() && !rua.trim()}>Salvar pacote</button>
      <p className="dica">Preencha pelo menos o código ou a rua. A cidade fica guardada para o próximo pacote.</p>
    </form>
  )
}
