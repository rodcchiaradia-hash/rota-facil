import { useState } from 'react'
import Logo from './Logo.jsx'

export const EMPRESAS = ['Mercado Livre', 'Shopee', 'Amazon', 'Shein', 'Correios', 'J&T Express', 'Loggi', 'Jadlog']
const VEICULOS = ['Moto', 'Carro', 'Utilitário / van', 'Bicicleta']
const VERSAO_TERMOS = '2026-11-provisorio'

const PERFIL_VAZIO = {
  nome: '', cpf: '', nascimento: '', celular: '',
  empresas: [], outraEmpresa: '',
  veiculo: 'Carro', placa: '', consumo: '',
}

// Cadastro em etapas. "novo" inclui e-mail, senha e aceite dos termos; "editar" só os dados.
export default function Cadastro({ modo = 'novo', perfilInicial, onConcluir, onCancelar }) {
  const etapas = modo === 'novo' ? ['dados', 'acesso', 'empresas', 'veiculo'] : ['dados', 'empresas', 'veiculo']
  const [etapa, setEtapa] = useState(0)
  const [perfil, setPerfil] = useState({ ...PERFIL_VAZIO, ...perfilInicial })
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [aceite, setAceite] = useState(false)
  const [verTermos, setVerTermos] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const mudar = (campo, formatar = (v) => v) => (e) => {
    setErro('')
    setPerfil((p) => ({ ...p, [campo]: formatar(e.target.value) }))
  }
  const atual = etapas[etapa]

  function validar() {
    if (atual === 'dados') {
      if (perfil.nome.trim().split(/\s+/).length < 2) return 'Digite seu nome completo.'
      if (!cpfValido(perfil.cpf)) return 'CPF inválido. Confira os números.'
      if (idade(perfil.nascimento) < 18) return 'É preciso ter 18 anos ou mais.'
      if (perfil.celular.replace(/\D/g, '').length !== 11) return 'Digite o celular com DDD (11 números).'
    }
    if (atual === 'acesso') {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Digite um e-mail válido.'
      if (senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.'
      if (senha !== senha2) return 'As duas senhas não são iguais.'
      if (!aceite) return 'Para continuar, aceite os termos de uso e a política de privacidade.'
    }
    if (atual === 'empresas' && !perfil.empresas.length && !perfil.outraEmpresa.trim()) return 'Escolha pelo menos uma empresa.'
    return ''
  }

  async function avancar(e) {
    e.preventDefault()
    const problema = validar()
    setErro(problema)
    if (problema) return
    if (etapa < etapas.length - 1) return setEtapa(etapa + 1)
    setEnviando(true)
    try {
      const final = {
        ...perfil,
        nome: perfil.nome.trim(),
        consumo: perfil.consumo ? Number(String(perfil.consumo).replace(',', '.')) : null,
        ...(modo === 'novo' && { termos: { versao: VERSAO_TERMOS, aceitoEm: new Date().toISOString() } }),
      }
      await onConcluir(final, modo === 'novo' ? { email: email.trim(), senha } : null)
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  function alternarEmpresa(nome) {
    setPerfil((p) => ({ ...p, empresas: p.empresas.includes(nome) ? p.empresas.filter((x) => x !== nome) : [...p.empresas, nome] }))
  }

  const titulos = { dados: 'Seus dados', acesso: 'E-mail e senha', empresas: 'Empresas que você atende', veiculo: 'Seu veículo' }

  return (
    <main className="tela">
      {modo === 'novo' ? <Logo tamanho={40} /> : (
        <header className="topo">
          <button className="botao-texto" onClick={onCancelar}>‹ Voltar</button>
          <strong>Meu cadastro</strong>
          <span />
        </header>
      )}

      <div className="etapas">
        {etapas.map((nome, i) => <span key={nome} className={i <= etapa ? 'feita' : ''} />)}
      </div>

      <form className="cartao" onSubmit={avancar}>
        <h1>{titulos[atual]}</h1>
        <p className="dica">Etapa {etapa + 1} de {etapas.length}</p>

        {atual === 'dados' && (
          <>
            <label>Nome completo
              <input value={perfil.nome} onChange={mudar('nome')} autoComplete="name" autoCapitalize="words" />
            </label>
            <label>CPF
              <input value={perfil.cpf} onChange={mudar('cpf', mascaraCpf)} inputMode="numeric" placeholder="000.000.000-00" />
            </label>
            <label>Data de nascimento
              <input type="date" value={perfil.nascimento} onChange={mudar('nascimento')} />
            </label>
            <label>Celular (WhatsApp)
              <input value={perfil.celular} onChange={mudar('celular', mascaraCelular)} inputMode="tel" autoComplete="tel" placeholder="(31) 99999-9999" />
            </label>
          </>
        )}

        {atual === 'acesso' && (
          <>
            <label>E-mail
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
            </label>
            <label>Senha
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" placeholder="mínimo 8 caracteres" />
            </label>
            <label>Repita a senha
              <input type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} autoComplete="new-password" />
            </label>
            <div className="aceite">
              <input id="aceite" type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
              <span>
                <label htmlFor="aceite">Li e aceito os termos de uso e a política de privacidade. </label>
                <button type="button" className="link" onClick={() => setVerTermos(true)}>Ler os termos</button>
              </span>
            </div>
          </>
        )}

        {atual === 'empresas' && (
          <>
            <p className="dica">Marque todas para quem você entrega.</p>
            <div className="opcoes">
              {EMPRESAS.map((nome) => (
                <button key={nome} type="button" className={perfil.empresas.includes(nome) ? 'ativa' : ''} onClick={() => alternarEmpresa(nome)}>{nome}</button>
              ))}
            </div>
            <label>Outra empresa <span className="opcional">(opcional)</span>
              <input value={perfil.outraEmpresa} onChange={mudar('outraEmpresa')} placeholder="Ex.: transportadora da região" />
            </label>
          </>
        )}

        {atual === 'veiculo' && (
          <>
            <div className="opcoes">
              {VEICULOS.map((v) => (
                <button key={v} type="button" className={perfil.veiculo === v ? 'ativa' : ''} onClick={() => setPerfil((p) => ({ ...p, veiculo: v }))}>{v}</button>
              ))}
            </div>
            {perfil.veiculo !== 'Bicicleta' && (
              <>
                <label>Placa <span className="opcional">(opcional)</span>
                  <input value={perfil.placa} onChange={mudar('placa', (v) => v.toUpperCase().slice(0, 8))} placeholder="ABC1D23" autoCapitalize="characters" />
                </label>
                <label>Consumo médio (km por litro) <span className="opcional">(para calcular o combustível)</span>
                  <input value={perfil.consumo ?? ''} onChange={mudar('consumo', (v) => v.replace(/[^\d,.]/g, '').slice(0, 5))} inputMode="decimal" placeholder="Ex.: 12" />
                </label>
              </>
            )}
          </>
        )}

        {erro && <p className="erro">{erro}</p>}
        <button className="botao principal" disabled={enviando}>
          {enviando ? 'Salvando…' : etapa < etapas.length - 1 ? 'Continuar' : modo === 'novo' ? 'Criar minha conta' : 'Salvar'}
        </button>
        {etapa > 0 ? (
          <button type="button" className="botao-texto" onClick={() => { setErro(''); setEtapa(etapa - 1) }}>Voltar uma etapa</button>
        ) : onCancelar && modo === 'novo' && (
          <button type="button" className="botao-texto" onClick={onCancelar}>Já tenho conta</button>
        )}
      </form>

      {verTermos && (
        <div className="fundo-janela" onClick={() => setVerTermos(false)}>
          <div className="janela" onClick={(e) => e.stopPropagation()}>
            <div className="topo"><strong>Termos e privacidade</strong><button className="botao-texto" onClick={() => setVerTermos(false)}>Fechar</button></div>
            <Termos />
          </div>
        </div>
      )}
    </main>
  )
}

export function Termos() {
  return (
    <div className="termos">
      <p><strong>Texto provisório, para a fase de testes. Será revisado por advogado antes do lançamento.</strong></p>
      <p><strong>Quais dados coletamos:</strong> nome, CPF, data de nascimento, celular, e-mail, empresas atendidas, veículo, endereços dos pacotes, fotos e assinaturas das entregas e sua localização enquanto o app está aberto durante a rota.</p>
      <p><strong>Para que usamos:</strong> identificar você, montar e acompanhar suas rotas, registrar as entregas e mostrar seus resultados e ganhos. Não vendemos seus dados.</p>
      <p><strong>Dados de terceiros:</strong> endereços, nomes e assinaturas de quem recebe são usados só para comprovar a entrega.</p>
      <p><strong>Seus direitos (LGPD):</strong> você pode pedir para ver, corrigir ou apagar seus dados a qualquer momento.</p>
      <p><strong>Na fase de testes</strong> os dados ficam guardados no próprio celular.</p>
    </div>
  )
}

const mascaraCpf = (v) => v.replace(/\D/g, '').slice(0, 11)
  .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')

const mascaraCelular = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function cpfValido(cpf) {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const digito = (n) => {
    const soma = [...d.slice(0, n)].reduce((s, c, i) => s + Number(c) * (n + 1 - i), 0)
    return ((soma * 10) % 11) % 10
  }
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10])
}

function idade(data) {
  if (!data) return 0
  const nasc = new Date(data)
  const hoje = new Date()
  let anos = hoje.getFullYear() - nasc.getFullYear()
  if (hoje < new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())) anos--
  return anos
}
