import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

// Quadro para o recebedor assinar com o dedo.
const Assinatura = forwardRef(function Assinatura({ onMudou }, ref) {
  const canvasRef = useRef(null)
  const desenhando = useRef(false)
  const [vazia, setVazia] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    const escala = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * escala
    canvas.height = canvas.offsetHeight * escala
    const ctx = canvas.getContext('2d')
    ctx.scale(escala, escala)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0B1F3D'
  }, [])

  const ponto = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }

  function comecar(e) {
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)
    desenhando.current = true
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(...ponto(e))
  }

  function mover(e) {
    if (!desenhando.current) return
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(...ponto(e))
    ctx.stroke()
    if (vazia) { setVazia(false); onMudou?.(false) }
  }

  function limpar() {
    const c = canvasRef.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    setVazia(true)
    onMudou?.(true)
  }

  useImperativeHandle(ref, () => ({
    vazia: () => vazia,
    paraBlob: () => new Promise((ok) => canvasRef.current.toBlob(ok, 'image/png')),
  }))

  return (
    <div className="assinatura">
      <canvas ref={canvasRef} onPointerDown={comecar} onPointerMove={mover}
        onPointerUp={() => (desenhando.current = false)} onPointerCancel={() => (desenhando.current = false)} />
      {vazia ? <span className="assinatura-dica">Assine aqui com o dedo</span>
        : <button type="button" className="botao-texto" onClick={limpar}>Limpar</button>}
    </div>
  )
})

export default Assinatura
