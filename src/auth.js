import { createClient } from '@supabase/supabase-js'

// Preenchidos quando a conta do Supabase for criada (veja o README).
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// O link de "esqueci a senha" volta para o app com type=recovery no endereço. Guardado antes do Supabase limpar.
export const veioDoLinkDeSenha = /type=recovery/.test(window.location.hash + window.location.search)

export const supabase = url && key ? createClient(url, key) : null

// Sem Supabase o app roda em "modo de teste": o login fica só neste aparelho.
export const modoTeste = !supabase
export const vindoDoLinkDeSenha = !!supabase && veioDoLinkDeSenha
const CHAVE_TESTE = 'rf:usuario-teste'

export async function usuarioAtual() {
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    return data.session?.user ?? null
  }
  const salvo = localStorage.getItem(CHAVE_TESTE)
  return salvo ? JSON.parse(salvo) : null
}

export function aoMudarLogin(callback) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((evento, sessao) => callback(sessao?.user ?? null, evento))
  return () => data.subscription.unsubscribe()
}

// No modo de teste as contas ficam neste celular, com a senha guardada só como hash.
const CHAVE_CONTAS = 'rf:contas'
const lerContas = () => JSON.parse(localStorage.getItem(CHAVE_CONTAS) || '{}')
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
async function hashAntigo(texto) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)))
}
// PBKDF2 com sal aleatório: muito mais difícil de descobrir a senha a partir do que fica guardado.
async function derivar(senha, sal) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(sal), iterations: 210000 }, chave, 256)
  return hex(bits)
}
async function protegerSenha(senha) {
  const sal = hex(crypto.getRandomValues(new Uint8Array(16)))
  return { sal, senha: await derivar(senha, sal) }
}
async function senhaConfere(conta, senha) {
  if (!conta) return false
  if (conta.sal) return conta.senha === (await derivar(senha, conta.sal))
  return conta.senha === (await hashAntigo(senha))
}

// Depois de 5 senhas erradas seguidas, espera 1 minuto antes de tentar de novo.
const CHAVE_TENTATIVAS = 'rf:tentativas'
function bloqueadoAte() {
  try { const t = JSON.parse(localStorage.getItem(CHAVE_TENTATIVAS)) || {}; return t.ate > Date.now() ? t.ate : 0 } catch { return 0 }
}
function registrarTentativa(ok) {
  if (ok) return localStorage.removeItem(CHAVE_TENTATIVAS)
  let t = {}
  try { t = JSON.parse(localStorage.getItem(CHAVE_TENTATIVAS)) || {} } catch { /* vazio */ }
  t.erros = (t.erros || 0) + 1
  if (t.erros >= 5) { t.ate = Date.now() + 60000; t.erros = 0 }
  localStorage.setItem(CHAVE_TENTATIVAS, JSON.stringify(t))
}
function conferirBloqueio() {
  const ate = bloqueadoAte()
  if (ate) throw new Error(`Muitas tentativas erradas. Espere ${Math.ceil((ate - Date.now()) / 1000)} segundos.`)
}

export async function entrar(email, senha) {
  email = email.toLowerCase()
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw new Error(traduzir(error.message))
    return data.user
  }
  conferirBloqueio()
  const contas = lerContas()
  const conta = contas[email]
  if (!conta) throw new Error('Não achamos conta com este e-mail. Toque em "Criar conta".')
  const ok = await senhaConfere(conta, senha)
  registrarTentativa(ok)
  if (!ok) throw new Error('E-mail ou senha incorretos.')
  if (!conta.sal) { contas[email] = await protegerSenha(senha); localStorage.setItem(CHAVE_CONTAS, JSON.stringify(contas)) }
  const usuario = { id: email, email }
  localStorage.setItem(CHAVE_TESTE, JSON.stringify(usuario))
  return usuario
}

export async function criarConta(email, senha, perfil) {
  email = email.toLowerCase()
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { perfil }, emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    if (error) throw new Error(traduzir(error.message))
    // Com confirmação de e-mail ligada, não há sessão até a pessoa clicar no link.
    return { usuario: data.session ? data.user : null, precisaConfirmar: !data.session }
  }
  const contas = lerContas()
  if (contas[email]) throw new Error('Este e-mail já tem conta. Use "Entrar".')
  contas[email] = await protegerSenha(senha)
  localStorage.setItem(CHAVE_CONTAS, JSON.stringify(contas))
  localStorage.setItem(`rf:perfil:${email}`, JSON.stringify(perfil))
  return { usuario: await entrar(email, senha), precisaConfirmar: false }
}

