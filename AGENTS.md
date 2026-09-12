<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Memória automática do projeto: Habeas Titas

Você está no repositório do Hackathon da Cidadania 2026. Antes de qualquer
alteração, leia `CLAUDE.md`, `docs/CEREBRO.md` e `docs/TAREFAS.md`. Eles são a
fonte de verdade sobre objetivo, prioridade, divisão da equipe e entregas.

## Início automático de sessão

1. Rode `git status --short`, descubra a branch atual e execute `npm run pegar`.
2. Se o projeto estiver em `/Users/eduardomila/` ou o usuário do sistema for
   `eduardomila`, assuma automaticamente que a pessoa é **Eduardo**. Em outro
   computador, tente identificar pelo `git config user.name`; só pergunte se
   ainda não der para identificar. A palavra `começar` no Claude Android
   identifica Maria pelo atalho abaixo.
3. Diga em uma frase a tarefa aberta mais urgente daquela pessoa. Só então
   edite o necessário.

| Pessoa | Área principal | Pode publicar em `main`? |
|---|---|---|
| Eduardo | `lib/`, integração, revisão e pitch | Sim, depois de build e revisão |
| Fernando | `app/`, componentes e acessibilidade | Sim, depois de build |
| Maria | `docs/juridico/`, `docs/entregas/`, testes e evidências | Não, envia para revisão |

## Como cada pessoa abre o agente

- **Eduardo:** abre este repositório no Codex, Claude Code ou DeepCode no Mac.
- **Fernando:** abre o Claude Code no Windows dentro do clone local e pode usar
  `/comecar` e `/enviar-revisao`, e também publicar direto em `main` (como o
  Eduardo) quando quiser pular a revisão.
- **Maria:** abre a área Code do aplicativo Claude no Android, seleciona este
  repositório conectado ao GitHub e escreve a tarefa em português. Não depende
  de terminal nem dos comandos com barra. Quando terminar, ela pede: "envie
  para revisão em uma branch, sem juntar na main, e diga como testar".

### Atalho da Maria

Se Maria escrever apenas **"começar"**, assuma como tarefa padrão: preparar ou
atualizar o registro dos testes externos em
`docs/entregas/3-testes-externos.md`. Leia as tarefas e evidências existentes,
não invente depoimentos nem resultados. Faça a alteração em uma branch, envie
para revisão sem juntar na `main` e explique ao Eduardo como testar ou conferir.

## Entrega correta

- Toda alteração deve passar por `npm run build` antes de ser enviada.
- Eduardo e Fernando podem usar `npm run enviar -- "mensagem"` para publicar
  direto em `main`, sem passar pelo Habeas Release.
- Maria nunca usa `npm run enviar`: faz commit na própria branch, faz
  `git push -u origin HEAD` e abre ou pede uma Pull Request para a `main`. A
  mudança aparece no Habeas Release em `/revisoes` para Eduardo aprovar.
  Maria pede isso ao Claude no aplicativo.
- Nunca faça `push --force`, `reset --hard`, nem publique em `main` em nome
  de Maria sem ela pedir, nem leia ou envie `.env.local`, chaves ou
  `docs/privado/`.

## Comunicação esperada ao terminar

Diga sempre: o que mudou, como testar, a branch usada e se ficou pronto para
revisão ou foi publicado. Use português simples.
