@AGENTS.md

# Hackathon da Cidadania 2026 — regras para todo Claude Code desta equipe

Somos três pessoas, cada uma com seu Claude Code, no mesmo repositório, por
dois dias. Estas regras existem para os três Claudes não se atropelarem.

## O projeto

**Ponto Dativo** é um protótipo de escritório de apoio para a advocacia dativa
no Paraná. Reúne atendimento, documentos, agenda, WhatsApp profissional,
consulta pontual de andamento público e a triagem de casos do Juizado Especial
Cível. Não dá parecer: quem analisa, orienta e assina é o advogado. O ambiente
é demonstrativo, usa casos fictícios e não persiste conteúdo de cliente.

A direção mudou em 12/09/2026: da ferramenta ao leigo para o apoio ao
profissional e, depois, para o escritório de apoio dativo. O histórico e os
limites institucionais estão em `docs/IDEIA.md`.
Regras do evento em `docs/EVENTO.md`.

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
- **Nada de número sem fonte.** A ferramenta não estima probabilidade de
  êxito, honorário nem valor de condenação. O que ela mostra é a *força do
  caso*: requisitos comprovados sobre os que se aplicam, cada um com o id do
  trecho que o exige e o documento que o comprova. Preço de modelo vem da
  tabela em `lib/custo.ts`; cotação do dólar, da variável `DOLAR_REAIS`. Sem
  valor conhecido, o custo aparece como não calculado.
- **O registro de triagens (`lib/casos.ts`, `data/casos.json`) guarda só
  medida**: área, requisitos, custo, tempo e o desfecho que o advogado anota.
  Nunca o relato, o nome do cliente ou o número do processo.
- Fonte jurídica nova entra como `docs/juridico/<nome>.md`, um `## Art. N`
  por trecho; o índice carrega a pasta inteira.
- Sem banco de dados até alguém precisar de verdade. Estado em memória ou
  arquivo JSON em `data/`.
- A rota `/escritorio` é apenas uma demonstração local no navegador. Não ligar
  a sistemas da OAB, tribunais, mensageria, agenda ou prontuário sem convênio,
  autorização, avaliação de LGPD e controles de acesso definidos.
- `lib/evolution.ts` e `lib/datajud.ts` são conectores de servidor. Nunca
  exponha suas chaves, automatize login no Portal da Advocacia Dativa, faça
  raspagem ampla ou trate consulta pública como intimação/prazo oficial.
- Roda local: `npm run dev`, porta 3000. Não há deploy.

## Idioma e nomes

- Tudo em português: código (nomes de variáveis, funções, arquivos), comentários,
  commits, textos da interface. Termos técnicos ficam como são (`route`, `hook`).
- Interface em linguagem simples, sem juridiquês decorativo. Quem contrata é o
  advogado, mas quem digita ou dita o relato costuma ser o cliente leigo: o
  campo de entrada fala com ele, e o dossiê fala com o profissional.

## Como o trabalho circula entre os três

Três comandos dentro do Claude Code, que a pessoa digita como `/comecar`:

| Comando | O que faz |
|---|---|
| `/comecar` | atualiza com o que os outros enviaram, cria ou retoma a branch da pessoa, lista as tarefas abertas na área dela |
| `/entregar` | envia a branch para revisão no Habeas Release |
| `/enviar-revisao` | build, commit e envia a branch para aprovação |
| `/situacao` | quem enviou o quê, o que está aberto, próxima entrega com hora |

Ninguém publica diretamente em `main`: toda mudança usa `/enviar-revisao` ou
`/entregar`. Eduardo aprova pelo Habeas Release em `/revisoes` e faz a
publicação final no GitHub.

Por baixo, `npm run pegar` e `npm run enviar -- "mensagem"` (`scripts/git.mjs`,
funciona igual em Mac e Windows). Use-os quando o usuário pedir para
"atualizar" ou "enviar"; não invente sequências de git à mão.

Regras que os comandos já cumprem e você não pode contornar:

- `main` sempre roda: só entra em `main` o que passou no `npm run build`.
- Cada pessoa em branch própria: `eduardo/<o-que>`, `maria/<o-que>`,
  `fernando/<o-que>`. Merge rápido, sem PR: não há tempo.
- Commits pequenos, em português, no imperativo: `adiciona upload de foto`.
- Nunca `git push --force`, nunca `git reset --hard`, nunca reescreva
  histórico de outra pessoa.
- Conflito em arquivo de outra área: pergunte antes de resolver.

## Pasta compartilhada na rede (Wi-Fi do Eduardo)

A pasta do projeto está compartilhada por SMB na rede que o Mac do Eduardo
distribui (`smb://192.168.2.1/hackathon`, usuário e senha individuais).
**Serve para arquivos**: prints, fotos, canvas, PDFs, depoimentos — quem está
no tablet joga direto em `docs/entregas/`. **Não serve para código**: não
rode Claude Code, `npm` nem `git` a partir do drive de rede (lento no Windows
e o `.git` corrompe). Código continua no clone local de cada um, com
`/comecar` e `/entregar`. O que entra pela pasta compartilhada é commitado
pelo Eduardo no próximo `/entregar` dele.

## Servidor compartilhado

`https://escritoriodativo.eduardomila.adv.br` roda no Mac do Eduardo e **puxa `main`
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

Quando qualquer integrante pedir uma alteração em linguagem normal, o agente
deve concluir o ciclo sozinho, sem exigir comandos de barra: identificar a
pessoa, criar ou retomar a branch dela, editar, testar, rodar o build, fazer o
commit, enviar a branch ao GitHub e abrir a Pull Request para `main`.
Ninguém deve publicar diretamente em `main`. A Pull Request aparece no Habeas
Release em `/revisoes`; a aprovação final continua sendo feita pelo Eduardo
no GitHub.

## O que não fazer

- Não instalar dependência grande sem combinar (o `npm install` dos outros
  precisa continuar rápido).
- Não commitar `.env.local`, chaves, nem nada de `docs/privado/`.
- Não usar dados de pessoa real nos exemplos. Invente.
- Não refatorar o que funciona. Hackathon é entregar, não polir.

## Licença

MIT, exigência do edital. Todo código aqui é aberto.
