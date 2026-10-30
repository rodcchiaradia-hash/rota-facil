import { useEffect, useRef } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats as F } from 'html5-qrcode'

const FORMATOS = [F.QR_CODE, F.CODE_128, F.CODE_39, F.CODE_93, F.EAN_13, F.EAN_8, F.ITF, F.DATA_MATRIX, F.PDF_417, F.UPC_A]

// Câmera ao vivo lendo QR Code e código de barras.
export default function Camera({ onLeu, onErro }) {
  const onLeuRef = useRef(onLeu)
  onLeuRef.current = onLeu

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
          qrbox: (w, h) => ({ width: Math.max(50, Math.floor(w * 0.85)), height: Math.max(50, Math.floor(Math.min(h * 0.6, w * 0.6))) }),
        },
        (codigo) => onLeuRef.current(codigo),
        () => {},
      )
      .catch((e) => onErro(textoErroCamera(e)))

    return () => {
      iniciando.then(() => leitor.isScanning && leitor.stop()).then(() => leitor.clear()).catch(() => {})
    }
  }, [])

  return <div id="camera" />
}

function textoErroCamera(e) {
  const msg = String(e?.message || e)
  if (/permission|notallowed/i.test(msg)) return 'Sem permissão para a câmera. Libere a câmera para este site nas configurações do navegador.'
  if (/notfound|no camera|requested device not found/i.test(msg)) return 'Nenhuma câmera encontrada neste aparelho.'
  if (/secure|https/i.test(msg)) return 'A câmera só funciona em endereço seguro (https).'
  return 'Não foi possível abrir a câmera. Use "Foto do endereço" ou "Digitar".'
}
