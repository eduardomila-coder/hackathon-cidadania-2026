# Hackathon da Cidadania 2026 — Equipe Habeas Titas

Atendente virtual do Juizado Especial Cível. A pessoa conta o que aconteceu,
falando ou escrevendo; o sistema entende o caso, diz se cabe no JEC, aponta
caminhos sem processo, lista documentos e monta o pedido.

Categoria: **Inovação Aberta e Cidadania** · OAB/PR · 12 e 13/09/2026 · Licença MIT.

**Demo ao vivo:** https://habeastitas.eduardomila.adv.br (acompanha `main`, atualiza a cada minuto)

O painel da equipe em `/painel` é privado e pede usuário e senha. As credenciais ficam somente no `.env.local` do servidor, nunca no repositório.
**Painel da equipe:** https://habeastitas.eduardomila.adv.br/painel (regras, cronograma, tarefas e responsáveis, lidos do `docs/TAREFAS.md`)

## Como funciona (arquitetura)

Uma cadeia de quatro etapas, cada uma com contexto delimitado e saída validada
por schema (`lib/analise.ts`):

1. **Extrair** (`lib/etapas.ts › extrair`) — o relato vira fatos, partes,
   valor, o que a pessoa quer, provas e termos jurídicos para busca. Sem
   julgar, sem citar lei.
2. **Buscar na lei** (`lib/juridico/corpus.ts`) — RAG local, sem banco: a
   base em `docs/juridico/` (Lei 9.099/95, CDC, orientações revisadas por
   advogado) é indexada por artigo e consultada por BM25. Uma base fixa
   (competência, partes, advogado, o que não é JEC) entra em todo caso.
3. **Analisar com a lei** (`analisar`) — o modelo só pode afirmar o que está
   nos trechos recuperados; cada afirmação jurídica sai com o id do trecho
   (`fundamentos`), e o que não tem base vai para `sem_base`.
4. **Verificar** (`verificar`) — um segundo prompt, com papel de revisor,
   confere cada fundamento contra o trecho citado: `confirmada`, `sem_base`
   ou `contradiz`. O que cai vira alerta na tela, não afirmação.

A tela mostra o progresso real das etapas, a base legal com o texto do artigo
e, em destaque, o que **não** foi possível confirmar.

Controle de alucinação, em resumo: fonte fechada (só `docs/juridico/`),
citação obrigatória por id, revisão em segunda passada, e o valor em reais do
limite do JEC nunca é afirmado (depende do salário mínimo vigente).

APIs e bibliotecas: `@anthropic-ai/sdk` (Claude API; o plano B usa o endpoint
compatível do DeepSeek), `zod`, Next.js 16, Tailwind 4. Ditado por voz pela
Web Speech API do navegador.

## Rodar

```bash
npm install
cp .env.example .env.local   # e preencha ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Testar com os casos fictícios (app no ar):

```bash
node scripts/testar-casos.mjs
```

## Entrar no projeto (cada integrante, uma vez)

Passo a passo completo em [`docs/ONBOARDING.md`](docs/ONBOARDING.md).

## Onde está o quê

| | |
|---|---|
| `app/page.tsx` | tela principal: relato por voz ou texto, resultado da análise |
| `app/api/analisar/route.ts` | endpoint: recebe o relato, transmite o progresso e devolve a análise (NDJSON) |
| `lib/claude.ts` | único ponto de contato com a Claude API: pergunta com resposta em JSON validado |
| `lib/etapas.ts` | os três prompts: extrair, analisar com a lei, verificar |
| `lib/analise.ts` | orquestra as etapas e o progresso |
| `lib/juridico/corpus.ts` | índice BM25 sobre `docs/juridico/` |
| `docs/juridico/` | a base legal: Lei 9.099/95, CDC, orientações revisadas |
| `lib/useDitado.ts` | ditado pelo microfone (Web Speech API, sem servidor) |
| `docs/IDEIA.md` | a ideia, decidida nas reuniões de 10/09 |
| `docs/EVENTO.md` | regras, datas, o que o edital exige |
| `docs/TAREFAS.md` | quem faz o quê, na ordem das entregas |
| `docs/entregas/` | o que se entrega em cada horário, dados de teste, prints |
| `scripts/testar-casos.mjs` | roda os casos de teste contra o app |
| `CLAUDE.md` | regras que o Claude Code de cada um segue |
| `.claude/commands/` | `/comecar`, `/entregar`, `/situacao` — o fluxo da equipe sem saber git |
| `docs/CEREBRO.md` | decisões rápidas e pendências durante o evento |
