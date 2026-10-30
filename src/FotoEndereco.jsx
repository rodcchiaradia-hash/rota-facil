import { useState } from 'react'

// Tira foto da etiqueta e lê o texto do endereço (OCR) no próprio celular.
export default function FotoEndereco({ onSalvar }) {
  const [foto, setFoto] = useState(null)
  const [texto, setTexto] = useState('')
  const [progresso, setProgresso] = useState(null)
  const [erro, setErro] = useState('')

  async function escolheuFoto(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setErro(''); setTexto('')
    setFoto(URL.createObjectURL(arquivo))
    setProgresso(0)
    try {
      const imagem = await prepararImagem(arquivo)
      // Carregado só quando usado: a primeira leitura baixa o dicionário de português.
      const { createWorker } = await import('tesseract.js')
      const ocr = `${location.origin}${import.meta.env.BASE_URL}ocr`
      const worker = await createWorker('por', 1, {
        workerPath: `${ocr}/worker.min.js`,
        corePath: ocr,
        langPath: ocr,
        logger: (m) => m.status === 'recognizing text' && setProgresso(Math.round(m.progress * 100)),
      })
      const { data } = await worker.recognize(imagem)
      await worker.terminate()
      const limpo = limparTexto(data.text)
      setTexto(limpo)
      if (!limpo) setErro('Não consegui ler o texto. Tente outra foto, mais perto e com boa luz, ou digite.')
    } catch {
      setErro('Não foi possível ler a foto. Verifique a internet na primeira vez e tente de novo.')
    } finally {
      setProgresso(null)
    }
  }

  function salvar() {
    onSalvar(texto)
    setFoto(null); setTexto('')
  }

  return (
    <div className="painel">
      <label className="botao principal grande botao-arquivo">
        📷 {foto ? 'Tirar outra foto' : 'Fotografar o endereço'}
        <input type="file" accept="image/*" capture="environment" onChange={escolheuFoto} hidden />
      </label>
      {!foto && <p className="dica">Enquadre só o bloco do endereço da etiqueta, de perto e com boa luz.</p>}
      {foto && <img className="previa" src={foto} alt="Foto da etiqueta" />}
      {progresso !== null && <p className="dica">Lendo o texto… {progresso}%</p>}
      {erro && <p className="erro">{erro}</p>}
      {texto && (
        <>
          <label>
            Confira e corrija o endereço
            <textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </label>
          <button className="botao principal" onClick={salvar} disabled={!texto.trim()}>Salvar pacote</button>
        </>
      )}
    </div>
  )
}

// Reduz a foto e passa para tons de cinza: lê mais rápido e com menos erro.
async function prepararImagem(arquivo) {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  const ctx = canvas.getContext('2d')
  ctx.filter = 'grayscale(1) contrast(1.4)'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas
}

function limparTexto(texto) {
  return texto
    .split('\n')
    .map((linha) => linha.replace(/[^\p{L}\p{N}\s,.\-/ºª°#:()]/gu, '').replace(/\s+/g, ' ').trim())
    .filter((linha) => linha.length > 2)
    .join('\n')
}
