# Tarefas, na ordem das entregas

Marque `[x]` ao terminar e faça commit. Quem pega escreve o nome.
Pontuação e horários em `docs/EVENTO.md`.

## Sexta 11/09, à noite

- [ ] Anotar em `docs/EVENTO.md` o que a abertura explicar (repositório oficial, formato das entregas, critérios da auditoria)
- [ ] **Foto no banner com alguém da organização**, postar com #hackathonoabpr, print em `docs/entregas/prints/` — 15 pts
- [ ] Os três com o projeto rodando (`docs/ONBOARDING.md`) e chave no `.env.local`

## Sábado 12/09

### Até 8h30 — check-in dos três (10 pts)

### 9h–12h — Entrega 1: Canvas (100 pts)
- [ ] Preencher o canvas no workshop; base em `docs/IDEIA.md`
- [ ] Salvar em `docs/entregas/1-canvas.pdf` (ou link no `docs/entregas/1-canvas.md`)
- [ ] Decidir a divisão de áreas e preencher a tabela do `CLAUDE.md`

### 12h–15h30 — Entrega 2: V1 com testes internos (100 pts)
- [ ] Conversa em turnos: o sistema pergunta o que falta, a pessoa responde
- [ ] Rodar `node scripts/testar-casos.mjs` nos casos de `docs/entregas/dados-de-teste/`
- [ ] Registrar o resultado em `docs/entregas/2-testes-internos.md`: o que deu certo, o que errou, o que ajustamos

### 15h30–17h30 — Entrega 3: V2 com testes externos (100 pts)
- [ ] Upload de foto de documento → o modelo lê e extrai
- [ ] Pedir a 3 pessoas de fora (outra equipe, organização) que usem e contem um caso
- [ ] Registrar em `docs/entregas/3-testes-externos.md`: quem testou, o que disse, o que mudou

### Durante o dia
- [ ] Foto da equipe nas redes + print no repositório — 5 pts
- [ ] **Live ou vídeo explicando a ideia com alguém da organização** — 15 pts
- [ ] Antes de ir embora: `npm run build` passa em `main`, tudo commitado

## Domingo 13/09

### Até 8h30 — check-in dos três (10 pts)

### 9h05–10h30 — Entrega 4: produto + documentação + dados de teste (100 pts)
- [ ] Gerar o pedido pronto no formato do formulário do TJPR
- [ ] README completo: problema, solução, como rodar, como testar, o que fica de fora
- [ ] `docs/entregas/dados-de-teste/casos.json` revisado: casos fictícios variados
- [ ] `docs/entregas/4-produto.md`: resumo do produto para o auditor

### 10h30–14h30 — Auditoria técnica (até 300 pts)
- [ ] Alguém fica disponível para o auditor com o app rodando
- [ ] Demonstrar os testes rodando ao vivo

### Até 15h — Entrega 5: slides do pitch de 2 minutos (50 pts)
- [ ] Roteiro: problema (20 s), demo (60 s), o que fica de fora (20 s), próximos passos (20 s)
- [ ] Slides no formato que a organização pedir; cópia em `docs/entregas/5-pitch.pdf`
- [ ] Ensaiar 3 vezes com cronômetro

### 16h30 — Banca
- [ ] Caso de exemplo fictício pronto e ensaiado para a demo ao vivo
- [ ] Foto da equipe nas redes + print — 5 pts

## Conteúdo jurídico (Eduardo, em paralelo)
- [ ] Regras do JEC que o prompt precisa saber (valor, quem pode, sem advogado)
- [ ] Mapa: tipo de caso → caminho extrajudicial → documentos
- [ ] Modelo do pedido inicial no padrão do TJPR
