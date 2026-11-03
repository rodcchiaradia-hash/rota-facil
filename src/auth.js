import { createClient } from '@supabase/supabase-js'

// Preenchidos quando a conta do Supabase for criada (veja o README).
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null

// Sem Supabase o app roda em "modo de teste": o login fica só neste aparelho.
export const modoTeste = !supabase
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
  const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => callback(sessao?.user ?? null))
  return () => data.subscription.unsubscribe()
}

// No modo de teste as contas ficam neste celular, com a senha guardada só como hash.
const CHAVE_CONTAS = 'rf:contas'
const lerContas = () => JSON.parse(localStorage.getItem(CHAVE_CONTAS) || '{}')
async function hash(texto) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function entrar(email, senha) {
  email = email.toLowerCase()
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw new Error(traduzir(error.message))
    return data.user
  }
  const conta = lerContas()[email]
  if (!conta) throw new Error('Não achamos conta com este e-mail. Toque em "Criar conta".')
  if (conta.senha !== (await hash(senha))) throw new Error('E-mail ou senha incorretos.')
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
  contas[email] = { senha: await hash(senha) }
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
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.href })
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
