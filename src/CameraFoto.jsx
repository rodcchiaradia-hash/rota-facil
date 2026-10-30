import { useEffect, useRef, useState } from 'react'

// Câmera ao vivo para fotografar o endereço com um toque, sem sair do app.
export default function CameraFoto({ onFoto, onDigitar }) {
  const videoRef = useRef(null)
  const [pronta, setPronta] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let stream
    let cancelado = false
    async function abrir(tentativa = 0) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
        if (cancelado) return stream.getTracks().forEach((t) => t.stop())
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
        setPronta(true)
      } catch (e) {
        // O leitor de código de barras pode ainda estar soltando a câmera: tenta de novo.
        if (tentativa < 3 && !cancelado) return setTimeout(() => abrir(tentativa + 1), 400)
        if (!cancelado) setErro('Não foi possível abrir a câmera. Digite o endereço.')
      }
    }
    abrir()
    return () => {
      cancelado = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function fotografar() {
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob((blob) => onFoto(blob), 'image/jpeg', 0.92)
  }

  return (
    <div className="camera-foto">
      <div className="camera-caixa">
        <video ref={videoRef} playsInline muted />
        {!pronta && !erro && <p className="camera-erro">Abrindo a câmera…</p>}
        {erro && <p className="erro camera-erro">{erro}</p>}
      </div>
      <p className="dica">Enquadre o bloco do endereço da etiqueta, de perto e com boa luz.</p>
      <button type="button" className="botao principal grande" onClick={fotografar} disabled={!pronta}>
        📸 Fotografar endereço
      </button>
      <button type="button" className="botao-texto" onClick={onDigitar}>Não deu certo? Digitar o endereço</button>
    </div>
  )
}
