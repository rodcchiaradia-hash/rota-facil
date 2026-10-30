import { useRef, useState } from 'react'
import { buscarCep, formatarCep, montarEndereco } from './cep.js'
import { lerTextoDaFoto, extrairEndereco } from './ocr.js'
import CameraFoto from './CameraFoto.jsx'

const VAZIO = { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '' }

// Endereço do pacote: primeiro a foto (a câmera já abre), digitar só em último caso.
// Antes de salvar sempre mostra o endereço completo para conferir e corrigir.
export default function ConfirmarPacote({ codigo = '', comecarPelaFoto = true, onSalvar, onCancelar }) {
  const [etapa, setEtapa] = useState(comecarPelaFoto ? 'foto' : 'campos')
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

  async function tirouFoto(arquivo) {
    setEtapa('campos')
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
    onSalvar({ codigo, endereco: completo ? endereco : '', campos: completo ? campos : null })
  }

  const cabecalho = codigo && (
    <div className="lido">
      <span>Código do pacote ✓</span>
      <strong>{codigo}</strong>
    </div>
  )

  if (etapa === 'foto') {
    return (
      <div className="painel">
        {cabecalho}
        <CameraFoto onFoto={tirouFoto} onDigitar={() => setEtapa('campos')} />
        {codigo && (
          <button type="button" className="botao-texto" onClick={() => onSalvar({ codigo, endereco: '' })}>
            Salvar só o código e completar depois
          </button>
        )}
        {onCancelar && <button type="button" className="botao-texto perigo" onClick={onCancelar}>Cancelar</button>}
      </div>
    )
  }

  return (
    <form className="painel" onSubmit={salvar}>
      {cabecalho}

      {foto && <img className="previa" src={foto} alt="Foto da etiqueta" />}
      {progresso !== null && <p className="dica">Lendo o endereço da foto… {progresso}%</p>}
      <button type="button" className="botao secundario" onClick={() => setEtapa('foto')}>
        📸 {foto ? 'Tirar outra foto' : 'Fotografar o endereço'}
      </button>
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
