import { useState } from 'react'
import { problemaNaSenha } from './auth.js'
import Logo from './Logo.jsx'

// Usada depois do link de "esqueci a senha" e em "Trocar minha senha".
export default function NovaSenha({ pedirAtual = false, onSalvar, onCancelar, titulo = 'Criar nova senha' }) {
  const [atual, setAtual] = useState('')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    const problema = problemaNaSenha(senha) || (senha !== senha2 ? 'As duas senhas não são iguais.' : '')
    setErro(problema)
    if (problema) return
    setEnviando(true)
    try { await onSalvar(senha, atual) } catch (err) { setErro(err.message) } finally { setEnviando(false) }
  }

  const form = (
    <form className={pedirAtual ? '' : 'cartao'} onSubmit={enviar}>
      {!pedirAtual && <h1>{titulo}</h1>}
      {pedirAtual && (
        <label>Senha atual
          <input type="password" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" />
        </label>
      )}
      <label>Nova senha
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" placeholder="8 ou mais, com letras e números" />
      </label>
      <label>Repita a nova senha
        <input type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} autoComplete="new-password" />
      </label>
      {erro && <p className="erro">{erro}</p>}
      <button className="botao principal" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar nova senha'}</button>
      {onCancelar && <button type="button" className="botao-texto" onClick={onCancelar}>Cancelar</button>}
    </form>
  )
  return pedirAtual ? form : <main className="tela tela-login"><Logo tamanho={56} />{form}</main>
}
