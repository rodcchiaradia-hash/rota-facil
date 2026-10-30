import { useEffect, useState } from 'react'
import { usuarioAtual, aoMudarLogin, sair, modoTeste } from './auth.js'
import Login from './Login.jsx'
import Inicio from './Inicio.jsx'
import Escanear from './Escanear.jsx'
import Conferir from './Conferir.jsx'
import Rota from './Rota.jsx'
import Carregar from './Carregar.jsx'

export default function App() {
  const [usuario, setUsuario] = useState(undefined)
  const [tela, setTela] = useState('inicio')

  useEffect(() => {
    usuarioAtual().then(setUsuario)
    return aoMudarLogin(setUsuario)
  }, [])

  if (usuario === undefined) return <div className="carregando">Carregando…</div>

  return (
    <>
      {modoTeste && <div className="faixa-teste">Modo de teste: os dados ficam só neste celular</div>}
      {!usuario ? (
        <Login onEntrou={setUsuario} />
      ) : tela === 'escanear' ? (
        <Escanear usuario={usuario} onVoltar={() => setTela('inicio')} />
      ) : tela === 'rota' ? (
        <Rota usuario={usuario} onVoltar={() => setTela('inicio')} onCarregar={() => setTela('carregar')} />
      ) : tela === 'carregar' ? (
        <Carregar usuario={usuario} onVoltar={() => setTela('rota')} />
      ) : tela === 'conferir' ? (
        <Conferir usuario={usuario} onVoltar={() => setTela('inicio')} onEscanear={() => setTela('escanear')} />
      ) : (
        <Inicio
          usuario={usuario}
          onAbrir={setTela}
          onSair={async () => { await sair(); setUsuario(null) }}
        />
      )}
    </>
  )
}
