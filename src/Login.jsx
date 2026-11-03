import { useState } from 'react'
import { entrar, recuperarSenha, modoTeste } from './auth.js'
import Logo from './Logo.jsx'

export default function Login({ onEntrou, onCriarConta, avisoInicial = '' }) {
  const [recuperando, setRecuperando] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState(avisoInicial)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro(''); setAviso('')
    setEnviando(true)
    try {
      if (recuperando) {
        await recuperarSenha(email.trim())
        setAviso('Enviamos um link para seu e-mail para criar uma nova senha.')
        setRecuperando(false)
      } else {
        onEntrou(await entrar(email.trim(), senha))
      }
    } catch (err) {
      setErro(err.message || 'Não foi possível continuar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="tela tela-login">
      <Logo tamanho={72} />
      <form className="cartao" onSubmit={enviar}>
        <h1>{recuperando ? 'Recuperar senha' : 'Entrar'}</h1>
        <label>
          E-mail
          <input type="email" inputMode="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
        </label>
        {!recuperando && (
          <label>
            Senha
            <input type="password" autoComplete="current-password" required
              value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>
        )}
        {erro && <p className="erro">{erro}</p>}
        {aviso && <p className="aviso">{aviso}</p>}
        <button className="botao principal" disabled={enviando}>
          {enviando ? 'Aguarde…' : recuperando ? 'Enviar link' : 'Entrar'}
        </button>
        <div className="links">
          {recuperando ? (
            <button type="button" onClick={() => setRecuperando(false)}>Voltar</button>
          ) : (
            <button type="button" onClick={() => (modoTeste
              ? setAviso('No modo de teste a recuperação de senha ainda não funciona. Crie outra conta para testar.')
              : setRecuperando(true))}>Esqueci a senha</button>
          )}
        </div>
      </form>
      <div className="cartao criar-conta">
        <p>Ainda não tem conta?</p>
        <button className="botao secundario" onClick={onCriarConta}>Criar conta</button>
      </div>
    </main>
  )
}
