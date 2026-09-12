# Cérebro do projeto

Este é o contexto rápido do Hackathon da Cidadania 2026. Leia antes de mexer
no projeto e atualize quando uma decisão ou tarefa mudar.

## Norte do produto

Atendente virtual do Juizado Especial Cível para pessoa leiga. Recebe relato
por texto ou voz, organiza o caso, indica se pode caber no JEC, aponta caminhos
extrajudiciais, lista documentos e prepara um pedido.

Equipe: Habeas Titas, Eduardo, Maria e Fernando.

## Estado atual

- Aplicação Next.js 16 com App Router e TypeScript.
- Relato enviado para análise estruturada em JSON.
- Ditado pelo microfone via Web Speech API.
- Sete casos fictícios disponíveis em `docs/entregas/dados-de-teste/`.
- Teste principal: `node scripts/testar-casos.mjs`.
- Desenvolvimento local: `npm run dev`, porta 3000.
- Licença MIT.
- Não usar dados reais de pessoas ou processos.

## Mapa rápido

| Caminho | Papel |
|---|---|
| `app/page.tsx` | tela principal e resultado |
| `app/api/analisar/route.ts` | endpoint de análise |
| `lib/claude.ts` | prompt, cliente e formato da resposta |
| `lib/useDitado.ts` | captura de voz |
| `docs/IDEIA.md` | ideia e proposta |
| `docs/EVENTO.md` | edital, horários e pontuação |
| `docs/TAREFAS.md` | entregas e responsáveis |
| `docs/entregas/` | evidências e materiais enviados |

## Decisões que não devem ser quebradas

1. Uma aplicação e um processo de desenvolvimento: Next.js e `npm run dev`.
2. Todo acesso ao modelo passa por `lib/claude.ts`.
3. Não adicionar banco de dados sem necessidade real.
4. A interface fala com leigos, em português simples.
5. A `main` precisa passar no build antes de receber merge.
6. Não refatorar o que já funciona durante o Hackathon.

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
- [ ] Completar conversa em turnos.
- [ ] Implementar leitura de foto de documento.
- [ ] Gerar pedido no formato do TJPR.
- [ ] Preparar pitch e caso fictício da demonstração.
- [ ] @eduardo Aprovar ou recusar a proposta de acompanhamento real do
      processo via API DataJud (mexe em `lib/`) — detalhes em
      `docs/IDEIA.md`, seção "Proposta: acompanhamento real do processo".
- [ ] @eduardo Decidir sobre o campo `encaminhar_advogado` na `Analise`
      (mexe em `lib/etapas.ts` e `lib/analise.ts`) — reconhecer quando a
      pergunta não é para a IA responder e sim o advogado. Detalhes em
      `docs/IDEIA.md`, seção "Requisito, se essa leitura virar produto:
      reconhecer quando é hora de um humano".
- [ ] @eduardo **Ler antes de avançar no modelo B2B2C**: pesquisa achou
      que o Provimento 205/2021 da OAB proíbe chatbot de advogado
      específico citar artigo de lei ou emitir parecer — o produto faz as
      duas coisas hoje (`fundamentos`, `motivo_juizado`). Risco pode
      *aumentar*, não diminuir, se um advogado adotar a ferramenta como
      própria. Detalhes em `docs/IDEIA.md`, seção "Pesquisa: contato com o
      cliente e como melhorar essas diretrizes".

### Log curto

| Data | Decisão ou mudança | Motivo |
|---|---|---|
| 2026-09-12 | Criado o cérebro local do projeto | Centralizar contexto sem misturar com outros projetos |
| 2026-09-12 | Roadmap técnico passa a seguir a rubrica da auditoria: RAG sobre a lei, verificação de fontes, cadeia de prompts, acessibilidade | Manual, seção 8: é o que dá nota 5 nas três dimensões (300 pts) |
| 2026-09-12 | Adicionado dado sobre tamanho do público (72% dos ~1,3 mi de advogados no Brasil são autônomos) em `docs/IDEIA.md` | Reforça o problema para o pitch: advogado autônomo sem estrutura de escritório é público-alvo direto |
| 2026-09-12 | Registrado requisito (não implementado) de reconhecer quando uma pergunta deve ir para o advogado humano em vez da IA responder, com proposta de campo `encaminhar_advogado` | Pedido da Maria: no modelo B2B2C, o advogado só dá um norte pontual; a IA precisa saber os próprios limites |
| 2026-09-12 | Registrada proposta (não implementada) de acompanhamento real do processo via API pública DataJud/CNJ, aguardando aprovação do Eduardo | Pedido da Maria; mexe em `lib/`, área do Eduardo, e tem limitações (só processo não sigiloso, dados não em tempo real) que pedem decisão dele antes de codar |
