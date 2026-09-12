# Tarefas, na ordem das entregas

Para concluir, clique na caixinha em
https://habeastitas.eduardomila.adv.br/painel (grava aqui e publica sozinho) ou
marque `[x]` e faça `/entregar`. Para assumir uma tarefa, escreva `@eduardo`,
`@maria` ou `@fernando` na linha. Escreva `drive:palavra|outra` na linha e a
tarefa fecha sozinha quando um arquivo com essa palavra no nome aparecer na
pasta do Drive.
Pontuação e horários em `docs/EVENTO.md`.

**Repositório oficial da OAB/PR = nossa pasta no Drive, `HabeasTITAS_Cidadania`:**
https://drive.google.com/drive/folders/1Gi9xWrC9v3ia5M2JJHLKsvi1SpZswOfO
É lá que sobem os arquivos e as atividades de cada entrega (canvas, prints,
testes, slides). Aqui no repositório fica a cópia em `docs/entregas/`.

## Sexta 11/09, à noite

- [x] Anotar em `docs/EVENTO.md` o que a abertura explicou (repositório = pasta no Drive, padrinho, formato livre do canvas)
- [x] @maria **Foto no banner com alguém da organização**, postar com #hackathonoabpr, print em `docs/entregas/prints/` **até 10h de sábado** — 15 pts (story às 9h12, print no Drive e em `prints/2026-09-12-foto-banner-story-maria.jpg`) drive:IMG_0924|banner
- [x] Os três com o projeto rodando (`docs/ONBOARDING.md`); a Maria pelo claude.ai/code no tablet

## Sábado 12/09

### Até 8h30 — check-in dos três (10 pts); dizer que o líder é o Eduardo; anotar o padrinho

### 9h–12h — Entrega 1: Canvas (100 pts) — **não entregar desclassifica**
- [x] @maria @eduardo Preencher o canvas no workshop; base em `docs/IDEIA.md`
- [x] @maria Salvar em `docs/entregas/1-canvas.pdf` (ou link no `docs/entregas/1-canvas.md`) — `ai-canvas.pdf` no Drive e cópia em `docs/entregas/1-canvas.pdf` drive:canvas
- [ ] @eduardo Confirmar a divisão de áreas sugerida na tabela do `CLAUDE.md`

### 12h–15h30 — Entrega 2: V1 com testes internos (100 pts)
- [x] RAG: Lei 9.099/95 + CDC em `docs/juridico/`, recuperados e **citados** na resposta (auditoria: nota 5 em sofisticação)
- [x] Verificação: segunda passada que confere cada afirmação contra o trecho da lei e marca o que não tem base (auditoria: nota 5 em confiabilidade)
- [ ] @fernando Conversa em turnos: o sistema pergunta o que falta, a pessoa responde
- [ ] @eduardo Rodar `npm run testar` nos casos de `docs/entregas/dados-de-teste/`
- [ ] @maria Registrar em `docs/entregas/2-testes-internos.md`: casos, o que errou, o que ajustamos, e onde o modelo tentou inventar e foi barrado drive:testes-internos|2-testes

### 15h30–17h30 — Entrega 3: V2 com testes externos (100 pts)
- [ ] @eduardo Upload de foto de documento → o modelo lê e extrai
- [ ] @fernando Acessibilidade: contraste, fonte grande, rótulos `aria`, funciona só com teclado (auditoria: nota 5 em usabilidade)
- [ ] @maria Pedir a 3+ pessoas de fora (outra equipe, organização) que abram https://habeastitas.eduardomila.adv.br no celular e contem um caso
- [ ] @maria **Depoimento em rede social** de quem testou, com #hackathonoabpr; link em `docs/entregas/3-testes-externos.md` (o Manual pede isso como evidência) drive:depoimento
- [ ] @maria Registrar o que cada um disse e o que mudou drive:testes-externos|3-testes

### Durante o dia
- [x] @maria Foto da equipe nas redes + print no repositório — 5 pts (mesmo story da foto no banner) drive:IMG_0924|equipe
- [ ] @maria @eduardo **Live ou vídeo explicando a ideia com alguém da organização** — 15 pts drive:live|video|vídeo
- [ ] @eduardo Antes de ir embora: `npm run build` passa em `main`, tudo commitado

## Domingo 13/09

### Até 8h30 — check-in dos três (10 pts)

### 9h05–10h30 — Entrega 4: produto + documentação + dados de teste (100 pts)
- [ ] @eduardo Gerar o pedido pronto no formato do formulário do TJPR
- [ ] @eduardo README completo: problema, solução, arquitetura (RAG + verificação + cadeia de prompts), como rodar, como testar, o que fica de fora, **APIs e frameworks referenciados**
- [ ] @maria `docs/entregas/dados-de-teste/casos.json` revisado: casos fictícios variados, incluindo armadilhas de alucinação
- [ ] @fernando `docs/entregas/4-produto.md`: instruções passo a passo para o auditor testar sozinho no nosso laptop drive:4-produto|produto
- [ ] @eduardo Copiar a pasta da equipe para o repositório oficial da OAB/PR (como for combinado)

### 10h30–14h30 — Auditoria técnica (até 300 pts)
- [ ] @fernando @eduardo Alguém fica disponível para o auditor com o app rodando
- [ ] @eduardo Demonstrar os testes rodando ao vivo

### Até 14h30 — Entrega 5: slides do pitch de 2 minutos (50 pts)
- [ ] @eduardo Roteiro imposto: PROBLEMA (20 s) → SOLUÇÃO (20 s) → DEMO (60 s) → IMPACTO (20 s)
- [ ] @eduardo Impacto fala de escala: replicável, baixo custo, outros ramos do Direito (critério 7.5)
- [ ] @eduardo @maria @fernando Slides no formato que a organização pedir; cópia em `docs/entregas/5-pitch.pdf` drive:pitch|slides
- [ ] @eduardo @maria @fernando Ensaiar 3 vezes com cronômetro

### 16h30 — Banca
- [ ] @fernando Caso de exemplo fictício pronto e ensaiado para a demo ao vivo
- [ ] Foto da equipe nas redes + print — 5 pts drive:domingo|banca

## Conteúdo jurídico (Eduardo, em paralelo)
- [ ] @eduardo Regras do JEC que o prompt precisa saber (valor, quem pode, sem advogado)
- [ ] @eduardo Mapa: tipo de caso → caminho extrajudicial → documentos
- [ ] @eduardo Modelo do pedido inicial no padrão do TJPR
