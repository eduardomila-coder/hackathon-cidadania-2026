# Ponto Dativo — Equipe Habeas Titas

Protótipo de escritório de apoio para a advocacia dativa no Paraná. Reúne
ficha de nomeação, atendimento, checklist de documentos, agenda, WhatsApp profissional e triagem
com fontes jurídicas. O assistente organiza informação como um estagiário
virtual; decisão, orientação e assinatura são sempre do advogado dativo.

`/escritorio` é a plataforma do advogado dativo: cada advogado entra com
usuário e senha e trabalha nos casos dele, com tudo gravado no servidor em
arquivos JSON. Continua um **ambiente de demonstração**: use dados fictícios ou
de casos que você pode tratar; nada aqui é sistema oficial da OAB. Antes de
produção, o projeto exige definição institucional, controles de acesso, aviso
de privacidade, retenção, resposta a incidentes e governança dos fornecedores
de tecnologia. Como usar está na seção [Plataforma do advogado](#plataforma-do-advogado).

Há conectores técnicos para Evolution API v2 (QR e webhook mínimo) e DataJud
público do TJPR (consulta por número CNJ), mas eles só são ativados por variáveis
de ambiente no servidor. O detalhamento do fluxo da OAB/PR e das barreiras de
produção está em [`docs/INTEGRACOES.md`](docs/INTEGRACOES.md).

Categoria: **Inovação Aberta e Cidadania** · OAB/PR · 12 e 13/09/2026 · Licença MIT.

**Demo ao vivo:** https://escritoriodativo.eduardomila.adv.br (triagem) e https://escritoriodativo.eduardomila.adv.br/entrar (escritório do advogado, com login; acompanha `main`, atualiza a cada minuto)

O painel da equipe em `/painel` é privado e pede usuário e senha. As credenciais ficam somente no `.env.local` do servidor, nunca no repositório.
**Painel da equipe:** https://escritoriodativo.eduardomila.adv.br/painel (regras, cronograma, tarefas lidas do `docs/TAREFAS.md` e a criação das contas de advogado)

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

## Plataforma do advogado

O escritório (`/escritorio`) é de cada advogado: ele entra com login e senha,
abre os casos dele, roda a triagem com fontes, conversa com o cliente pelo
WhatsApp e consulta o andamento público dos processos. Um advogado nunca vê o
que é de outro. As contas são criadas pela equipe; não há cadastro livre.

Tudo fica em arquivos JSON na pasta `data/` (fora do git), um por coleção
(`advogados.json`, `escritorio-casos.json`, `escritorio-mensagens.json`…),
sempre lidos e gravados por `lib/banco.ts`. Para apagar o ambiente inteiro,
apague a pasta `data/` com o servidor parado.

### 1. Criar a conta do advogado (equipe)

Pelo terminal, no servidor, com `npm run dev` parado ou já rodando:

```bash
node scripts/advogado.mjs criar "Ana Souza" "OAB/PR 12345" ana.souza senha-forte-123
node scripts/advogado.mjs listar
node scripts/advogado.mjs senha ana.souza outra-senha-456     # se ela esquecer
node scripts/advogado.mjs desativar ana.souza                 # e "ativar" para voltar
```

Pelo painel da equipe: abra `http://localhost:3000/painel`, entre com o usuário
e a senha de `PAINEL_USUARIOS`, vá em **Advogados** e preencha nome, OAB,
usuário e senha. A senha aparece uma vez para você copiar; o servidor guarda só
o hash (scrypt).

Pela API da equipe, com o mesmo Basic Auth do painel:

```bash
curl -u equipe:troque-esta-senha -H "Content-Type: application/json" \
  -d '{"nome":"Ana Souza","oab":"OAB/PR 12345","usuario":"ana.souza","senha":"senha-forte-123"}' \
  http://localhost:3000/api/advogados

curl -u equipe:troque-esta-senha http://localhost:3000/api/advogados
curl -u equipe:troque-esta-senha -X PATCH -H "Content-Type: application/json" \
  -d '{"id":"3f6c1d2e-8a4b-4c1e-9f0a-2b7d5e6c8a90","ativo":false}' http://localhost:3000/api/advogados
```

O `id` do PATCH é o que vem na lista do GET; o mesmo PATCH aceita
`"senha":"outra-senha-456"` para trocar a senha.

O usuário tem de 2 a 40 caracteres (minúsculas, números, ponto, traço ou
sublinhado); a senha, pelo menos 8.

### 2. Entrar

Passe ao advogado o endereço `http://localhost:3000/entrar` (no servidor
compartilhado, `https://escritoriodativo.eduardomila.adv.br/entrar`), o usuário e
a senha. O login grava um cookie assinado (`pd_sessao`, 7 dias); a assinatura
usa `SESSAO_SEGREDO` do `.env.local` ou, se faltar, um segredo gerado uma vez
em `data/segredo-sessao.txt`. "Sair", no cabeçalho, apaga o cookie.

Para testar sem navegador:

```bash
curl -c cookies.txt -H "Content-Type: application/json" \
  -d '{"usuario":"ana.souza","senha":"senha-forte-123"}' http://localhost:3000/api/entrar
curl -b cookies.txt http://localhost:3000/api/escritorio/resumo
curl -b cookies.txt http://localhost:3000/api/escritorio/processos
```

Sem o cookie, as páginas do escritório mandam para `/entrar?voltar=...` e as
APIs `/api/escritorio/*` respondem 401.

### 3. Da nomeação ao WhatsApp

1. **Nomeação → caso.** Em `/escritorio`, clique em **Nova nomeação**, cole o
   texto da intimação e confira a ficha que a IA extraiu (processo, órgão,
   ato, prazo só se estiver escrito, documentos a pedir, perguntas ao
   cliente). **Abrir caso a partir da ficha** cria o caso com origem
   "nomeação", o checklist de documentos e as tarefas "Conferir íntegra da
   intimação e a data de ciência" e "Confirmar prazo no processo oficial".
   Caso sem nomeação: **Novo caso**, com título, origem, cliente e telefone.
2. **Relato → triagem.** Na página do caso, escreva o relato do cliente e
   clique em **Triar com fontes**. A cadeia de `lib/analise.ts` extrai os
   fatos, busca em `docs/juridico/`, analisa citando o id de cada trecho e
   verifica. O resultado mostra a força do caso (requisitos comprovados sobre
   os aplicáveis), se cabe no JEC, documentos a pedir e perguntas. Cada
   triagem fica guardada no caso.
3. **Documentos, prazos e registros.** Marque o que o cliente já entregou,
   adicione tarefas com data e anote na linha do tempo. O painel soma casos
   abertos, prazos em 7 dias, mensagens novas e documentos pendentes.
4. **WhatsApp.** Em `/escritorio/whatsapp`, cadastre o número e leia o QR no
   celular (precisa de `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `APP_URL` e
   `EVOLUTION_WEBHOOK_SECRET` no servidor). O que o cliente mandar aparece em
   `/escritorio/mensagens` e na seção Conversa do caso. **Sugerir resposta**
   só preenche a caixa; nada sai sem o clique em **Enviar pelo WhatsApp**.
5. **Processos.** Em `/escritorio/processos`, digite o número CNJ e consulte
   o último andamento público no DataJud (precisa de `DATAJUD_API_KEY`). O
   resultado fica guardado, com o caso vinculado. Não é intimação nem fonte de
   prazo.

Os nomes, rotas e tipos de cada módulo estão em
[`docs/PLATAFORMA.md`](docs/PLATAFORMA.md); as integrações e seus limites, em
[`docs/INTEGRACOES.md`](docs/INTEGRACOES.md).

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
| `lib/banco.ts` | o "banco": um JSON por coleção em `data/`, escrita atômica e em fila |
| `lib/contas.ts` | contas dos advogados: criação pela equipe, senha em scrypt, ativar e desativar |
| `lib/sessao.ts` | cookie assinado do advogado logado; `advogadoAtual()` e `exigirAdvogado()` |
| `lib/escritorio.ts` | modelo e CRUD do escritório (casos, clientes, documentos, tarefas, registros, triagens, mensagens, processos), tudo filtrado por advogado |
| `lib/assistente.ts` | IA do escritório: ficha de nomeação e sugestão de resposta ao cliente |
| `proxy.ts` | os dois portões: Basic Auth da equipe em `/painel` e `/api/advogados`; sessão do advogado em `/escritorio` e `/api/escritorio` |
| `app/entrar/` | tela de login do advogado |
| `app/escritorio/` | o escritório: painel de casos, página do caso, mensagens, WhatsApp e processos |
| `app/painel/Advogados.tsx` | seção do painel da equipe que cria e desativa contas de advogado |
| `scripts/advogado.mjs` | cria, lista, troca senha, ativa e desativa contas pelo terminal |
| `lib/evolution.ts` | conector servidor da Evolution API v2, sem expor chave ao navegador |
| `lib/datajud.ts` | consulta pontual de metadados públicos do TJPR por número CNJ |
| `docs/PLATAFORMA.md` | a especificação da plataforma: contrato de nomes, rotas e tipos entre os módulos |
| `docs/INTEGRACOES.md` | configuração, fluxo dativo da OAB/PR e limites de produção |
| `docs/IDEIA.md` | a ideia, decidida nas reuniões de 10/09 |
| `docs/EVENTO.md` | regras, datas, o que o edital exige |
| `docs/TAREFAS.md` | quem faz o quê, na ordem das entregas |
| `docs/entregas/` | o que se entrega em cada horário, dados de teste, prints |
| `scripts/testar-casos.mjs` | roda os casos de teste contra o app |
| `CLAUDE.md` | regras que o Claude Code de cada um segue |
| `.claude/commands/` | `/comecar`, `/entregar`, `/situacao` — o fluxo da equipe sem saber git |
| `docs/CEREBRO.md` | decisões rápidas e pendências durante o evento |
