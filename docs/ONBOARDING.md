# Entrar no projeto

Faça uma vez, na sua máquina. Leva uns 15 minutos. Se travar em qualquer
passo, chame no grupo — não gaste mais de 5 minutos sozinho.

## 1. Conta no GitHub (quem ainda não tem)

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

Troque pelo seu nome e e-mail do GitHub:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
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

## 5. Baixar o projeto

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

## 6. Testar

```bash
npm run dev
```

Abre http://localhost:3000, escreve um relato, clica em Analisar. Funcionou?
Está pronto.

## 6b. Pasta compartilhada (para arquivos, não para código)

Conectado no Wi-Fi do Eduardo, a pasta do projeto aparece como um drive de
rede. Usuário e senha ele manda no privado.

- **Windows:** Explorador → Este Computador → Mapear unidade de rede →
  `\\192.168.2.1\hackathon`, marcar "conectar usando outras credenciais".
- **Mac:** Finder → Ir → Conectar ao Servidor → `smb://192.168.2.1/hackathon`.
- **Android (tablet):** app Cx File Explorer ou Solid Explorer → Rede →
  SMB → host `192.168.2.1`, pasta `hackathon`, usuário e senha.

Use para colocar prints, fotos, canvas e PDFs em `docs/entregas/`. Não abra
o Claude Code nem rode comandos a partir daí.

## 7. Trabalhar

Sempre que sentar pra trabalhar:

```bash
cd ~/hackathon-cidadania-2026
claude
```

Dentro do Claude Code, digita `/comecar`. Ele atualiza o projeto, cria sua
branch e diz o que está aberto pra você. Aí é só pedir em português o que
quer fazer: "adiciona um botão pra tirar foto do documento".

Quando algo estiver funcionando, basta descrever a próxima tarefa em português.
O agente cria a branch, testa, faz o commit, envia a mudança e abre a Pull
Request sozinho. O Eduardo vê no Habeas Release, confere e publica quando
estiver certo:
https://habeastitas.eduardomila.adv.br/revisoes

Não junte nem publique em `main` por conta própria. Em até um minuto depois da
aprovação, a mudança aparece em https://habeastitas.eduardomila.adv.br.

Quer saber o que os outros fizeram? `/situacao`.

Não precisa saber git. Se o Claude Code perguntar algo sobre "conflito",
chama no grupo antes de responder.

## 7b. Maria no aplicativo Claude para Android

No aplicativo Claude, abra a área **Code**, conecte o GitHub se for pedido e
escolha o repositório `hackathon-cidadania-2026`. O projeto entrega as regras
automaticamente para o Claude. Para começar a tarefa padrão dela, escreva só:

> começar

O Claude prepara ou atualiza o registro dos testes externos em
`docs/entregas/3-testes-externos.md`, sem inventar depoimentos, cria a branch e
envia para a revisão do Eduardo. Para outra tarefa, Maria escreve normalmente o
que quer fazer.

Não use `/comecar` nem `/enviar-revisao` no tablet: eles são comandos do Claude
Code do computador. O Claude no aplicativo cria a branch e envia para o Eduardo
revisar.
