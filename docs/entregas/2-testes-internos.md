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

## 13/09, 0h — bateria completa, isolamento e ponta a ponta

Rodada no commit `f3cb87c`, em cópia isolada do repositório com `data/` limpo,
para não encostar no servidor compartilhado.

| Teste | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` | 0 erros, 1 aviso (`<img>` em `app/page.tsx`) |
| Build | `npm run build` | limpo, TypeScript sem erro |
| Casos fictícios | `npm run testar` | **10 de 10** como esperado |
| Isolamento entre advogados | `node scripts/testar-isolamento.mjs` | **29 de 29** verificações |
| Ponta a ponta no navegador | `python3 scripts/testar-ponta-a-ponta.py` | **39 de 39** verificações |

**O que o isolamento demonstrou:** com duas contas criadas pela API da equipe,
um advogado não aparece na lista, no resumo nem nos clientes do outro, e recebe
404 em `GET`, em `PATCH` e nas cinco rotas de filho do caso alheio (documentos,
tarefas, registros, triagem e processo). O caso do primeiro segue intacto depois
das tentativas. Sem cookie a API responde 401, cookie adulterado é recusado, a
página manda para `/entrar`, usuário repetido dá 409 e o webhook do WhatsApp
fica fora do login.

**O que o ponta a ponta demonstrou:** a advogada entra com a conta que a equipe
criou, o painel abre no estado vazio orientando o primeiro caso, o caso novo
nasce no painel, a triagem devolve a contagem de requisitos com o trecho de lei
citado (`[L9099-3]`) e o aviso de que não é probabilidade de êxito, o documento e
a tarefa são gravados, o DataJud devolve classe e órgão do processo
`0001258-98.2020.8.16.0171` em "Andamento no TJPR", a intimação colada vira ficha
e caso com as duas tarefas de conferência, as mensagens avisam que falta
cadastrar o WhatsApp, o número vira instância própria (`ponto-dativo-<login>`),
com QR, e pode ser removido, e o painel não rola de lado em 390 px.

**Achado e conserto:** a bateria falhava 1 caso por rodada, em caso diferente a
cada vez, sempre com JSON fora do contrato (`documentos_necessarios` ausente ou
`fonte: null` na verificação). O `perguntarJson` passou a repetir a pergunta uma
vez, com o erro do validador na mensagem e sem afrouxar o schema. Na rodada
seguinte fechou 10 de 10, e 2 dos 10 casos foram salvos pela segunda tentativa.

**O que continua frágil, medido:** os dois casos de valor alto
(`valor-acima-limite` e `plano-saude-alto-valor`) oscilam no cabimento do
Juizado: o prompt proíbe converter salários mínimos em reais, então o modelo ora
responde que cabe, ora que não cabe. Precisa de regra própria, ou do salário
mínimo no contexto, antes de virar produto. O custo da triagem continua
aparecendo como "sem preço" para o `deepseek-v4-pro`.

**Evidências:** `prints/2026-09-13-testes/` (painel vazio, caso com triagem,
ficha da nomeação, QR do WhatsApp e painel no celular) e
`dados-de-teste/ultimo-resultado.json` com a rodada 10 de 10.
