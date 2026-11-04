# Segurança do Rota Fácil

## O que já está feito
- Senhas das contas de teste guardadas com PBKDF2 (210 mil rodadas, sal aleatório). Hashes antigos são
  trocados no primeiro login. Com o Supabase, a senha nunca fica no celular.
- Cadastro: CPF validado, 18+, celular com DDD, e-mail com aviso de erro de digitação (gmial, hotmal...),
  senha com 8+ caracteres, letras e números, repetida. "Trocar minha senha" em Meu cadastro (pede a atual).
- Esqueci a senha (com Supabase): e-mail com link; o link abre a tela "Criar nova senha".
- Depois de 5 senhas erradas seguidas (login, sair do modo ajudante ou apagar a conta), espera de 1 minuto.
- Modo ajudante: esconde financeiro, valores, Minhas rotas e cadastro; sair do modo e sair da conta exigem
  a senha do dono.
- Política de segurança de conteúdo (CSP) no index.html: o app só carrega código dele mesmo e só conversa
  com os serviços que usa (ViaCEP, BrasilAPI, OpenStreetMap/Nominatim, Photon, OSRM, Supabase).
- Endereços lidos da foto ou digitados aparecem no mapa como texto puro (não viram HTML).
- LGPD: "Meu cadastro" tem "Baixar uma cópia dos meus dados" e "Apagar minha conta e meus dados" (pede a senha).
  Fotos e assinaturas das entregas são apagadas sozinhas depois de 90 dias.
- Site só em HTTPS (GitHub Pages). `npm audit`: 0 vulnerabilidades.

## Limites da fase de teste
- Os dados ficam no navegador do celular, sem criptografia própria. Quem tiver o celular desbloqueado e
  souber mexer nas ferramentas do navegador consegue ler. Use bloqueio de tela no celular.
- O modo ajudante é uma trava de tela, não uma separação de contas. O ajudante ter login próprio
  depende do Supabase.

## Checklist ao ligar o Supabase
- Usar só a URL do projeto e a chave *anon public* no app. A chave `service_role` e a senha do banco nunca
  vão para o app nem para o GitHub.
- Ligar RLS (Row Level Security) em todas as tabelas, com política `auth.uid() = user_id`.
- Fotos e assinaturas em bucket **privado**, com política por usuário e links temporários.
- Confirmação de e-mail ligada; Site URL e Redirect URLs só com o endereço do app.
- Senha mínima de 8 caracteres e proteção contra senhas vazadas nas configurações de Auth.
- Painel de administrador por função no banco (papel `admin`), nunca por checagem só no app.
- Apagar conta de verdade no servidor por uma Edge Function (o app hoje apaga os dados do celular).
- Pagamentos pelo checkout do Mercado Pago (o app não vê nem guarda dados de cartão).
