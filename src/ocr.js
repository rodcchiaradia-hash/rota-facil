// Lê o texto de uma foto no próprio celular (Tesseract.js, português).
export async function lerTextoDaFoto(arquivo, onProgresso) {
  const imagem = await prepararImagem(arquivo)
  // Carregado só quando usado: a primeira leitura baixa o leitor e o dicionário.
  const { createWorker } = await import('tesseract.js')
  const ocr = `${location.origin}${import.meta.env.BASE_URL}ocr`
  const worker = await createWorker('por', 1, {
    workerPath: `${ocr}/worker.min.js`,
    corePath: ocr,
    langPath: ocr,
    logger: (m) => m.status === 'recognizing text' && onProgresso(Math.round(m.progress * 100)),
  })
  try {
    const { data } = await worker.recognize(imagem)
    return limparTexto(data.text)
  } finally {
    await worker.terminate()
  }
}

const TIPO_RUA = /\b(rua|r\.|avenida|av\.?|alameda|al\.|travessa|tv\.|pra[çc]a|rodovia|estrada|largo)\s/i

// Tenta separar CEP, rua, número e complemento do texto lido. A pessoa confere depois.
export function extrairEndereco(texto) {
  const cep = texto.match(/\b(\d{5})[-.\s]?(\d{3})\b/)
  const linhaRua = texto.split('\n').find((l) => TIPO_RUA.test(l)) || ''
  let rua = '', numero = '', complemento = ''
  if (linhaRua) {
    const inicio = linhaRua.slice(linhaRua.search(TIPO_RUA))
    const m = inicio.match(/^(.*?)[,\s]+(?:n[º°o]?\.?\s*)?(\d{1,5})\b\s*[-,]?\s*(.*)$/i)
    if (m) [, rua, numero, complemento] = m
    else rua = inicio
  }
  return {
    cep: cep ? `${cep[1]}-${cep[2]}` : '',
    rua: rua.trim(),
    numero,
    complemento: complemento.replace(/\bCEP\b.*$/i, '').trim(),
  }
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
