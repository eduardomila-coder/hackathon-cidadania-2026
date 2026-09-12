# Entrar no projeto

Faça uma vez, na sua máquina. Leva uns 15 minutos. Se travar em qualquer
passo, chame no grupo — não gaste mais de 5 minutos sozinho.

**Desde 12/09, Fernando e Maria não precisam mais de conta no GitHub nem de
clonar o repositório.** Vocês trabalham direto na pasta compartilhada do Mac
do Eduardo (seção 5b abaixo) — pule a seção 1 e a seção 5. Só o Eduardo
continua com clone próprio e GitHub, porque é ele quem publica em `main`.

## 1. Conta no GitHub (só o Eduardo)

1. https://github.com/signup — usa o e-mail que você já usa.
2. Confirma o e-mail.
3. Manda seu nome de usuário no grupo. O Eduardo te adiciona ao repositório.
4. Vai chegar um e-mail "invited you to collaborate": aceita.

## 2. Ferramentas

**Mac:** abre o Terminal e cola, uma linha por vez:

```bash
xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node gh
```

**Windows:** instala, nesta ordem, aceitando o padrão:

1. Git: https://git-scm.com/download/win
2. Node.js LTS: https://nodejs.org
3. GitHub CLI: https://cli.github.com

Depois abre o **Git Bash** (não o cmd) para os próximos passos.

## 3. Identidade no git e login no GitHub

Troque pelo seu nome e e-mail:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

`gh auth login` só é necessário pro Eduardo, que é quem publica em GitHub:

```bash
gh auth login
```

No `gh auth login`: GitHub.com → HTTPS → Yes (authenticate Git) → Login with a
web browser. Copia o código, abre o navegador, cola.

## 4. Claude Code

```bash
npm install -g @anthropic-ai/claude-code
claude
```

Na primeira vez ele pede login: escolhe a conta Claude que você já assinou.

## 5. Baixar o projeto (só o Eduardo)

```bash
cd ~
git clone https://github.com/eduardomila-coder/hackathon-cidadania-2026.git
cd hackathon-cidadania-2026
npm install
cp .env.example .env.local
```

O `.env.local` pode ficar vazio: a chave do modelo mora só no servidor
compartilhado (https://habeastitas.eduardomila.adv.br). Localmente, tudo abre e
funciona, menos o botão Analisar. Se o Eduardo te mandar uma chave no
privado, cola ali. **Nunca cole chave no grupo nem no git.**

## 5b. Fernando e Maria: entrar pela pasta compartilhada (desde 12/09)

Vocês não clonam nada. O que está compartilhado por SMB não é só a pasta do
projeto: é a pasta `Claude` inteira do Mac do Eduardo
(`/Users/eduardomila/Claude`), com o projeto e o vault do Obsidian/segundo
cérebro dentro dela. Usuário e senha ele manda no privado.

- **Windows:** Explorador → Este Computador → Mapear unidade de rede →
  `\\192.168.2.1\Claude`, marcar "conectar usando outras credenciais".
- **Mac:** Finder → Ir → Conectar ao Servidor → `smb://192.168.2.1/Claude`.
- **Android (tablet):** app Cx File Explorer ou Solid Explorer → Rede →
  SMB → host `192.168.2.1`, pasta `Claude`, usuário e senha (só pra ver
  arquivos; para editar código, prefira computador).

Depois de mapear, entre na subpasta do projeto (`hackathon-cidadania-2026`,
dentro do drive mapeado — pergunte ao Eduardo o nome exato se não achar de
primeira) e abra o Claude Code apontando pra ela — não é mais um clone
local. O vault do Obsidian deve estar em outra subpasta ali dentro; abra o
Obsidian apontando pra lá.

**Duas coisas importantes para não travar:**

1. **Só o Eduardo roda `npm install` e `npm run dev`**, no próprio Mac.
   `node_modules` tem binário nativo por sistema operacional — instalar pelo
   Windows em cima de uma instalação feita no Mac (ou vice-versa) quebra o
   projeto para todo mundo. Fernando e Maria só editam arquivos; para ver o
   app rodando, abrem `http://<ip-do-mac-no-wifi>:3000` no navegador (o
   Eduardo informa o IP), com o `npm run dev` do Eduardo já no ar.
2. **O recarregamento automático pode não perceber mudança feita pela rede.**
   Se editar um arquivo pelo Windows e a página não atualizar sozinha, dê F5
   no navegador.

## 6. Testar (Eduardo, no seu clone)

```bash
npm run dev
```

Abre http://localhost:3000, escreve um relato, clica em Analisar. Funcionou?
Está pronto.

## 7. Trabalhar

**Eduardo**, no seu clone local:

```bash
cd ~/hackathon-cidadania-2026
claude
```

Dentro do Claude Code, digite `/comecar` (sem criar branch — ver `CLAUDE.md`),
peça em português o que quer fazer, e quando estiver pronto publique com
`/enviar-revisao` ou `npm run enviar -- "mensagem"`. Isso é o que atualiza
https://habeastitas.eduardomila.adv.br em até um minuto.

**Fernando e Maria**, na pasta de rede (seção 5b): abra o Claude Code
apontando pra lá e peça em português o que quer fazer: "adiciona um botão pra
tirar foto do documento". O agente edita, testa e faz o commit direto ali,
em `main` — sem branch, sem push, sem Pull Request. Avise o Eduardo o que
mudou e como conferir; ele revisa e publica no GitHub quando for a hora.

Quer saber o que os outros fizeram? `/situacao`.

Não precisa saber git. Se o Claude Code perguntar algo sobre "conflito",
chama no grupo antes de responder.

## 7b. Maria sem acesso à pasta de rede (aplicativo Claude para Android)

Se Maria estiver longe do Wi-Fi do Eduardo e só tiver o aplicativo Claude no
Android conectado ao GitHub, ela ainda pode usar o repositório do GitHub como
antes (branch própria, Pull Request) enquanto não estiver na mesma rede.
Assim que estiver perto, prefira a pasta compartilhada (seção 5b): mais
simples e sem depender de conta no GitHub.
