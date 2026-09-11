@AGENTS.md

# Hackathon da Cidadania 2026 — regras para todo Claude Code desta equipe

Somos três pessoas, cada uma com seu Claude Code, no mesmo repositório, por
dois dias. Estas regras existem para os três Claudes não se atropelarem.

## O projeto

Atendente virtual do Juizado Especial Cível: a pessoa leiga conta o que
aconteceu (falando ou escrevendo), o sistema entende, diz se cabe no JEC,
aponta caminhos sem processo, lista documentos e monta o pedido. Detalhes em
`docs/IDEIA.md`. Regras do evento em `docs/EVENTO.md`.

## Stack (não trocar sem combinar com a equipe)

- Next.js 16 (App Router) + TypeScript + Tailwind 4. Leia
  `node_modules/next/dist/docs/` antes de escrever código Next: a versão
  mudou em relação ao que você aprendeu.
- Claude API pelo `@anthropic-ai/sdk`. Todo acesso ao modelo passa por
  `lib/claude.ts`. Não crie outro cliente, não chame `fetch` na API direto.
- Sem banco de dados até alguém precisar de verdade. Estado em memória ou
  arquivo JSON em `data/`.
- Roda local: `npm run dev`, porta 3000. Não há deploy.

## Idioma e nomes

- Tudo em português: código (nomes de variáveis, funções, arquivos), comentários,
  commits, textos da interface. Termos técnicos ficam como são (`route`, `hook`).
- Interface em linguagem simples, sem juridiquês: o usuário final é leigo.

## Git: como não quebrar o trabalho dos outros

- `main` sempre roda. Antes de qualquer commit em `main`: `npm run build` passa.
- Cada pessoa trabalha em branch própria: `eduardo/<o-que>`, `maria/<o-que>`,
  `fernando/<o-que>`. Junta em `main` por merge rápido (`git merge`), sem PR
  formal: não há tempo.
- Antes de começar e antes de juntar: `git pull --rebase origin main`.
- Commits pequenos e frequentes, mensagem em português no imperativo:
  `adiciona upload de foto ao relato`.
- Nunca `git push --force` em `main`. Nunca reescreva histórico de outra pessoa.
- Conflito em arquivo que outra pessoa está mexendo: pergunte antes de resolver.

## Divisão de áreas (evita conflito de merge)

| Área | Pasta | Quem |
|---|---|---|
| Interface (telas, componentes) | `app/`, `components/` | a combinar |
| Cérebro (prompts, análise, pedido) | `lib/` | a combinar |
| Conteúdo jurídico (regras do JEC, modelos de pedido) | `docs/juridico/` | a combinar |

Atualize esta tabela quando a equipe decidir. Se precisar mexer fora da sua
área, avise no grupo antes.

## O que não fazer

- Não instalar dependência grande sem combinar (o `npm install` dos outros
  precisa continuar rápido).
- Não commitar `.env.local`, chaves, nem nada de `docs/privado/`.
- Não usar dados de pessoa real nos exemplos. Invente.
- Não refatorar o que funciona. Hackathon é entregar, não polir.

## Licença

MIT, exigência do edital. Todo código aqui é aberto.
