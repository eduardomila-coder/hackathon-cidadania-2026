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

### 12/09, 17h35 — fluxo completo gravado no site público

Antes do teste, o endereço público estava com o formulário morto: a página
chegava sem hidratar (contador preso em `0/4000`, botão desabilitado), enquanto
em `127.0.0.1:3100` funcionava. Causa: o Next 16 em modo `dev` bloqueia os
recursos pedidos por outro domínio. Correção em `next.config.ts`
(`allowedDevOrigins`), commit `3046884`, com reinício do servidor.

Teste automatizado com Playwright (Chromium 1280×900) contra
`https://habeastitas.eduardomila.adv.br`, mesmo caso fictício da geladeira,
modelo `deepseek-v4-pro`:

| Etapa | Tempo | Resultado |
|---|---|---|
| Triagem por texto | 30,6 s | dossiê com 1 de 6 requisitos comprovados e 5 perguntas pendentes |
| Segundo turno (respostas do cliente) | 33,1 s | 4 de 4 requisitos comprovados, 3 chamadas, 12.463 tokens de entrada |

O segundo turno recebeu data da compra, nota fiscal, recusa por WhatsApp e
fotos; o dossiê passou a citar `L9099-3`, `L9099-8`, `L8078-18` e `L8078-26`
como fonte de cada requisito.

**Evidências desta rodada:**

- `prints/2026-09-12-1735-gravacao-triagem.mp4` (1 min 22 s, do relato ao
  dossiê atualizado)
- `prints/2026-09-12-1735-01-relato.png` a `05-dossie-atualizado.png`

**Pendência vista no teste:** o cartão "Esta triagem" mostra "sem preço de
tabela para deepseek-v4-pro"; o custo só é calculado para modelos com preço em
`lib/`.

## Onde o modelo tentou inventar e foi barrado

- O valor em reais dos limites do JEC não foi afirmado sem fonte.
- A existência de recusa e o defeito da geladeira foram mantidos como pontos
  que dependem de prova documental.
- A análise não tratou a recusa formal como requisito legal do pedido.

## O que ajustamos depois dos testes

- A verificação passou a converter qualquer status inesperado do modelo em
  `sem_base`, em vez de derrubar toda a triagem. A regra é conservadora: nada
  desconhecido aparece como confirmado.
