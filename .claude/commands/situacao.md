---
description: Situação do projeto — quem fez o quê, o que está aberto, o que falta pra próxima entrega
---
Me dê a situação do projeto em português, curto:

1. `git log --oneline -15 origin/main` depois de `git fetch`: o que os outros enviaram desde meu último pull, agrupado por pessoa.
2. `docs/TAREFAS.md`: o que está aberto, e qual é a próxima entrega com hora marcada (ver `docs/EVENTO.md`).
3. `git status --short`: o que eu tenho aqui que ainda não entreguei.
4. Se https://hackathon.eduardomila.adv.br responder (`curl -s -o /dev/null -w "%{http_code}"`), diga que o servidor compartilhado está no ar.
