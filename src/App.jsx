import { useEffect, useState } from 'react'
import { usuarioAtual, aoMudarLogin, sair, modoTeste } from './auth.js'
import Login from './Login.jsx'
import Inicio from './Inicio.jsx'
import Escanear from './Escanear.jsx'

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
      ) : (
        <Inicio
          usuario={usuario}
          onEscanear={() => setTela('escanear')}
          onSair={async () => { await sair(); setUsuario(null) }}
        />
      )}
    </>
  )
}
