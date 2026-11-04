import { useEffect, useState } from 'react'
import { usuarioAtual, aoMudarLogin, sair, modoTeste, criarConta, lerPerfil, salvarPerfil, conferirSenha, vindoDoLinkDeSenha, definirNovaSenha } from './auth.js'
import NovaSenha from './NovaSenha.jsx'
import Cadastro from './Cadastro.jsx'
import Login from './Login.jsx'
import Inicio from './Inicio.jsx'
import Escanear from './Escanear.jsx'
import Conferir from './Conferir.jsx'
import Rota from './Rota.jsx'
import Carregar from './Carregar.jsx'
import EmRota from './EmRota.jsx'
import InicioDia from './InicioDia.jsx'
import MinhasRotas from './MinhasRotas.jsx'
import Dashboard from './Dashboard.jsx'
import Financeiro from './Financeiro.jsx'
import ResumoDia from './ResumoDia.jsx'
import MeusDados from './MeusDados.jsx'
import { encerrarDia } from './dia.js'

// Telas que o ajudante não pode abrir.
const SO_DONO = ['financeiro', 'minhasrotas', 'cadastro']

export default function App() {
  const [usuario, setUsuario] = useState(undefined)
  const [tela, setTela] = useState('inicio')
  const [telaLogin, setTelaLogin] = useState('entrar')
  const [avisoLogin, setAvisoLogin] = useState('')
  const [ajudante, setAjudante] = useState(() => localStorage.getItem('rf:ajudante') === '1')
  const [pedindoSenha, setPedindoSenha] = useState(false)
  const [diaEncerrado, setDiaEncerrado] = useState(null)
  const [novaSenha, setNovaSenha] = useState(vindoDoLinkDeSenha)

  useEffect(() => {
    usuarioAtual().then(setUsuario)
    return aoMudarLogin((u, evento) => {
      setUsuario(u)
      if (evento === 'PASSWORD_RECOVERY') setNovaSenha(true)
    })
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

  function encerrar() {
    if (!confirm('Encerrar o dia? Os pacotes e a rota de hoje vão para o histórico e a lista fica vazia para amanhã.')) return
    setDiaEncerrado(encerrarDia(usuario.id))
    setTela('resumo')
  }

  function alternarAjudante() {
    if (ajudante) return setPedindoSenha(true)
    if (!confirm('Ativar o modo ajudante? O ajudante usa os passos do dia, mas não vê o financeiro nem o cadastro. Para sair, vai precisar da sua senha.')) return
    localStorage.setItem('rf:ajudante', '1')
    setAjudante(true)
  }

  const perfil = usuario ? lerPerfil(usuario) : null
  const voltar = () => setTela('inicio')
  const telaAtual = ajudante && SO_DONO.includes(tela) ? 'inicio' : tela

  let conteudo
  if (usuario && novaSenha) {
    conteudo = <NovaSenha onSalvar={async (senha) => {
      await definirNovaSenha(senha)
      setNovaSenha(false)
      window.history.replaceState(null, '', window.location.pathname)
      alert('Senha alterada!')
    }} />
  } else if (!usuario) {
    conteudo = telaLogin === 'cadastro'
      ? <Cadastro modo="novo" onConcluir={cadastrar} onCancelar={() => setTelaLogin('entrar')} />
      : <Login onEntrou={setUsuario} onCriarConta={() => { setAvisoLogin(''); setTelaLogin('cadastro') }} avisoInicial={avisoLogin} key={avisoLogin} />
  } else if (!perfil) {
    conteudo = <Cadastro modo="editar" onConcluir={guardarPerfil} />
  } else {
    const telas = {
      cadastro: () => <Cadastro modo="editar" perfilInicial={perfil} onConcluir={guardarPerfil} onCancelar={voltar}
        rodape={<MeusDados usuario={usuario} onApagou={() => { setAjudante(false); setTela('inicio'); setTelaLogin('entrar'); setUsuario(null) }} />} />,
      iniciodia: () => <InicioDia usuario={usuario} perfil={perfil} onComecou={voltar} onVoltar={voltar} />,
      minhasrotas: () => <MinhasRotas usuario={usuario} perfil={perfil} onVoltar={voltar} />,
      dashboard: () => <Dashboard usuario={usuario} perfil={perfil} ajudante={ajudante} onVoltar={voltar} />,
      financeiro: () => <Financeiro usuario={usuario} perfil={perfil} onVoltar={voltar} />,
      resumo: () => <ResumoDia dia={diaEncerrado} mostrarDinheiro={!ajudante} onVoltar={voltar} />,
      escanear: () => <Escanear usuario={usuario} onVoltar={voltar} />,
      conferir: () => <Conferir usuario={usuario} onVoltar={voltar} onEscanear={() => setTela('escanear')} />,
      rota: () => <Rota usuario={usuario} onVoltar={voltar} onCarregar={() => setTela('carregar')} onEmRota={() => setTela('emrota')} />,
      carregar: () => <Carregar usuario={usuario} onVoltar={() => setTela('rota')} />,
      emrota: () => <EmRota usuario={usuario} onVoltar={voltar} />,
    }
    conteudo = (telas[telaAtual] && (telaAtual !== 'resumo' || diaEncerrado))
      ? telas[telaAtual]()
      : <Inicio usuario={usuario} perfil={perfil} ajudante={ajudante} onAbrir={setTela} onEncerrar={encerrar}
          onModoAjudante={alternarAjudante} onSair={async () => { await sair(); setTelaLogin('entrar'); setUsuario(null) }} />
  }

  return (
    <>
      {modoTeste && <div className="faixa-teste">Modo de teste: os dados ficam só neste celular</div>}
      {conteudo}
      {pedindoSenha && (
        <SenhaDoDono email={usuario.email} onCancelar={() => setPedindoSenha(false)} onOk={() => {
          localStorage.removeItem('rf:ajudante')
          setAjudante(false)
          setPedindoSenha(false)
        }} />
      )}
    </>
  )
}

function SenhaDoDono({ email, onOk, onCancelar }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  async function enviar(e) {
    e.preventDefault()
    try {
      if (await conferirSenha(email, senha)) onOk()
      else setErro('Senha incorreta.')
    } catch (err) { setErro(err.message) }
  }
  return (
    <div className="fundo-janela" onClick={onCancelar}>
      <form className="janela" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <div className="topo"><strong>Sair do modo ajudante</strong><button type="button" className="botao-texto" onClick={onCancelar}>Fechar</button></div>
        <label>Senha do dono da conta
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button className="botao principal">Confirmar</button>
      </form>
    </div>
  )
}
