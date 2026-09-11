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

Abre o `.env.local` e cola a `ANTHROPIC_API_KEY` que o Eduardo mandou no privado.
**Nunca cole a chave no grupo nem no git.**

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
git pull --rebase origin main
git switch -c seunome/o-que-vai-fazer
claude
```

Dentro do Claude Code, ele já lê o `CLAUDE.md` e sabe as regras. Diz o que
quer fazer em português. Quando algo estiver funcionando:

```bash
git add -A
git commit -m "descreve o que fez"
git switch main
git pull --rebase origin main
git merge seunome/o-que-vai-fazer
npm run build
git push origin main
```

Se o `npm run build` falhar, não faz push: conserta primeiro (ou pede pro
Claude Code consertar).
