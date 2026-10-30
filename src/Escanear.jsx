import { useEffect, useRef, useState } from 'react'
import Camera from './Camera.jsx'
import FotoEndereco from './FotoEndereco.jsx'
import Digitar from './Digitar.jsx'
import { lerPacotes, salvarPacotes } from './pacotes.js'

const INTERVALO_MESMO_CODIGO = 2500
const MODOS = [
  { id: 'camera', nome: 'QR / Barras' },
  { id: 'foto', nome: 'Foto do endereço' },
  { id: 'digitar', nome: 'Digitar' },
]

export default function Escanear({ usuario, onVoltar }) {
  const [pacotes, setPacotes] = useState(() => lerPacotes(usuario.id))
  const [modo, setModo] = useState('camera')
  const [mensagem, setMensagem] = useState(null)
  const [erroCamera, setErroCamera] = useState('')
  const ultimaLeitura = useRef({ codigo: '', quando: 0 })
  const pacotesRef = useRef(pacotes)

  useEffect(() => {
    pacotesRef.current = pacotes
    salvarPacotes(usuario.id, pacotes)
  }, [pacotes, usuario.id])

  function registrar({ codigo = '', endereco = '' }, origem) {
    codigo = codigo.trim()
    endereco = endereco.trim()
    if (!codigo && !endereco) return
    const agora = Date.now()
    if (origem === 'camera') {
      // A câmera lê o mesmo código várias vezes por segundo: ignora repetições imediatas.
      const ultima = ultimaLeitura.current
      if (ultima.codigo === codigo && agora - ultima.quando < INTERVALO_MESMO_CODIGO) return
      ultimaLeitura.current = { codigo, quando: agora }
    }

    const repetido = pacotesRef.current.some(
      (p) => (codigo && p.codigo === codigo) || (!codigo && endereco && normalizar(p.endereco) === normalizar(endereco)),
    )
    if (repetido) return avisar('repetido', 'Este pacote já foi adicionado')

    const id = codigo || `end-${agora}`
    setPacotes((lista) => [{ id, codigo, endereco, origem, quando: agora }, ...lista])
    avisar('ok', 'Pacote adicionado')
  }

  function avisar(tipo, texto) {
    setMensagem({ tipo, texto, id: Date.now() })
    bipe(tipo === 'ok' ? 880 : 220, tipo === 'ok' ? 0.12 : 0.35)
    navigator.vibrate?.(tipo === 'ok' ? 80 : [120, 80, 120])
  }

  useEffect(() => {
    if (!mensagem) return
    const t = setTimeout(() => setMensagem(null), 1800)
    return () => clearTimeout(t)
  }, [mensagem])

  function remover(id) {
    setPacotes((lista) => lista.filter((p) => chave(p) !== id))
  }

  function limpar() {
    if (confirm('Apagar todos os pacotes escaneados?')) setPacotes([])
  }

  return (
    <main className="tela tela-escanear">
      <header className="topo">
        <button className="botao-texto" onClick={onVoltar}>‹ Voltar</button>
        <strong>Passo 1 · Escanear</strong>
        <span />
      </header>

      <div className="abas" role="tablist">
        {MODOS.map((m) => (
          <button key={m.id} role="tab" aria-selected={modo === m.id}
            className={modo === m.id ? 'ativa' : ''} onClick={() => setModo(m.id)}>
            {m.nome}
          </button>
        ))}
      </div>

      {modo === 'camera' && (
        <div className="camera-caixa">
          <Camera onLeu={(codigo) => registrar({ codigo }, 'camera')} onErro={setErroCamera} />
          {erroCamera && <p className="erro camera-erro">{erroCamera}</p>}
        </div>
      )}
      {modo === 'foto' && <FotoEndereco onSalvar={(endereco) => registrar({ endereco }, 'foto')} />}
      {modo === 'digitar' && <Digitar onSalvar={(dados) => registrar(dados, 'digitado')} />}

      {mensagem && <div key={mensagem.id} className={`flash ${mensagem.tipo}`}>{mensagem.texto}</div>}

      <div className="contador">
        <span className="numero-grande">{pacotes.length}</span>
        <span>{pacotes.length === 1 ? 'pacote' : 'pacotes'}</span>
      </div>

      <ul className="lista">
        {pacotes.map((p, i) => (
          <li key={chave(p)}>
            <span className="ordem">{pacotes.length - i}</span>
            <span className="conteudo">
              {p.codigo && <span className="codigo">{p.codigo}</span>}
              {p.endereco && <span className="endereco">{p.endereco}</span>}
            </span>
            {p.origem !== 'camera' && <span className="etiqueta">{p.origem === 'foto' ? 'foto' : 'digitado'}</span>}
            <button className="remover" onClick={() => remover(chave(p))} aria-label="Remover">✕</button>
          </li>
        ))}
      </ul>
      {pacotes.length > 0 && <button className="botao-texto perigo" onClick={limpar}>Apagar lista</button>}
    </main>
  )
}

// Pacotes da primeira versão só tinham "codigo".
const chave = (p) => p.id || p.codigo
const normalizar = (s = '') => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')

let audio
function bipe(freq, duracao) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)()
    const osc = audio.createOscillator()
    const vol = audio.createGain()
    osc.frequency.value = freq
    vol.gain.value = 0.15
    osc.connect(vol).connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + duracao)
  } catch {}
}
