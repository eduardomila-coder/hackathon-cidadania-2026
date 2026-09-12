---
description: Enviar uma mudança para o Habeas Release, sem publicar na main
---
Quero enviar meu trabalho para revisão no Habeas Release. Nunca junte em main,
independentemente de quem esteja usando este comando.

1. Rode git status --short e git diff --stat e resuma o que mudou.
2. Rode npm run build. Se falhar, corrija antes de continuar.
3. Crie um commit pequeno em português, no imperativo, só com o trabalho desta
   tarefa. Não inclua .env.local, docs/privado/ ou arquivo de outra pessoa.
4. Rode git push -u origin HEAD na branch atual. Não faça merge, rebase forçado
   ou push para main.
5. Se gh estiver disponível e autenticado, crie uma Pull Request para main;
   caso contrário, mostre o link de comparação que o GitHub imprimir depois do
   push.
6. Diga o nome da branch, o que mudou, como testar e que a revisão está em
   /revisoes. A aprovação abre o GitHub para o merge final.
