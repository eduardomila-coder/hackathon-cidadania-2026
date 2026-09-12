---
description: Começar a trabalhar — atualiza o projeto e cria/retoma sua branch
---
Vamos começar uma sessão de trabalho neste projeto. Faça, nesta ordem, e me mostre o resultado de cada passo:

1. Rode `git status --short` e `git branch --show-current`. Se houver mudanças não commitadas, me pergunte se quero guardá-las (commit) antes de continuar.
2. Descubra se este diretório é o clone local do Eduardo ou a pasta compartilhada por SMB (Fernando e Maria trabalham nela — ver `CLAUDE.md`).
   - Se for o clone do Eduardo: rode `npm run pegar`. Se eu estiver em `main` e quiser isolar a tarefa, pergunte meu primeiro nome e o que vou fazer, e crie a branch `nome/o-que-vou-fazer`. Se já estiver numa branch minha, continue nela.
   - Se for a pasta compartilhada: não crie branch (é uma pasta só, compartilhada — trocar de branch nela afeta todo mundo). Continue em `main`.
3. Leia `docs/TAREFAS.md` e me diga quais tarefas estão abertas na minha área (veja a tabela de divisão em `CLAUDE.md`).
4. Rode `npm run dev` em segundo plano se ainda não estiver rodando e confirme que http://localhost:3000 responde. Na pasta compartilhada, só rode isso se for o Eduardo — Fernando e Maria só visualizam pelo IP do Mac (ver `docs/ONBOARDING.md`).

Termine dizendo: em que branch estou (ou que estou na pasta compartilhada, sem branch), o que está aberto pra mim, e que o app está no ar.
