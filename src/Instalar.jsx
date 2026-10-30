import { useEffect, useState } from 'react'

const jaInstalado = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
const ehIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

// Mostra como colocar o app na tela inicial do celular.
export default function Instalar() {
  const [pedido, setPedido] = useState(null)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    const guardar = (e) => { e.preventDefault(); setPedido(e) }
    window.addEventListener('beforeinstallprompt', guardar)
    return () => window.removeEventListener('beforeinstallprompt', guardar)
  }, [])

  if (jaInstalado()) return null

  async function instalar() {
    if (pedido) {
      pedido.prompt()
      await pedido.userChoice
      setPedido(null)
    } else setAberto(!aberto)
  }

  return (
    <div className="cartao instalar">
      <button className="botao secundario" onClick={instalar}>📲 Instalar o app no celular</button>
      {aberto && (
        <p className="dica">
          {ehIphone()
            ? 'No Safari, toque no botão Compartilhar (quadrado com seta) e depois em "Adicionar à Tela de Início".'
            : 'No Chrome, toque nos três pontinhos (⋮) e depois em "Instalar app" ou "Adicionar à tela inicial".'}
        </p>
      )}
    </div>
  )
}
