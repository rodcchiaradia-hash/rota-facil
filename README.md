# Rota Fácil

App para entregadores autônomos: escanear pacotes, conferir, montar a rota e registrar as entregas.
Funciona no navegador do celular e pode ser instalado na tela inicial (PWA), sem passar pelas lojas.

Endereço do app: https://rodcchiaradia-hash.github.io/rota-facil/

## O que já tem

- App instalável no celular (ícone na tela inicial, abre em tela cheia).
- Login por e-mail e senha (criar conta, entrar, recuperar senha).
- Passo 2, conferência: o entregador informa quantos pacotes pegou na base; o app compara com os
  escaneados e avisa se falta, se sobra ou se algum está sem endereço.
- Passo 1, três jeitos de adicionar pacote. Em todos, antes de salvar aparece a **conferência**:
  o endereço completo em destaque e os campos (CEP, rua, número, complemento, bairro, cidade) para corrigir.
  - **Código + foto** (fluxo principal): a câmera lê o QR Code ou código de barras (fica vinculado ao pacote)
    e em seguida já abre a câmera para fotografar o endereço, que vira texto. Digitar só em último caso.
    Dá para salvar só o código e completar depois.
  - **Só foto:** para pacote sem código; tira foto da etiqueta e lê o texto no próprio celular (Tesseract.js, português);
    o app separa CEP, rua, número e complemento e busca bairro e cidade pelo CEP. Os arquivos do leitor
    são baixados no primeiro uso.
  - **Digitar:** começa pelo CEP, que preenche rua, bairro e cidade (ViaCEP, com BrasilAPI de reserva);
    o entregador só digita número e complemento.

## Modo de teste x servidor

Enquanto o Supabase não estiver ligado, o app roda em **modo de teste**: qualquer e-mail e senha
(6+ caracteres) entram, e os pacotes ficam salvos só no próprio celular.

Para ligar o login de verdade:

1. Criar um projeto grátis em https://supabase.com.
2. Em *Project Settings → API*, copiar a **Project URL** e a chave **anon public**.
3. No GitHub, em *Settings → Secrets and variables → Actions → Variables*, criar
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com esses valores.
4. Em *Authentication → URL Configuration* do Supabase, colocar o endereço do app como *Site URL*.

A chave *anon* é pública por natureza (vai junto do app no navegador); a segurança vem das regras do banco.

## Publicação

Cada envio para a branch principal publica o app no GitHub Pages pelo workflow
`.github/workflows/publicar.yml`. Na primeira vez é preciso ligar o Pages em
*Settings → Pages → Source: GitHub Actions*.

## Para programar

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera a versão final em dist/
```

Para testar a câmera no celular durante o desenvolvimento é preciso https (a câmera não abre em http).
