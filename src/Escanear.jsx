import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats as F } from 'html5-qrcode'
import { lerPacotes, salvarPacotes } from './pacotes.js'

const FORMATOS = [F.QR_CODE, F.CODE_128, F.CODE_39, F.CODE_93, F.EAN_13, F.EAN_8, F.ITF, F.DATA_MATRIX, F.PDF_417, F.UPC_A]
const INTERVALO_MESMO_CODIGO = 2500

export default function Escanear({ usuario, onVoltar }) {
  const [pacotes, setPacotes] = useState(() => lerPacotes(usuario.id))
  const [mensagem, setMensagem] = useState(null)
  const [erroCamera, setErroCamera] = useState('')
  const [digitado, setDigitado] = useState('')
  const ultimaLeitura = useRef({ codigo: '', quando: 0 })
  const pacotesRef = useRef(pacotes)

  useEffect(() => {
    pacotesRef.current = pacotes
    salvarPacotes(usuario.id, pacotes)
  }, [pacotes, usuario.id])

  function registrar(codigo, origem) {
    codigo = codigo.trim()
    if (!codigo) return
    const agora = Date.now()
    const ultima = ultimaLeitura.current
    // A câmera lê o mesmo código várias vezes por segundo: ignora repetições imediatas.
    if (origem === 'camera' && ultima.codigo === codigo && agora - ultima.quando < INTERVALO_MESMO_CODIGO) return
    ultimaLeitura.current = { codigo, quando: agora }

    if (pacotesRef.current.some((p) => p.codigo === codigo)) {
      avisar('repetido', 'Este pacote já foi escaneado')
      return
    }
    setPacotes((lista) => [{ codigo, origem, quando: agora }, ...lista])
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

  useEffect(() => {
    const leitor = new Html5Qrcode('camera', {
      formatsToSupport: FORMATOS,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      verbose: false,
    })
    const iniciando = leitor
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          // Área de leitura larga, boa para código de barras e QR.
          qrbox: (w, h) => ({ width: Math.floor(w * 0.85), height: Math.floor(Math.min(h * 0.6, w * 0.6)) }),
        },
        (codigo) => registrar(codigo, 'camera'),
        () => {},
      )
      .catch((e) => setErroCamera(textoErroCamera(e)))

    return () => {
      iniciando.then(() => leitor.isScanning && leitor.stop()).then(() => leitor.clear()).catch(() => {})
    }
  }, [])

  function adicionarDigitado(e) {
    e.preventDefault()
    registrar(digitado, 'digitado')
    setDigitado('')
  }

  function remover(codigo) {
    setPacotes((lista) => lista.filter((p) => p.codigo !== codigo))
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

      <div className="camera-caixa">
        <div id="camera" />
        {erroCamera && <p className="erro camera-erro">{erroCamera}</p>}
        {mensagem && <div key={mensagem.id} className={`flash ${mensagem.tipo}`}>{mensagem.texto}</div>}
      </div>

      <div className="contador">
        <span className="numero-grande">{pacotes.length}</span>
        <span>{pacotes.length === 1 ? 'pacote' : 'pacotes'}</span>
      </div>

      <form className="digitar" onSubmit={adicionarDigitado}>
        <input value={digitado} onChange={(e) => setDigitado(e.target.value)}
          placeholder="Não leu? Digite o código" inputMode="text" autoCapitalize="characters" />
        <button className="botao principal" disabled={!digitado.trim()}>Adicionar</button>
      </form>

      <ul className="lista">
        {pacotes.map((p, i) => (
          <li key={p.codigo}>
            <span className="ordem">{pacotes.length - i}</span>
            <span className="codigo">{p.codigo}</span>
            {p.origem === 'digitado' && <span className="etiqueta">digitado</span>}
            <button className="remover" onClick={() => remover(p.codigo)} aria-label="Remover">✕</button>
          </li>
        ))}
      </ul>
      {pacotes.length > 0 && <button className="botao-texto perigo" onClick={limpar}>Apagar lista</button>}
    </main>
  )
}

function textoErroCamera(e) {
  const msg = String(e?.message || e)
  if (/permission|notallowed/i.test(msg)) return 'Sem permissão para a câmera. Libere a câmera para este site nas configurações do navegador.'
  if (/notfound|no camera|requested device not found/i.test(msg)) return 'Nenhuma câmera encontrada neste aparelho.'
  if (/secure|https/i.test(msg)) return 'A câmera só funciona em endereço seguro (https).'
  return 'Não foi possível abrir a câmera. Você pode digitar o código abaixo.'
}

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
