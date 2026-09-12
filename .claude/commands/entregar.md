---
description: Entregar o que fiz — build, commit, junta em main e sobe para o servidor
---
Quero entregar o que fiz nesta sessão. Este comando é só do Eduardo. Se eu não
for Eduardo, pare e diga para usar `/enviar-revisao`.

Faça, nesta ordem:

1. `git status --short` e `git diff --stat`: me mostre em uma frase o que mudou.
2. Escreva uma mensagem de commit em português, no imperativo, curta (ex.: "adiciona upload de foto ao relato"). Me mostre e use-a.
3. Rode `npm run enviar -- "a mensagem"`. Esse comando faz commit, atualiza com main, roda o build, junta em main e faz push.
4. Se o build falhar: conserte o erro, e rode `npm run enviar` de novo. Não faça push de nada que não compila.
5. Se der conflito de merge: me mostre os arquivos em conflito e pergunte antes de resolver — pode ser algo que outra pessoa está mexendo agora.
6. Marque em `docs/TAREFAS.md` as tarefas que esta entrega concluiu (`[x]`) e inclua no mesmo envio.

Termine dizendo o que foi pra main e lembrando que em até 1 minuto está em https://hackathon.eduardomila.adv.br
