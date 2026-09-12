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
compartilhado (https://hackathon.eduardomila.adv.br). Localmente, tudo abre e
funciona, menos o botão Analisar. Se o Eduardo te mandar uma chave no
privado, cola ali. **Nunca cole chave no grupo nem no git.**

## 6. Testar

```bash
npm run dev
```

Abre http://localhost:3000, escreve um relato, clica em Analisar. Funcionou?
Está pronto.

## 7. Trabalhar

Sempre que sentar pra trabalhar:

```bash
cd ~/hackathon-cidadania-2026
claude
```

Dentro do Claude Code, digita `/comecar`. Ele atualiza o projeto, cria sua
branch e diz o que está aberto pra você. Aí é só pedir em português o que
quer fazer: "adiciona um botão pra tirar foto do documento".

Quando algo estiver funcionando, digita `/entregar`. Ele testa, junta com o
trabalho dos outros e sobe. Em até 1 minuto aparece em
https://hackathon.eduardomila.adv.br — abre no celular e confere.

Quer saber o que os outros fizeram? `/situacao`.

Não precisa saber git. Se o Claude Code perguntar algo sobre "conflito",
chama no grupo antes de responder.
