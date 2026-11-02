import { useRef, useState } from 'react'
import Assinatura from './Assinatura.jsx'
import { comprimirFoto } from './comprovantes.js'

const RECEBEDORES = ['Próprio destinatário', 'Familiar', 'Porteiro / recepção', 'Vizinho', 'Outro']

// Passo 5: comprovante da entrega (foto, assinatura e quem recebeu).
export default function RegistroEntrega({ parada, onConfirmar }) {
  const [foto, setFoto] = useState(null)
  const [tipo, setTipo] = useState(RECEBEDORES[0])
  const [nome, setNome] = useState('')
  const [assinou, setAssinou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const assinatura = useRef(null)

  async function escolheuFoto(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (arquivo) setFoto(await comprimirFoto(arquivo))
  }

  async function confirmar() {
    setSalvando(true)
    const blobAssinatura = assinou ? await assinatura.current.paraBlob() : null
    await onConfirmar({ foto, assinatura: blobAssinatura, recebedor: { tipo, nome: nome.trim() } })
    setSalvando(false)
  }

  return (
    <>
      <p className="dica">Parada {parada.numero} · {parada.endereco}</p>

      <label className={`botao ${foto ? 'secundario' : 'principal'} botao-arquivo`}>
        📷 {foto ? 'Tirar outra foto' : 'Foto do pacote entregue'}
        <input type="file" accept="image/*" capture="environment" onChange={escolheuFoto} hidden />
      </label>
      {foto && <img className="previa" src={URL.createObjectURL(foto)} alt="Foto da entrega" />}

      <strong>Quem recebeu?</strong>
      <div className="opcoes">
        {RECEBEDORES.map((r) => (
          <button key={r} type="button" className={tipo === r ? 'ativa' : ''} onClick={() => setTipo(r)}>{r}</button>
        ))}
      </div>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome de quem recebeu (opcional)" autoCapitalize="words" />

      <strong>Assinatura</strong>
      <Assinatura ref={assinatura} onMudou={(vazia) => setAssinou(!vazia)} />

      <button className="botao verde grande" onClick={confirmar} disabled={salvando || (!foto && !assinou)}>
        {salvando ? 'Salvando…' : '✓ Confirmar entrega'}
      </button>
      {!foto && !assinou && <p className="dica centro">Tire a foto ou colete a assinatura para confirmar.</p>}
    </>
  )
}
