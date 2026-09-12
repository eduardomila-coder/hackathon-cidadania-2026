---
description: Enviar uma mudanca para a revisao do Eduardo, sem publicar na main
---
Quero enviar meu trabalho para revisão. Antes de fazer qualquer comando,
confirme que eu sou Maria ou Fernando. Nunca junte em `main`.

1. Rode `git status --short` e `git diff --stat` e resuma o que mudou.
2. Rode `npm run build`. Se falhar, corrija antes de continuar.
3. Crie um commit pequeno em português, no imperativo, só com o trabalho desta
   tarefa. Não inclua `.env.local`, `docs/privado/` ou arquivo de outra pessoa.
4. Rode `git push -u origin HEAD` na branch atual. Não faça merge, rebase
   forçado ou push para `main`.
5. Diga: nome da branch, o que mudou, como testar e que o Eduardo deve abrir
   `/revisoes` para aprovar. Se `gh` estiver disponível e autenticado, crie uma
   Pull Request para `main`; caso contrário, mostre o link de comparação que o
   GitHub imprimir depois do push.
