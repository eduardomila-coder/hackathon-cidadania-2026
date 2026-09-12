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
  `perguntarJson` em `lib/claude.ts`. Não crie outro cliente, não chame
  `fetch` na API direto.
- A análise é uma cadeia (`lib/analise.ts`): extrair → buscar na lei (RAG
  em `docs/juridico/`) → analisar citando trechos → verificar. Não junte
  etapas num prompt só e não deixe o modelo afirmar lei sem id de trecho:
  é isso que a auditoria pontua (ver `docs/EVENTO.md`).
- Fonte jurídica nova entra como `docs/juridico/<nome>.md`, um `## Art. N`
  por trecho; o índice carrega a pasta inteira.
- Sem banco de dados até alguém precisar de verdade. Estado em memória ou
  arquivo JSON em `data/`.
- Roda local: `npm run dev`, porta 3000. Não há deploy.

## Idioma e nomes

- Tudo em português: código (nomes de variáveis, funções, arquivos), comentários,
  commits, textos da interface. Termos técnicos ficam como são (`route`, `hook`).
- Interface em linguagem simples, sem juridiquês: o usuário final é leigo.

## Como o trabalho circula entre os três (desde 12/09, sem clone/PR pra Fernando e Maria)

Decisão do Eduardo: para o resto do hackathon, Fernando e Maria **não clonam o
repositório nem usam GitHub**. Os três trabalham direto na mesma pasta do
projeto, física no MacBook do Eduardo e compartilhada por SMB (ver seção
abaixo). Cada um abre o Claude Code apontando para essa mesma pasta.

Isso muda o modelo de branch: como é **uma pasta só**, e não um clone por
pessoa, ninguém pode ter sua própria branch fora da de todo mundo — trocar de
branch naquela pasta muda os arquivos de todo mundo ao mesmo tempo, no meio do
que os outros estão editando. Então, a partir de agora:

- **Não crie branch por pessoa.** Fernando e Maria trabalham direto em `main`,
  na pasta compartilhada. Só o Eduardo decide se quer isolar algo em branch
  local antes de publicar.
- **A divisão de áreas da tabela abaixo passa a ser a principal proteção
  contra conflito** (antes era a branch). Antes de editar um arquivo fora da
  sua área, avise no grupo.
- **Commits pequenos e frequentes, em português, no imperativo**
  (`adiciona upload de foto`), direto na pasta compartilhada — isso é o que
  sobra de histórico se a rede cair no meio de uma edição.
- Fernando e Maria **não têm mais acesso de push a um remoto GitHub**: eles só
  editam arquivos e commitam localmente naquela pasta. Quem publica em GitHub
  `main` continua sendo só o Eduardo, rodando `npm run enviar -- "mensagem"`
  (ou `/enviar-revisao`) na própria máquina — é isso que satisfaz a exigência
  do edital de "solução sob licença MIT, publicada no repositório oficial"
  (`docs/EVENTO.md`). Antes de publicar, o Eduardo confere com `git log` e
  `git diff` o que mudou (revisão manual, já que não há mais Pull Request no
  Habeas Release para o trabalho deles).
- `/comecar` e `/situacao` continuam úteis para qualquer um: mostram tarefas
  abertas e o que mudou, mas sem criar branch nem depender do GitHub.
- `/entregar` e `/enviar-revisao` (que fazem push e abrem Pull Request) ficam
  **só para o Eduardo**, que ainda pode escolher publicar via GitHub.

Regras que continuam valendo:

- `main` sempre roda: só o Eduardo publica em `main`, e só depois do
  `npm run build` passar.
- Nunca `git push --force`, nunca `git reset --hard`, nunca reescreva
  histórico de outra pessoa.
- Conflito em arquivo de outra área: pergunte antes de resolver.

