import { useEffect, useState } from 'react'
import { usuarioAtual, aoMudarLogin, sair, modoTeste, criarConta, lerPerfil, salvarPerfil } from './auth.js'
import Cadastro from './Cadastro.jsx'
import Login from './Login.jsx'
import Inicio from './Inicio.jsx'
import Escanear from './Escanear.jsx'
import Conferir from './Conferir.jsx'
import Rota from './Rota.jsx'
import Carregar from './Carregar.jsx'
import EmRota from './EmRota.jsx'

export default function App() {
  const [usuario, setUsuario] = useState(undefined)
  const [tela, setTela] = useState('inicio')
  const [telaLogin, setTelaLogin] = useState('entrar')
  const [avisoLogin, setAvisoLogin] = useState('')

  useEffect(() => {
    usuarioAtual().then(setUsuario)
    return aoMudarLogin(setUsuario)
  }, [])

  if (usuario === undefined) return <div className="carregando">Carregando…</div>

  async function cadastrar(perfil, { email, senha }) {
    const { usuario: novo, precisaConfirmar } = await criarConta(email, senha, perfil)
    if (precisaConfirmar) {
      setAvisoLogin('Conta criada! Abra seu e-mail e toque no link de confirmação. Depois entre aqui.')
      setTelaLogin('entrar')
    } else { setTelaLogin('entrar'); setUsuario(novo) }
  }

  async function guardarPerfil(perfil) {
    setUsuario(await salvarPerfil(usuario, perfil))
    setTela('inicio')
  }

  const perfil = usuario ? lerPerfil(usuario) : null

  return (
    <>
      {modoTeste && <div className="faixa-teste">Modo de teste: os dados ficam só neste celular</div>}
      {!usuario ? (
        telaLogin === 'cadastro'
          ? <Cadastro modo="novo" onConcluir={cadastrar} onCancelar={() => setTelaLogin('entrar')} />
          : <Login onEntrou={setUsuario} onCriarConta={() => { setAvisoLogin(''); setTelaLogin('cadastro') }} avisoInicial={avisoLogin} key={avisoLogin} />
      ) : !perfil ? (
        <Cadastro modo="editar" onConcluir={guardarPerfil} />
      ) : tela === 'cadastro' ? (
        <Cadastro modo="editar" perfilInicial={perfil} onConcluir={guardarPerfil} onCancelar={() => setTela('inicio')} />
      ) : tela === 'escanear' ? (
        <Escanear usuario={usuario} onVoltar={() => setTela('inicio')} />
      ) : tela === 'rota' ? (
        <Rota usuario={usuario} onVoltar={() => setTela('inicio')} onCarregar={() => setTela('carregar')} onEmRota={() => setTela('emrota')} />
      ) : tela === 'emrota' ? (
        <EmRota usuario={usuario} onVoltar={() => setTela('inicio')} />
      ) : tela === 'carregar' ? (
        <Carregar usuario={usuario} onVoltar={() => setTela('rota')} />
      ) : tela === 'conferir' ? (
        <Conferir usuario={usuario} onVoltar={() => setTela('inicio')} onEscanear={() => setTela('escanear')} />
      ) : (
        <Inicio
          usuario={usuario}
          perfil={perfil}
          onAbrir={setTela}
          onSair={async () => { await sair(); setTelaLogin('entrar'); setUsuario(null) }}
        />
      )}
    </>
  )
}
