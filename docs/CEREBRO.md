# Cérebro do projeto

Este é o contexto rápido do Hackathon da Cidadania 2026. Leia antes de mexer
no projeto e atualize quando uma decisão ou tarefa mudar.

## Norte do produto

Ponto Dativo é um escritório de apoio demonstrativo para a advocacia dativa. A
triagem de casos é um módulo: o cliente relata (texto ou voz), a ferramenta
organiza requisitos, documentos, cabimento no JEC e caminhos extrajudiciais,
com fonte em cada ponto. A rota `/escritorio` é a plataforma do advogado:
ele entra com login e senha (conta criada pela equipe) e trabalha nos casos
dele, com tudo gravado no servidor em `data/` e isolado por advogado. Não dá
parecer: quem orienta e assina é o advogado. A base técnica de WhatsApp e
consulta pública DataJud existe, mas associação institucional com a OAB,
acesso ao Portal e operação com dados reais não estão implementados — ver
`docs/INTEGRACOES.md`. A especificação da plataforma é `docs/PLATAFORMA.md`.

Equipe: Habeas Titas, Eduardo, Maria e Fernando.

## Estado atual

- Aplicação Next.js 16 com App Router e TypeScript.
- Relato enviado para análise estruturada em JSON.
- Ditado pelo microfone via Web Speech API.
- Força do caso: requisitos comprovados sobre aplicáveis, cada um com a fonte.
- Custo real por triagem, medido pelos tokens da resposta do modelo.
- Registro de triagens em `data/casos.json` (só medida, sem relato nem nome).
- Plataforma do advogado: contas (`lib/contas.ts`), sessão por cookie assinado
  (`lib/sessao.ts`), banco em JSON (`lib/banco.ts`) e o escritório com casos,
  documentos, tarefas, registros, triagens, mensagens e processos
  (`lib/escritorio.ts`), tudo filtrado por `advogadoId`.
- Contas criadas pela equipe no `/painel` (seção Advogados), por
  `POST /api/advogados` ou por `node scripts/advogado.mjs criar`.
- Processos do advogado em `/escritorio/processos`: consulta pontual ao
  DataJud, resultado guardado por advogado e vinculado ao caso.
- Sete casos fictícios disponíveis em `docs/entregas/dados-de-teste/`.
- Teste principal: `node scripts/testar-casos.mjs`.
- Desenvolvimento local: `npm run dev`, porta 3000.
- Licença MIT.
- Não usar dados reais de pessoas ou processos.

## Mapa rápido

| Caminho | Papel |
|---|---|
| `app/page.tsx` | tela de triagem e dossiê do advogado |
| `docs/PLATAFORMA.md` | contrato da plataforma: nomes, rotas, tipos e arquivos de cada módulo |
| `lib/banco.ts`, `lib/contas.ts`, `lib/sessao.ts` | banco em JSON, contas dos advogados e sessão assinada |
| `lib/escritorio.ts` | modelo e CRUD do escritório, tudo por `advogadoId` |
| `proxy.ts` | Basic Auth da equipe no painel; sessão do advogado no escritório |
| `app/entrar/`, `app/escritorio/` | login e as telas do escritório (casos, mensagens, WhatsApp, processos) |
| `app/painel/Advogados.tsx` | criação e desativação das contas de advogado pela equipe |
| `scripts/advogado.mjs` | contas de advogado pelo terminal |
| `lib/evolution.ts` | conector servidor Evolution API v2: estado, QR e webhook mínimo |
| `lib/datajud.ts` | consulta pontual de metadados públicos do TJPR por número CNJ |
| `docs/INTEGRACOES.md` | configuração técnica, fluxo OAB/PR e limites de produção |
| `app/api/analisar/route.ts` | endpoint de análise |
| `app/api/casos/route.ts` | desfecho anotado pelo advogado e agregado de eficiência |
| `lib/claude.ts` | cliente, formato da resposta e uso de tokens |
| `lib/etapas.ts` | os prompts de cada etapa e os schemas |
| `lib/analise.ts` | encadeia as etapas, calcula força e custo |
| `lib/custo.ts` | tabela de preços e custo por triagem |
| `lib/casos.ts` | registro das triagens e cálculo de eficiência |
| `lib/useDitado.ts` | captura de voz |
| `docs/IDEIA.md` | ideia e proposta |
| `docs/EVENTO.md` | edital, horários e pontuação |
| `docs/TAREFAS.md` | entregas e responsáveis |
| `docs/entregas/` | evidências e materiais enviados |