// Dados do cadastro (nome, CPF, empresas, veículo...). No Supabase ficam junto do usuário.
export function lerPerfil(usuario) {
  if (supabase) return usuario.user_metadata?.perfil ?? null
  try { return JSON.parse(localStorage.getItem(`rf:perfil:${usuario.id}`)) } catch { return null }
}

export async function salvarPerfil(usuario, perfil) {
  if (supabase) {
    const { data, error } = await supabase.auth.updateUser({ data: { perfil } })
    if (error) throw new Error(traduzir(error.message))
    return data.user
  }
  localStorage.setItem(`rf:perfil:${usuario.id}`, JSON.stringify(perfil))
  return usuario
}

export async function recuperarSenha(email) {
  if (!supabase) throw new Error('Recuperação de senha funciona quando o servidor estiver ligado.')
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + import.meta.env.BASE_URL })
  if (error) throw new Error(traduzir(error.message))
}

export async function sair() {
  if (supabase) await supabase.auth.signOut()
  localStorage.removeItem(CHAVE_TESTE)
}

function traduzir(msg) {
  if (/invalid login/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/already registered/i.test(msg)) return 'Este e-mail já tem conta. Use "Entrar".'
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail pelo link que enviamos.'
  if (/password should be/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/rate limit/i.test(msg)) return 'Muitas tentativas. Espere alguns minutos.'
  return msg
}

// Confere a senha do dono (para sair do modo ajudante) sem trocar quem está logado.
// Lança erro se estiver bloqueado por excesso de tentativas.
export async function conferirSenha(email, senha) {
  conferirBloqueio()
  let ok
  if (supabase) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    ok = !error
  } else {
    ok = await senhaConfere(lerContas()[email.toLowerCase()], senha)
  }
  registrarTentativa(ok)
  return ok
}

// LGPD: apagar tudo o que o app guardou desta pessoa neste celular (e a conta, no modo de teste).
export async function apagarConta(usuario) {
  const u = usuario.id
  for (const nome of ['pacotes', 'esperado', 'rota', 'casa', 'dia', 'historico', 'minhas-rotas', 'config', 'perfil']) {
    localStorage.removeItem(`rf:${nome}:${u}`)
  }
  ;['rf:enderecos', 'rf:geocache', 'rf:ajudante', 'rf:tentativas'].forEach((k) => localStorage.removeItem(k))
  if (!supabase) {
    const contas = lerContas()
    delete contas[usuario.email.toLowerCase()]
    localStorage.setItem(CHAVE_CONTAS, JSON.stringify(contas))
  }
  await sair()
}

// LGPD: cópia dos dados guardados neste celular, em um arquivo.
export function exportarDados(usuario) {
  const u = usuario.id
  const dados = { exportadoEm: new Date().toISOString(), email: usuario.email }
  for (const nome of ['perfil', 'minhas-rotas', 'historico', 'dia', 'pacotes', 'rota', 'casa', 'config']) {
    try { dados[nome] = JSON.parse(localStorage.getItem(`rf:${nome}:${u}`)) } catch { dados[nome] = null }
  }
  if (supabase) dados.perfil = usuario.user_metadata?.perfil ?? null
  try { dados.enderecos = JSON.parse(localStorage.getItem('rf:enderecos')) } catch { /* nada */ }
  return dados
}

// Regra única de senha: 8+ caracteres, com letra e número.
export function problemaNaSenha(senha) {
  if (senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.'
  if (!/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) return 'Use letras e números na senha.'
  return ''
}

// Erros comuns de digitação no e-mail (o e-mail é o caminho para recuperar a senha).
const DOMINIOS = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.com.br': 'gmail.com',
  'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'outlok.com': 'outlook.com', 'yahoo.con': 'yahoo.com' }
export function sugestaoDeEmail(email) {
  const [nome, dominio] = email.trim().toLowerCase().split('@')
  return dominio && DOMINIOS[dominio] ? `${nome}@${DOMINIOS[dominio]}` : ''
}

// Nova senha depois do link de recuperação (Supabase).
export async function definirNovaSenha(senha) {
  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) throw new Error(traduzir(error.message))
}

// Trocar a senha estando logado (pede a senha atual).
export async function trocarSenha(usuario, atual, nova) {
  if (!(await conferirSenha(usuario.email, atual))) throw new Error('Senha atual incorreta.')
  if (supabase) return definirNovaSenha(nova)
  const contas = lerContas()
  contas[usuario.email.toLowerCase()] = await protegerSenha(nova)
  localStorage.setItem(CHAVE_CONTAS, JSON.stringify(contas))
}
