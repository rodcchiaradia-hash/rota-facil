import { useState } from 'react'
import { apagarConta, conferirSenha, exportarDados, modoTeste } from './auth.js'
import { apagarTodosComprovantes, DIAS_GUARDADOS } from './comprovantes.js'

// Direitos da LGPD: ver/baixar os dados e apagar tudo.
export default function MeusDados({ usuario, onApagou }) {
  const [apagando, setApagando] = useState(false)
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  function baixar() {
    const blob = new Blob([JSON.stringify(exportarDados(usuario), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `rota-facil-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }

  async function confirmar(e) {
    e.preventDefault()
    setErro('')
    try {
      if (!(await conferirSenha(usuario.email, senha))) return setErro('Senha incorreta.')
      await apagarTodosComprovantes().catch(() => {})
      await apagarConta(usuario)
      onApagou()
    } catch (err) { setErro(err.message) }
  }

  return (
    <section className="cartao">
      <h2>Seus dados e privacidade</h2>
      <p className="dica">
        Fotos e assinaturas das entregas ficam guardadas por {DIAS_GUARDADOS} dias e depois são apagadas sozinhas.
        {modoTeste ? ' Na fase de testes tudo fica só neste celular.' : ''}
      </p>
      <button type="button" className="botao secundario" onClick={baixar}>Baixar uma cópia dos meus dados</button>
      {!apagando ? (
        <button type="button" className="botao-texto perigo" onClick={() => setApagando(true)}>Apagar minha conta e meus dados</button>
      ) : (
        <form onSubmit={confirmar}>
          <p className="erro">Isso apaga seu cadastro, rotas, histórico, endereços, fotos e assinaturas deste celular. Não dá para desfazer.</p>
          <label>Digite sua senha para confirmar
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
          </label>
          {erro && <p className="erro">{erro}</p>}
          <button className="botao perigo-cheio">Apagar tudo</button>
          <button type="button" className="botao-texto" onClick={() => { setApagando(false); setSenha(''); setErro('') }}>Cancelar</button>
        </form>
      )}
    </section>
  )
}
