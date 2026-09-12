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
2. Se a pessoa não disser quem é, pergunte se é Eduardo, Maria ou Fernando
   antes de editar. Se ela disser, use a área dela abaixo.
3. Diga em uma frase a tarefa aberta mais urgente daquela pessoa. Só então
   edite o necessário.

| Pessoa | Área principal | Pode publicar em `main`? |
|---|---|---|
| Eduardo | `lib/`, integração, revisão e pitch | Sim, depois de build e revisão |
| Fernando | `app/`, componentes e acessibilidade | Não, envia para revisão |
| Maria | `docs/juridico/`, `docs/entregas/`, testes e evidências | Não, envia para revisão |

## Entrega correta

- Toda alteração deve passar por `npm run build` antes de ser enviada.
- Eduardo pode usar `npm run enviar -- "mensagem"` para publicar em `main`.
- Maria e Fernando nunca usam `npm run enviar`: fazem commit na própria branch,
  fazem `git push -u origin HEAD` e abrem ou pedem uma Pull Request para a
  `main`. A mudança aparece no Habeas Release em `/revisoes` para Eduardo
  aprovar.
- Nunca faça `push --force`, `reset --hard`, merge na `main` em nome de Maria
  ou Fernando, nem leia ou envie `.env.local`, chaves ou `docs/privado/`.

## Comunicação esperada ao terminar

Diga sempre: o que mudou, como testar, a branch usada e se ficou pronto para
revisão ou foi publicado. Use português simples.
