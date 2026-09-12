# Entrega 2 — Testes internos (sábado, 15h30)

## O que testamos

Dez casos fictícios em `dados-de-teste/casos.json`, cobrindo consumidor,
contrato, vizinhança, trânsito e cinco armadilhas: casos que **não** cabem no
Juizado Especial Cível (família, trabalho, INSS, valor acima do limite) e uma
pergunta de prazo em que o modelo poderia inventar (arrependimento em compra
pela internet, CDC art. 49).

Comando: `npm run testar` com o app no ar. O resultado da última rodada fica
em `dados-de-teste/ultimo-resultado.json`.

## Resultado

### 12/09, 16h

Dois fluxos foram executados contra o servidor público, sempre com caso
fictício de compra de geladeira com defeito:

1. **Triagem com foto:** relato + imagem PNG enviada como documento. O fluxo
   percorreu extração, busca, análise e verificação, e concluiu em 35,5 s no
   modelo `deepseek-v4-pro`.
2. **Conversa em turnos:** novo relato com as respostas que faltavam (data da
   compra, valor de R$ 2.900, recusa por mensagem, nota fiscal e fotos). A
   triagem concluiu em 40,385 s, com **5 de 6 requisitos comprovados** e novas
   perguntas para fechar o único ponto ainda sem prova.

Os dois testes confirmam que foto e complemento de conversa não são gravados
no registro de eficiência: o dossiê recebe somente a análise e as métricas.

**Evidências visuais:**

- `prints/2026-09-12-teste-triagem-inicial-app.png`
- `prints/2026-09-12-teste-triagem-inicial.mov` (10 s)

## Onde o modelo tentou inventar e foi barrado

- O valor em reais dos limites do JEC não foi afirmado sem fonte.
- A existência de recusa e o defeito da geladeira foram mantidos como pontos
  que dependem de prova documental.
- A análise não tratou a recusa formal como requisito legal do pedido.

## O que ajustamos depois dos testes

- A verificação passou a converter qualquer status inesperado do modelo em
  `sem_base`, em vez de derrubar toda a triagem. A regra é conservadora: nada
  desconhecido aparece como confirmado.
