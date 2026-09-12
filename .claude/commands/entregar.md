---
description: Enviar o que fiz para o Habeas Release
---
Quero enviar o que fiz nesta sessão para o Habeas Release. Este comando usa o
mesmo fluxo de revisão para qualquer integrante. Nunca publique diretamente na
main.

1. Rode git status --short e git diff --stat e mostre em uma frase o que mudou.
2. Se eu estiver em main, pare e crie ou peça para criar uma branch de trabalho.
3. Rode npm run build.
4. Faça um commit pequeno em português, no imperativo.
5. Rode git push -u origin HEAD. Se gh estiver disponível e autenticado, crie a
   Pull Request para main.
6. Se o build falhar, conserte antes de continuar. Não envie nada que não
   compila.
7. Se der conflito, mostre os arquivos e pergunte antes de resolver.
8. Marque em docs/TAREFAS.md as tarefas concluídas e inclua no mesmo envio.

Termine dizendo a branch, o link ou número da Pull Request e que a revisão
aparece em https://habeastitas.eduardomila.adv.br/revisoes. Só depois do merge
aprovado no GitHub a versão chega ao site.
