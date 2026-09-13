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

## 13/09, 0h45 — plataforma publicada e conferida no endereço público

A branch entrou em `main` por fast-forward (PR #9) e o servidor compartilhado
passou a servir a plataforma: `https://habeastitas.eduardomila.adv.br/escritorio`
redireciona para `/entrar` e o formulário responde pelo túnel.

| Verificação no endereço público | Resultado |
|---|---|
| `/entrar` abre com a faixa de demonstração | ok |
| O React assume a página antes do primeiro clique | ok |
| Campo digitado liga o botão e a credencial errada volta como erro na tela | ok, 3 rodadas seguidas |
| Tempo até a tela ficar interativa | 0,4 a 0,6 s pelo túnel; 0,1 a 0,3 s local |

Cuidado para quem for testar: nos primeiros segundos, logo depois de o servidor
subir, a página chega antes de o React assumir os campos. Digitar nessa janela
faz o React devolver o campo ao estado inicial e o botão de entrar fica apagado,
como se a página estivesse morta. A tela está pronta quando o botão acende ao
digitar.

Criada uma conta de advogado pela API da equipe (`eduardo`) e testado o login
pelo endereço público: `/escritorio` mandou para o login, o login abriu o painel
com o nome e a OAB no cabeçalho, a faixa de demonstração e o estado vazio
orientando o primeiro caso.

**Prints:** `prints/2026-09-13-testes/06-endereco-publico-entrar.png` e
`07-escritorio-no-endereco-publico.png`.

### Contas e casos de demonstração

Para a auditoria não depender de digitar dados na hora, três advogados fictícios
foram criados e semeados pela API da equipe, com
`SENHA_DEMO=... node --env-file=.env.local scripts/semear-demo.mjs <endereço>`.
O script não guarda senha: ela vem do ambiente, porque o repositório é público.
A senha das quatro contas de demonstração está em `.contas-demo.txt`, na pasta
do clone `-live`, fora do git.

| Conta | Casos | O que demonstra |
|---|---|---|
| `ana.souza` (OAB/PR 12345) | Busca e apreensão de moto financiada (nomeação, com processo real no DataJud) e plano de saúde que negou cirurgia | Ficha de nomeação, consulta ao TJPR e uma triagem já feita, com 1 de 4 requisitos comprovados |
| `bruno.lima` (OAB/PR 54321) | Pensão atrasada há quatro meses e acordo trabalhista não pago | Casos que **não** cabem no Juizado, com o motivo na tela |
| `carla.mendes` (OAB/PR 67890) | Atraso de dois anos na entrega do apartamento (acima de oitenta mil) e tarifa bancária indevida | O caso do limite do Juizado e um consumidor pequeno |

Cada caso já nasceu com o checklist de documentos, com um ou dois documentos
marcados como recebidos, tarefas com prazo e linha do tempo com registro. O
painel de cada conta mostra os cartões preenchidos, e os prazos aparecem em
vermelho quando vencem na semana.

**Isolamento conferido na tela, no endereço público:** as três contas entraram em
navegador, cada uma viu só os dois casos dela e nenhum título de caso das outras.
Prints: `08-demo-ana-painel.png`, `09-demo-bruno-painel.png` e
`10-demo-carla-painel.png`.


### Tela de mensagens no visual da Mila (13/09, 4h)

A pedido do Eduardo, a tela de Mensagens foi refeita com o visual do painel de
mensagens da Mila (o de produção), sem trazer as bibliotecas dela: papel de parede
do chat, balão com rabicho no canto superior, balões agrupados na mesma sequência
(sem rabicho), hora no rodapé do balão, marca de enviada, separador de dia, lista
com avatar de iniciais, busca e selo de não lidas, e compositor com painel de
emoji. As ações continuam as nossas: sugerir resposta, vincular a um caso, abrir
caso com a conversa e enviar só com o clique do advogado. Ficaram de fora, de
propósito, o que depende de biblioteca nova ou de backend que não existe aqui
(mídia baixada, reações, encaminhar, fixar, várias identidades de envio, tempo
real). A única diferença de cor é o balão de saída, que usa o azul do Ponto Dativo
em tom claro no lugar do verde-água da marca da Mila.

**Conferido no endereço público, com a conta `ana.souza`, 18 verificações em
navegador:** a lista mostra a conversa e o vínculo com o caso, com o selo de não
lidas; a conversa tem seis balões, dois separadores de dia, um par agrupado, hora
e marca de enviada; o painel de emoji abre e insere no campo; o botão de enviar
começa apagado e acende com texto; a terceira coluna abre em tela larga; a mesma
conversa aparece dentro da página do caso; e no celular aparece uma coluna por
vez. Prints `11-mensagens-lista.png` a `14-mensagens-celular.png`.

**Conversa de demonstração:** gravada direto no `data/` do clone `-live`, ligada
ao caso do plano de saúde da `ana.souza` (seis mensagens, a última não lida),
porque não existe API para inserir mensagem: as mensagens entram pelo webhook. O
número fictício `+55 (41) 99000-1122` foi cadastrado pela própria tela do
WhatsApp, então o aviso de conexão diz que o número existe e está desconectado, em
vez de dizer que nenhum número foi cadastrado, o que contradiria a conversa na
tela.

**Teste do repositório:** `scripts/testar-ponta-a-ponta.py` rodado em worktree
isolado depois da troca da tela: 39 de 39. No caminho apareceu uma corrida no
próprio teste, que lia a página antes de o aviso de conexão chegar (é um pedido
separado do da lista); o teste passou a esperar o aviso. `lint` sem erro, `tsc`
limpo e `npm run build` verde.


### Estagiário virtual (13/09, 1h30)

A pedido do Eduardo, o Ponto Dativo ganhou o estagiário virtual, com o desenho do
robô da Estagiária da Mila (`backend/whatsapp/services/ai_robot.py`): ligado por
conversa pelo advogado, ele responde o cliente pelo WhatsApp seguindo as regras de
lá (não inventar fato, não revelar nota interna, não prometer resultado, não falar
de prazo, não repetir o que já foi dito, não responder agradecimento, mensagem
curta = resposta curta) e decide no próprio contrato se responde, com `enviar`,
`confianca` e `motivoDeSilencio`.

Três travas iguais às de lá: confiança mínima (cuidadoso 0,85, padrão 0,72,
confiante 0,5), envio automático ou só sugestão, e o atendimento por conversa, não
por escritório. Quando ele não envia, o texto vira sugestão na tela com o motivo,
e o advogado manda como está, edita ou descarta; toda decisão, inclusive a de
ficar quieto, fica registrada no caso. A mensagem que saiu por ele leva o selo
"estagiário" no balão, para ninguém confundir quem falou. O webhook da Evolution
aciona o estagiário depois de responder, e mensagens seguidas do cliente viram um
atendimento só.

**Conferido em ambiente isolado com `scripts/testar-estagiario.mjs`, 21 de 21
verificações:** com ele desligado o webhook só guarda a mensagem e ninguém
responde; ligado em modo sugestão ele prepara a resposta e nada sai para o
cliente; o caso ganha o registro da decisão; o agradecimento não vira conversa
fiada; a simulação da tela mostra o que ele faria sem enviar; e desligar devolve a
conversa ao advogado. **No endereço público, 8 de 8** com a conta `ana.souza`: o
painel liga, simula, mostra a sugestão com o motivo, descarta e desliga.

**Na demonstração ele fica desligado**, para o auditor ligar como o advogado
faria. O painel está na coluna da direita da tela de Mensagens, e o botão "Testar
agora" mostra a resposta que ele daria sem enviar nada.

Prints: `15-mensagens-estagiario-desligado.png`,
`16-mensagens-estagiario-ligado.png` e `17-mensagens-estagiario-sugestao.png`.
