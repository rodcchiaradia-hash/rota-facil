import { useRef, useState } from 'react'
import { buscarCep, formatarCep, montarEndereco } from './cep.js'
import { lerTextoDaFoto, extrairEndereco } from './ocr.js'

const VAZIO = { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '' }

// Conferência do pacote antes de salvar: mostra o endereço completo e deixa corrigir.
// Usada depois de ler o código de barras, ao fotografar a etiqueta e ao digitar.
export default function ConfirmarPacote({ codigo = '', comFoto = false, onSalvar, onCancelar }) {
  const [campos, setCampos] = useState(VAZIO)
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [foto, setFoto] = useState(null)
  const [textoLido, setTextoLido] = useState('')
  const [progresso, setProgresso] = useState(null)
  const numeroRef = useRef(null)

  const mudar = (nome) => (e) => setCampos((c) => ({ ...c, [nome]: e.target.value }))
  const endereco = montarEndereco(campos)
  const completo = campos.rua.trim() && campos.numero.trim()

  async function preencherPeloCep(cep, focarNumero) {
    const digitos = cep.replace(/\D/g, '')
    if (digitos.length !== 8) return
    setBuscando(true)
    try {
      const achado = await buscarCep(digitos)
      if (!achado) return setAviso('CEP não encontrado. Confira o número ou preencha a rua.')
      setCampos((c) => ({ ...c, bairro: achado.bairro, cidade: achado.cidade, rua: achado.rua || c.rua }))
      if (!achado.rua) setAviso('Este CEP é da cidade toda. Confira a rua e o bairro.')
      else if (focarNumero) numeroRef.current?.focus()
    } catch {
      setAviso('Sem internet para buscar o CEP. Preencha a rua.')
    } finally {
      setBuscando(false)
    }
  }

  function mudouCep(e) {
    const cep = formatarCep(e.target.value)
    setCampos((c) => ({ ...c, cep }))
    setAviso('')
    preencherPeloCep(cep, true)
  }

  async function escolheuFoto(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setAviso(''); setTextoLido('')
    setFoto(URL.createObjectURL(arquivo))
    setProgresso(0)
    try {
      const texto = await lerTextoDaFoto(arquivo, setProgresso)
      setTextoLido(texto)
      if (!texto) return setAviso('Não consegui ler o texto. Tente outra foto, mais perto e com boa luz, ou digite.')
      const achado = extrairEndereco(texto)
      setCampos({ ...VAZIO, ...achado })
      if (achado.cep) await preencherPeloCep(achado.cep, false)
      else setAviso('Não achei o CEP na foto. Digite o CEP para completar o endereço.')
    } catch {
      setAviso('Não foi possível ler a foto. Tente de novo.')
    } finally {
      setProgresso(null)
    }
  }

  function salvar(e) {
    e.preventDefault()
    onSalvar({ codigo, endereco: completo ? endereco : '' })
  }

  return (
    <form className="painel" onSubmit={salvar}>
      {codigo && (
        <div className="lido">
          <span>Código lido</span>
          <strong>{codigo}</strong>
        </div>
      )}

      <label className={`botao ${comFoto ? 'principal grande' : 'secundario'} botao-arquivo`}>
        📷 {foto ? 'Tirar outra foto' : 'Fotografar o endereço da etiqueta'}
        <input type="file" accept="image/*" capture="environment" onChange={escolheuFoto} hidden />
      </label>
      {comFoto && !foto && <p className="dica">Enquadre o bloco do endereço, de perto e com boa luz. Ou digite abaixo.</p>}
      {foto && <img className="previa" src={foto} alt="Foto da etiqueta" />}
      {progresso !== null && <p className="dica">Lendo o texto… {progresso}%</p>}
      {textoLido && (
        <details className="texto-lido">
          <summary>Ver o texto lido da foto</summary>
          <pre>{textoLido}</pre>
        </details>
      )}

      <div className={`conferir ${completo ? 'ok' : ''}`}>
        <span>{completo ? 'Confira o endereço' : 'Endereço'}</span>
        <p>{endereco || 'Digite o CEP para começar'}</p>
      </div>

      <label>
        CEP
        <input value={campos.cep} onChange={mudouCep} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" />
      </label>
      {buscando && <p className="dica">Buscando endereço…</p>}
      {aviso && <p className="erro">{aviso}</p>}
      <label>
        Rua
        <input value={campos.rua} onChange={mudar('rua')} placeholder="Preenchida pelo CEP" />
      </label>
      <div className="linha-dupla">
        <label className="numero-casa">
          Número
          <input ref={numeroRef} value={campos.numero} onChange={mudar('numero')} inputMode="numeric" placeholder="Ex.: 120" />
        </label>
        <label>
          Complemento
          <input value={campos.complemento} onChange={mudar('complemento')} placeholder="Apto, bloco, casa" />
        </label>
      </div>
      <div className="linha-dupla">
        <label>
          Bairro
          <input value={campos.bairro} onChange={mudar('bairro')} />
        </label>
        <label>
          Cidade
          <input value={campos.cidade} onChange={mudar('cidade')} />
        </label>
      </div>

      <button className="botao principal" disabled={!completo}>Salvar pacote</button>
      {codigo && !completo && (
        <button type="button" className="botao-texto" onClick={() => onSalvar({ codigo, endereco: '' })}>
          Salvar só o código e completar depois
        </button>
      )}
      {onCancelar && <button type="button" className="botao-texto perigo" onClick={onCancelar}>Cancelar</button>}
    </form>
  )
}
