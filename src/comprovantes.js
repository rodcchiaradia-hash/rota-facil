// Fotos e assinaturas das entregas ficam no IndexedDB do celular (cabe muito mais que no localStorage).
const BANCO = 'rota-facil'
const LOJA = 'comprovantes'

function abrir() {
  return new Promise((ok, falha) => {
    const pedido = indexedDB.open(BANCO, 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA)
    pedido.onsuccess = () => ok(pedido.result)
    pedido.onerror = () => falha(pedido.error)
  })
}

async function transacao(modo, fazer) {
  const db = await abrir()
  return new Promise((ok, falha) => {
    const t = db.transaction(LOJA, modo)
    const resultado = fazer(t.objectStore(LOJA))
    t.oncomplete = () => ok(resultado?.result)
    t.onerror = () => falha(t.error)
  })
}

export const guardarComprovante = (chave, blob) => transacao('readwrite', (loja) => loja.put(blob, chave))
export const lerComprovante = (chave) => transacao('readonly', (loja) => loja.get(chave))
export const apagarComprovante = (chave) => transacao('readwrite', (loja) => loja.delete(chave))
export const apagarTodosComprovantes = () => transacao('readwrite', (loja) => loja.clear())

// Fotos e assinaturas ficam guardadas por 90 dias (prazo para resolver reclamações) e depois são apagadas.
export const DIAS_GUARDADOS = 90
export function limparComprovantesAntigos() {
  const limite = Date.now() - DIAS_GUARDADOS * 24 * 3600 * 1000
  return transacao('readwrite', (loja) => {
    const cursor = loja.openKeyCursor()
    cursor.onsuccess = () => {
      const c = cursor.result
      if (!c) return
      const criada = Number(String(c.key).split(':')[0])
      if (criada && criada < limite) loja.delete(c.key)
      c.continue()
    }
  }).catch(() => {})
}

// Reduz a foto para ~1000px: suficiente como prova e leve para guardar e enviar depois.
export async function comprimirFoto(arquivo) {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.75))
}
