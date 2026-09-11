# Hackathon da Cidadania 2026 — Equipe Habeas Titas

Atendente virtual do Juizado Especial Cível. A pessoa conta o que aconteceu,
falando ou escrevendo; o sistema entende o caso, diz se cabe no JEC, aponta
caminhos sem processo, lista documentos e monta o pedido.

Categoria: **Inovação Aberta e Cidadania** · OAB/PR · 12 e 13/09/2026 · Licença MIT.

## Rodar

```bash
npm install
cp .env.example .env.local   # e preencha ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

## Entrar no projeto (cada integrante, uma vez)

Passo a passo completo em [`docs/ONBOARDING.md`](docs/ONBOARDING.md).

## Onde está o quê

| | |
|---|---|
| `app/page.tsx` | tela principal: relato por voz ou texto, resultado da análise |
| `app/api/analisar/route.ts` | endpoint que recebe o relato e devolve a análise |
| `lib/claude.ts` | único ponto de contato com a Claude API: prompt e formato da resposta |
| `lib/useDitado.ts` | ditado pelo microfone (Web Speech API, sem servidor) |
| `docs/IDEIA.md` | a ideia, decidida nas reuniões de 10/09 |
| `docs/EVENTO.md` | regras, datas, o que o edital exige |
| `docs/TAREFAS.md` | quem faz o quê |
| `CLAUDE.md` | regras que o Claude Code de cada um segue |