**Risco técnico que isso assume, de olhos abertos:** vários Claude Code, `npm
run dev` e edições de arquivo ao mesmo tempo, de máquinas diferentes, na
mesma pasta via SMB — é mais escrita concorrente no mesmo `.git` do que a
pasta aguentava antes (que era só para prints/PDF, um de cada vez). Evite
duas pessoas commitando no mesmo instante; se notar lentidão ou erro estranho
de git, pare e chame o Eduardo antes de tentar consertar sozinho. Sem clone
próprio, também não há mais uma cópia de segurança individual: se a pasta
corromper, o único histórico é o que já foi publicado em GitHub `main` — por
isso commits frequentes e o Eduardo publicando com regularidade importam mais
agora do que antes.

## Pasta compartilhada na rede (Wi-Fi do Eduardo)

A pasta do projeto inteira — código incluso — está compartilhada por SMB na
rede que o Mac do Eduardo distribui (`smb://192.168.2.1/hackathon`, usuário e
senha individuais). **Desde 12/09, Fernando e Maria abrem o Claude Code
direto nessa pasta de rede**, sem clone próprio: é a mesma pasta física do
Mac do Eduardo, só acessada por outro computador. Isso substitui a regra
antiga (que dizia para nunca rodar `git`/`npm`/Claude Code a partir do drive
de rede); ver o aviso de risco na seção acima — o Eduardo decidiu assumir
isso pelo resto do hackathon, pela simplicidade de não depender de GitHub
para os três.

A mesma pasta também serve para arquivos que não são código: prints, fotos,
canvas, PDFs, depoimentos — quem está no tablet joga direto em
`docs/entregas/`. Se houver um vault do Obsidian (segundo cérebro,
anotações), compartilhe a pasta dele também pela mesma rede e registre o
caminho em `docs/CEREBRO.md`; qualquer Claude Code lendo daquela pasta pode
consultar as notas de lá.

## Servidor compartilhado

`https://habeastitas.eduardomila.adv.br` roda no Mac do Eduardo e **puxa `main`
sozinho a cada minuto**. Tudo que entra em `main` aparece lá em até 60 s, sem
ninguém fazer deploy. É a URL que vai no celular de quem testa (Entrega 3) e
na tela do pitch. A chave do modelo está só nesse servidor: quem trabalha no
código não precisa de chave para ver o app funcionando; `npm run dev` local
sem `.env.local` só falha no botão Analisar.

## Divisão de áreas (evita conflito de merge)

| Área | Pasta | Quem |
|---|---|---|
| Interface (telas, componentes, fluxo da conversa) | `app/`, `components/` | Fernando (sugestão) |
| Cérebro (prompts, análise, pedido, leitura de documento) | `lib/` | Eduardo (sugestão) |
| Conteúdo jurídico e entregas (regras do JEC, modelo do pedido, canvas, testes e evidências) | `docs/juridico/`, `docs/entregas/` | Maria (sugestão) |
| Pitch e apresentação (roteiro, slides, ensaio e demonstração) | `docs/entregas/` | Eduardo |

É sugestão até a equipe confirmar no sábado de manhã; troque os nomes aqui.
Se precisar mexer fora da sua área, avise no grupo antes.

Decisões rápidas e pendências do evento ficam em `docs/CEREBRO.md`; leia-o no
início da sessão e anote lá o que mudar.

## Entrega automática

Quando Fernando ou Maria pedirem uma alteração em linguagem normal, o agente
deve concluir o ciclo sozinho, sem exigir comandos de barra: editar, testar,
rodar o build e fazer o commit direto na pasta compartilhada em `main` — sem
criar branch, sem push para GitHub, sem Pull Request (eles não têm mais
acesso de push a um remoto). Quando for o Eduardo pedindo, o agente pode
seguir o fluxo completo (`npm run enviar`) e publicar em `main` no GitHub,
já que só ele faz essa publicação.

## O que não fazer

- Não instalar dependência grande sem combinar (o `npm install` dos outros
  precisa continuar rápido).
- Não commitar `.env.local`, chaves, nem nada de `docs/privado/`.
- Não usar dados de pessoa real nos exemplos. Invente.
- Não refatorar o que funciona. Hackathon é entregar, não polir.

## Licença

MIT, exigência do edital. Todo código aqui é aberto.