## Decisões que não devem ser quebradas

1. Uma aplicação e um processo de desenvolvimento: Next.js e `npm run dev`.
2. Todo acesso ao modelo passa por `lib/claude.ts`.
3. Não adicionar banco de dados sem necessidade real.
4. A interface fala com quem não é da área, em português simples: o relato vem
   do cliente leigo, mesmo quando quem contrata é o advogado.
5. A `main` precisa passar no build antes de receber merge.
6. Não refatorar o que já funciona durante o Hackathon.
7. Nada de probabilidade de êxito: a ferramenta conta requisitos comprovados,
   com a fonte de cada um. Número sem fonte não entra.
8. O registro de triagens guarda só medida. Nunca relato, nome de cliente ou
   número de processo.
9. Preço de modelo e cotação de moeda vêm de tabela ou do ambiente. Sem valor
   na tabela, o custo aparece como não calculado.
10. Dados de clientes reais não entram no protótipo. Antes de produção, definir
    base legal, transparência, retenção, acesso, incidentes, fornecedor de IA e
    instrumentos para transferência internacional de dados.
11. Contas de advogado só a equipe cria; não há cadastro livre. Cada rota do
    escritório filtra por `advogadoId`: um advogado nunca vê dado de outro.
12. Nenhuma mensagem sai ao cliente sem clique do advogado. A IA redige; o
    advogado envia.
13. Estado da plataforma só em `data/` via `lib/banco.ts`; nenhuma
    dependência nova; todo acesso ao modelo por `perguntarJson`.

## Ordem de prioridade

1. App demonstrável e estável.
2. Entregas e evidências nos horários do evento.
3. Testes fictícios reproduzíveis.
4. Auditoria técnica e documentação.
5. Melhorias cosméticas.

## Como trabalhar

- Antes de alterar: conferir `git status` e a área de trabalho da equipe.
- Branches: `eduardo/<tarefa>`, `maria/<tarefa>` ou `fernando/<tarefa>`.
- Commits pequenos, em português e no imperativo.
- Conflito em arquivo que outra pessoa está usando exige combinar antes.
- Nunca commitar `.env.local`, chaves ou dados privados.

## Registro de decisões e pendências

Use este espaço para decisões rápidas durante o evento. Decisões permanentes
também devem ser refletidas em `CLAUDE.md` e, se forem relevantes ao projeto,
no Segundo Cérebro em `~/Claude/Projects/segundo-cerebro/`.

### Pendências críticas

- [ ] Pegar o link da pasta do Drive no grupo dos inscritos e colar aqui. É lá que toda evidência entra, com o horário do Drive como prova.
- [ ] Descobrir quem é o padrinho/madrinha da equipe e confirmar cada entrega com ele na hora.
- [ ] Definir e comunicar a pessoa líder à organização (obrigatório para premiação).
- [ ] Definir divisão de áreas entre os três integrantes.
- [x] Completar conversa em turnos: o dossiê recebe as respostas pendentes e
      refaz a triagem usando o relato anterior.
- [x] Implementar leitura de foto de documento: JPG, PNG ou WebP até 5 MB é
      lido apenas na chamada atual, sem ser gravado.
- [ ] Gerar pedido no formato do TJPR.
- [ ] Preparar pitch e caso fictício da demonstração.
- [ ] @eduardo Decidir se haverá monitoramento contínuo de processos após o
      hackathon. A consulta pontual do DataJud já existe; recorrência exige
      autenticação, autorização e armazenamento protegido.
- [ ] @eduardo Decidir sobre o campo `encaminhar_advogado` na `Analise`
      (mexe em `lib/etapas.ts` e `lib/analise.ts`) — reconhecer quando a
      pergunta não é para a IA responder e sim o advogado. Detalhes em
      `docs/IDEIA.md`, seção "Requisito, se essa leitura virar produto:
      reconhecer quando é hora de um humano".

