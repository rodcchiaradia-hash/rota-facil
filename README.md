# Rota Fácil

App para entregadores autônomos: escanear pacotes, conferir, montar a rota e registrar as entregas.
Funciona no navegador do celular e pode ser instalado na tela inicial (PWA), sem passar pelas lojas.

Endereço do app: https://rodcchiaradia-hash.github.io/rota-facil/

## O que já tem

- App instalável no celular (ícone na tela inicial, abre em tela cheia).
- Login por e-mail e senha (criar conta, entrar, recuperar senha).
- Passo 1, três jeitos de adicionar pacote:
  - **QR / Barras:** câmera ao vivo lendo QR Code e código de barras, com bipe/vibração e aviso de repetido.
  - **Foto do endereço:** tira foto da etiqueta e lê o texto no próprio celular (Tesseract.js, português);
    a pessoa confere e corrige antes de salvar. Os arquivos do leitor são baixados no primeiro uso.
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
