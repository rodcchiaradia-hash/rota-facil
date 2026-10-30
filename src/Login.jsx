import { useState } from 'react'
import { entrar, criarConta, recuperarSenha, modoTeste } from './auth.js'
import Logo from './Logo.jsx'

export default function Login({ onEntrou }) {
  const [modo, setModo] = useState('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro(''); setAviso('')
    if (modo !== 'recuperar' && senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    setEnviando(true)
    try {
      if (modo === 'entrar') {
        onEntrou(await entrar(email.trim(), senha))
      } else if (modo === 'criar') {
        const { usuario, precisaConfirmar } = await criarConta(email.trim(), senha)
        if (precisaConfirmar) {
          setAviso('Conta criada! Abra seu e-mail e clique no link de confirmação. Depois volte e entre.')
          setModo('entrar')
        } else onEntrou(usuario)
      } else {
        await recuperarSenha(email.trim())
        setAviso('Enviamos um link para seu e-mail para criar uma nova senha.')
        setModo('entrar')
      }
    } catch (err) {
      setErro(err.message || 'Não foi possível continuar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  const titulos = { entrar: 'Entrar', criar: 'Criar conta', recuperar: 'Recuperar senha' }

  return (
    <main className="tela tela-login">
      <Logo tamanho={72} />
      <form className="cartao" onSubmit={enviar}>
        <h1>{titulos[modo]}</h1>
        <label>
          E-mail
          <input type="email" inputMode="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
        </label>
        {modo !== 'recuperar' && (
          <label>
            Senha
            <input type="password" autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} required
              value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mínimo 6 caracteres" />
          </label>
        )}
        {erro && <p className="erro">{erro}</p>}
        {aviso && <p className="aviso">{aviso}</p>}
        <button className="botao principal" disabled={enviando}>
          {enviando ? 'Aguarde…' : modo === 'recuperar' ? 'Enviar link' : titulos[modo]}
        </button>
        <div className="links">
          {modo === 'entrar' ? (
            <>
              <button type="button" onClick={() => setModo('criar')}>Criar conta</button>
              {!modoTeste && <button type="button" onClick={() => setModo('recuperar')}>Esqueci a senha</button>}
            </>
          ) : (
            <button type="button" onClick={() => setModo('entrar')}>Já tenho conta</button>
          )}
        </div>
      </form>
    </main>
  )
}