### Log curto

| Data | Decisão ou mudança | Motivo |
|---|---|---|
| 2026-09-12 | Criado o cérebro local do projeto | Centralizar contexto sem misturar com outros projetos |
| 2026-09-12 | Roadmap técnico passa a seguir a rubrica da auditoria: RAG sobre a lei, verificação de fontes, cadeia de prompts, acessibilidade | Manual, seção 8: é o que dá nota 5 nas três dimensões (300 pts) |
| 2026-09-12 | Adicionado dado sobre tamanho do público (72% dos ~1,3 mi de advogados no Brasil são autônomos) em `docs/IDEIA.md` | Reforça o problema para o pitch: advogado autônomo sem estrutura de escritório é público-alvo direto |
| 2026-09-12 | Registrado requisito (não implementado) de reconhecer quando uma pergunta deve ir para o advogado humano em vez da IA responder, com proposta de campo `encaminhar_advogado` | Pedido da Maria: no modelo B2B2C, o advogado só dá um norte pontual; a IA precisa saber os próprios limites |
| 2026-09-12 | Implementada base de consulta pontual via API pública DataJud/CNJ para TJPR | Número CNJ somente, sem lotes, sigilos ou cálculo de prazo; monitoramento contínuo depende de autenticação e armazenamento protegido |
| 2026-09-12 | Produto vira triagem para o advogado: tela, prompts e cadeia falam com o profissional, não com o leigo | Canvas da Entrega 1 fechou na linha Advocacia e a leitura B2B2C foi adotada |
| 2026-09-12 | "Força do caso" (requisitos comprovados sobre aplicáveis, com fonte) em vez de probabilidade de êxito | Sem base histórica de julgados, percentual seria alucinação — e é o que a rubrica de confiabilidade pune |
| 2026-09-12 | Custo por triagem medido pelos tokens reais + registro de desfecho em `data/casos.json` | Responder se a ferramenta se paga e se a força medida aponta para o mesmo lado do resultado |
| 2026-09-12 | Claude segue principal; DeepSeek continua alternativa por `MODEL` e `ANTHROPIC_BASE_URL` | Trocar o modelo a uma hora da Entrega 2 arriscaria a demo; DeepSeek entra como argumento de custo |
| 2026-09-12 | Produto passa a se chamar Ponto Dativo, escritório de apoio demonstrativo | Direção do Eduardo: foco no fluxo da Advocacia Dativa OAB/PR, com atendimento, documentos, agenda, WhatsApp e assistente sem presumir parceria formal ou uso da marca OAB |
| 2026-09-12 (18h) | O escritório deixa de ser tela de demonstração com estado no navegador e vira plataforma com login por advogado, tudo gravado no servidor (`docs/PLATAFORMA.md`); contas criadas pela equipe no painel; base + 3 módulos (casos, mensagens, painel/processos/documentação) em paralelo | Decisão do Eduardo: o advogado precisa trabalhar nos casos dele de verdade, e a auditoria precisa ver isolamento entre contas e envio só com clique. Continua rotulado como ambiente de demonstração, sem marca da OAB nem promessa de produção |

## Servidor compartilhado roda em produção (13/09, tarde)

O `escritoriodativo.eduardomila.adv.br` deixou de rodar `next dev` e passou a rodar
`next build` + `next start`. Motivo: no modo dev o Turbopack recompila com a
página aberta e o React às vezes recebia um módulo de cliente ainda não
resolvido — "Element type is invalid. Received a promise that resolves to:
undefined" —, um erro que aparecia para quem estava usando o endereço sem nada
de errado no código. O `npm run build` passa limpo e leva ~9 s.

O que muda para a equipe: nada no jeito de trabalhar. O endereço continua
puxando a `main` a cada 60 s. A diferença é que agora ele **constrói antes de
trocar**: se o build falhar, o site fica no ar com a versão anterior e o erro
aparece em `~/Library/Logs/hackathon-live.log`. Ou seja, `main` quebrada não
derruba mais a demonstração.
