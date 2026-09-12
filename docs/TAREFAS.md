# Tarefas, na ordem das entregas

Marque `[x]` ao terminar e faça `/entregar`. Para assumir uma tarefa, escreva
`@eduardo`, `@maria` ou `@fernando` na linha. O painel em
https://habeastitas.eduardomila.adv.br/painel lê este arquivo ao vivo.
Pontuação e horários em `docs/EVENTO.md`.

## Sexta 11/09, à noite

- [x] Anotar em `docs/EVENTO.md` o que a abertura explicou (repositório = pasta no Drive, padrinho, formato livre do canvas)
- [ ] @maria **Foto no banner com alguém da organização**, postar com #hackathonoabpr, print em `docs/entregas/prints/` **até 10h de sábado** — 15 pts
- [ ] Os três com o projeto rodando (`docs/ONBOARDING.md`); a Maria pelo claude.ai/code no tablet

## Sábado 12/09

### Até 8h30 — check-in dos três (10 pts); dizer que o líder é o Eduardo; anotar o padrinho

### 9h–12h — Entrega 1: Canvas (100 pts) — **não entregar desclassifica**
- [ ] @maria @eduardo Preencher o canvas no workshop; base em `docs/IDEIA.md`
- [ ] @maria Salvar em `docs/entregas/1-canvas.pdf` (ou link no `docs/entregas/1-canvas.md`)
- [ ] @eduardo Confirmar a divisão de áreas sugerida na tabela do `CLAUDE.md`

### 12h–15h30 — Entrega 2: V1 com testes internos (100 pts)
- [x] RAG: Lei 9.099/95 + CDC em `docs/juridico/`, recuperados e **citados** na resposta (auditoria: nota 5 em sofisticação)
- [x] Verificação: segunda passada que confere cada afirmação contra o trecho da lei e marca o que não tem base (auditoria: nota 5 em confiabilidade)
- [ ] @fernando Conversa em turnos: o sistema pergunta o que falta, a pessoa responde
- [ ] @eduardo Rodar `npm run testar` nos casos de `docs/entregas/dados-de-teste/`
- [ ] @maria Registrar em `docs/entregas/2-testes-internos.md`: casos, o que errou, o que ajustamos, e onde o modelo tentou inventar e foi barrado

### 15h30–17h30 — Entrega 3: V2 com testes externos (100 pts)
- [ ] @eduardo Upload de foto de documento → o modelo lê e extrai
- [ ] @fernando Acessibilidade: contraste, fonte grande, rótulos `aria`, funciona só com teclado (auditoria: nota 5 em usabilidade)
- [ ] @maria Pedir a 3+ pessoas de fora (outra equipe, organização) que abram https://habeastitas.eduardomila.adv.br no celular e contem um caso
- [ ] @maria **Depoimento em rede social** de quem testou, com #hackathonoabpr; link em `docs/entregas/3-testes-externos.md` (o Manual pede isso como evidência)
- [ ] @maria Registrar o que cada um disse e o que mudou

### Durante o dia
- [ ] @maria Foto da equipe nas redes + print no repositório — 5 pts
- [ ] @maria @eduardo **Live ou vídeo explicando a ideia com alguém da organização** — 15 pts
- [ ] @eduardo Antes de ir embora: `npm run build` passa em `main`, tudo commitado

## Domingo 13/09

### Até 8h30 — check-in dos três (10 pts)

### 9h05–10h30 — Entrega 4: produto + documentação + dados de teste (100 pts)
- [ ] @eduardo Gerar o pedido pronto no formato do formulário do TJPR
- [ ] @eduardo README completo: problema, solução, arquitetura (RAG + verificação + cadeia de prompts), como rodar, como testar, o que fica de fora, **APIs e frameworks referenciados**
- [ ] @maria `docs/entregas/dados-de-teste/casos.json` revisado: casos fictícios variados, incluindo armadilhas de alucinação
- [ ] @fernando `docs/entregas/4-produto.md`: instruções passo a passo para o auditor testar sozinho no nosso laptop
- [ ] @eduardo Copiar a pasta da equipe para o repositório oficial da OAB/PR (como for combinado)

### 10h30–14h30 — Auditoria técnica (até 300 pts)
- [ ] @fernando @eduardo Alguém fica disponível para o auditor com o app rodando
- [ ] @eduardo Demonstrar os testes rodando ao vivo

### Até 14h30 — Entrega 5: slides do pitch de 2 minutos (50 pts)
- [ ] @eduardo Roteiro imposto: PROBLEMA (20 s) → SOLUÇÃO (20 s) → DEMO (60 s) → IMPACTO (20 s)
- [ ] @eduardo Impacto fala de escala: replicável, baixo custo, outros ramos do Direito (critério 7.5)
- [ ] @eduardo @maria @fernando Slides no formato que a organização pedir; cópia em `docs/entregas/5-pitch.pdf`
- [ ] @eduardo @maria @fernando Ensaiar 3 vezes com cronômetro

### 16h30 — Banca
- [ ] @fernando Caso de exemplo fictício pronto e ensaiado para a demo ao vivo
- [ ] Foto da equipe nas redes + print — 5 pts

## Conteúdo jurídico (Eduardo, em paralelo)
- [ ] @eduardo Regras do JEC que o prompt precisa saber (valor, quem pode, sem advogado)
- [ ] @eduardo Mapa: tipo de caso → caminho extrajudicial → documentos
- [ ] @eduardo Modelo do pedido inicial no padrão do TJPR
