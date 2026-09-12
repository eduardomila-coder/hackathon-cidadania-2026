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

| Pessoa | Área principal | Pode publicar em `main` no GitHub? |
|---|---|---|
| Eduardo | `lib/`, integração, revisão e pitch | Sim, depois de build e revisão |
| Fernando | `app/`, componentes e acessibilidade | Não, só commita na pasta compartilhada |
| Maria | `docs/juridico/`, `docs/entregas/`, testes e evidências | Não, só commita na pasta compartilhada |

## Como cada pessoa abre o agente

Desde 12/09: Fernando e Maria não clonam mais o repositório nem usam GitHub.
Os três apontam o Claude Code para a mesma pasta do projeto, física no
MacBook do Eduardo e compartilhada por SMB (`smb://192.168.2.1/hackathon`,
ver `CLAUDE.md`).

- **Eduardo:** abre este repositório no Codex, Claude Code ou DeepCode no Mac
  (é a pasta original, a mesma que está compartilhada).
- **Fernando:** no Windows, mapeia o drive de rede e abre o Claude Code
  direto dentro dele — não é mais um clone local próprio. Pode usar
  `/comecar` e `/situacao`; `/enviar-revisao` e `/entregar` não fazem mais
  sentido pra ele (não há push nem Pull Request).
- **Maria:** idem, pelo computador ou pelo tablet conectado à mesma rede;
  se usar o aplicativo Claude no Android sem acesso a essa pasta, peça para
  alguém aplicar a mudança dela na pasta compartilhada.

### Atalho da Maria

Se Maria escrever apenas **"começar"**, assuma como tarefa padrão: preparar ou
atualizar o registro dos testes externos em
`docs/entregas/3-testes-externos.md`. Leia as tarefas e evidências existentes,
não invente depoimentos nem resultados. Faça a alteração direto na pasta
compartilhada, commite em português e avise o Eduardo o que mudou e como
conferir — ele publica no GitHub quando for revisar.

## Entrega correta

- Toda alteração deve passar por `npm run build` antes de ser commitada.
- Eduardo pode usar `npm run enviar -- "mensagem"` para publicar em `main` no
  GitHub — é o único que faz essa publicação, e é o que cumpre a exigência do
  edital de solução em licença MIT publicada em repositório aberto.
- Maria e Fernando nunca usam `npm run enviar` nem fazem push para um remoto:
  fazem commit direto, em `main`, na pasta compartilhada. Não criam branch
  própria (é uma pasta só, compartilhada — trocar de branch nela afeta todo
  mundo). O Eduardo revisa com `git log`/`git diff` antes de publicar.
- Nunca faça `push --force`, `reset --hard`, nem leia ou envie `.env.local`,
  chaves ou `docs/privado/`.

## Comunicação esperada ao terminar

Diga sempre: o que mudou, como testar, a branch usada e se ficou pronto para
revisão ou foi publicado. Use português simples.
