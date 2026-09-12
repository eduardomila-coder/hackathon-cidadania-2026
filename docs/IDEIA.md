# A ideia

Decidida nas reuniões de 10/09/2026 (manhã e noite; transcrições em
`docs/privado/`). Foco fechado: **Juizado Especial Cível e acesso à Justiça
para a população de baixa renda e leiga.**

## O problema

Hoje a pessoa vai ao juizado, recebe um formulário, escreve a história à mão,
leva alguns documentos e a secretaria distribui. Muita gente acaba nos NPJs
(como o da PUC) só para entender o que está acontecendo. Comarcas menores nem
têm juizado separado. Pessoas longe do fórum, idosas ou sem instrução ficam
de fora.

## A solução

Uma atendente virtual, como se fosse a pessoa da secretaria:

1. A pessoa **conta a história** com as próprias palavras, de preferência
   **por voz**, e manda **fotos dos documentos**.
2. O sistema **entende e classifica** o caso (consumidor, contrato,
   vizinhança...), como a secretaria faz hoje ao filtrar.
3. Diz se **cabe no JEC** e, importante, se existe **caminho sem processo**
   (Procon, consumidor.gov.br, mediação): "às vezes a pessoa está levando uma
   demanda para a Justiça que poderia ter outras formas de solução".
4. Vai **pedindo o que falta** (documentos, informações), como uma atendente
   de verdade.
5. **Monta o pedido** no formato do formulário virtual do TJPR.

## O que fica de fora (por enquanto)

- Integração real com o tribunal via convênio direto. Mostramos o pedido
  pronto para a pessoa levar ou protocolar. **Atualização 12/09/2026:** existe
  um caminho sem convênio — ver "Proposta: acompanhamento real do processo"
  abaixo, ainda não implementado, aguardando aprovação do Eduardo.
- Orientação jurídica no sentido de parecer: risco de conflito com a OAB.
  O sistema **explica e organiza**; não aconselha se processa ou não.

## Tamanho do público

Segundo o *Perfil ADV — 1º Estudo Demográfico da Advocacia Brasileira*
(OAB Nacional + FGV, dados de 2023, divulgado em 2024):

- O Brasil tem cerca de **1,3 milhão de advogados e advogadas** inscritos
  na OAB.
- **72% atuam como advogados autônomos**, sem vínculo com escritório ou
  empresa — cerca de **900 mil a 940 mil pessoas**. Só 29% estão
  vinculados a escritórios privados.
- A proporção de autônomos cresce com a idade: 72% entre os de 60 anos ou
  mais, caindo para 56% entre os de 21 a 23 anos.

Reforça o problema: é um público grande, disperso e sem estrutura de
escritório por trás, que se beneficiaria de uma ferramenta que organiza o
caso e aponta se cabe no JEC antes de entrar com um processo.

Fontes: [OAB](https://www.oab.org.br/noticia/62213/perfil-adv-maioria-dos-advogados-brasileiros-sao-autonomos),
[Migalhas](https://www.migalhas.com.br/quentes/406378/72-dos-advogados-sao-autonomos),
[estudo completo (FGV, PDF)](https://conhecimento.fgv.br/sites/default/files/2025-01/publicacoes/perfil_adv_1o-estudo_demografico_da_advocacia_brasileira.pdf).

## Leitura B2B2C: mesmo produto, canal pelo advogado autônomo

Ideia levantada em conversa com a Maria em 12/09/2026, para registrar e
levar ao grupo — **não implementar agora**, é reformulação de discurso do
produto atual, não feature nova.

O advogado autônomo (ver "Tamanho do público" acima) tem problemas que a
cadeia atual já resolve, sem mudar nada de código:

1. **Triagem que hoje não é cobrada.** Antes de fechar contrato, o
   advogado gasta tempo sem remuneração ouvindo o cliente e decidindo se
   vale abrir o caso. É a mesma cadeia extrair → buscar na lei → analisar
   citando trecho → verificar que já existe em `lib/analise.ts`.
2. **O cliente dele é o mesmo leigo que o produto atende.** O advogado
   pode mandar o link para o cliente preencher antes da consulta: a
   pessoa chega com o relato organizado, documentos listados e já
   sabendo se é caso de JEC. Modelo B2B2C — o produto não muda, ganha um
   canal de distribuição (o próprio advogado divulgando para a carteira
   de clientes).
3. **Petição no formato pronto.** O pedido no formato do TJPR que o
   sistema já monta economiza redação repetitiva de causas de baixo
   valor, o tipo de caso que autônomo pega e escritório grande não quer.

**Ponto que muda a leitura do risco com a OAB:** a ressalva registrada em
"O que fica de fora" acima (não aconselhar, risco de conflito com a OAB)
vale para aconselhar a pessoa leiga diretamente. Se quem usa é o
**advogado**, o risco praticamente some: é ferramenta de apoio a
profissional habilitado, que assina a peça por cima — não é o sistema
dando parecer para quem não é advogado. Vale como resposta pronta no
pitch para a pergunta "e o risco com a OAB?".

> **Correção após pesquisa em 12/09/2026 (ver seção "Pesquisa" abaixo):**
> essa frase está incompleta. O **Provimento 205/2021 da OAB** regula
> exatamente chatbot de advogado/escritório, e proíbe citar artigo de lei
> ou emitir parecer sobre o caso — que é o que `motivo_juizado` e
> `fundamentos` fazem hoje. Ou seja: **se o produto virar o chatbot de um
> advogado específico (o modelo B2B2C), o risco pode aumentar, não
> diminuir.** O risco só é baixo enquanto a ferramenta for genérica, sem
> vínculo com um advogado ou escritório determinado — como é hoje.

### Requisito, se essa leitura virar produto: reconhecer quando é hora de um humano

Precisão da Maria em 12/09/2026, complementando a ideia acima: nesse
formato a ferramenta é o **canal de contato com o cliente**. O advogado
entra pouco — responde perguntas pontuais, dá um norte, sem escrever muito
material. A IA fica só **repassando informação organizada**. Isso só
funciona se o sistema souber **reconhecer quando a pergunta não é para IA
responder, e sim encaminhar para o advogado**.

Isso não é o mesmo mecanismo que já existe: hoje `lib/etapas.ts` verifica
se uma **afirmação sobre a lei** tem base no trecho citado (`sem_base` /
`confirmada` / `contradiz` — controle de alucinação). O que falta é outra
checagem, sobre a **natureza da pergunta**, não sobre a fonte legal:
perguntas de estratégia ("devo processar ou não", "vale a pena aceitar o
acordo"), decisão sobre valor/negociação, caso emocionalmente sensível, ou
prazo urgente e específico do processo real da pessoa — isso é para o
advogado responder, não a IA, mesmo que a IA "soubesse" a resposta.

**Importante (ajuste da Maria em 12/09/2026, pra não ler tudo isso ao
contrário): a resposta genérica é exceção, não regra.** Tudo que está
registrado aqui — sinais A, B, C, tom, compaixão — é sobre **tratamento
do cliente para garantir a satisfação dele**, não sobre a IA passar a
responder pouco. A regra geral continua sendo o que o produto já faz:
responder de verdade, organizar o caso, citar a lei, apontar caminho. A
resposta genérica só entra **nos casos marcados pelos sinais abaixo**, e
o motivo dela existir é bem específico: **não passar por cima do
advogado** em decisão que é dele (estratégia, negociação, avaliação de
risco do caso). Fora desses gatilhos, a IA responde com todo o material
que já tem.

**O filtro, definido em duas partes** (não implementado — mexe em `lib/`,
pendência para o Eduardo, ver `docs/CEREBRO.md`):

**A. Sinais que já existem no pipeline hoje**, sem precisar de nada novo:

- `verificacao.confiavel === false` (`lib/etapas.ts`, etapa "verificar") —
  já significa que uma afirmação central ficou `sem_base` ou `contradiz`:
  o caso é mais complexo do que a base jurídica carregada cobre com
  segurança.
- `analise.sem_base.length > 0` em `motivo_juizado` ou `orientacao` —
  mesma lógica, pontos centrais sem fundamento.
- `analise.area` fora do escopo do produto (`familia`, `trabalho`) — já
  existe `encaminhamento`, só falta deixar mais visível na interface.

**B. Um sinal novo, que exige julgamento** — a natureza do pedido, não a
fonte legal. A IA não distingue isso por regra fixa, precisa ser
instruída a reconhecer o padrão. São perguntas de **decisão pessoal ou
estratégica**, não "o que diz a lei":

- Estratégia: "devo processar ou não", "vale a pena entrar com isso".
- Negociação de valor: "quanto eu peço", "aceito o que ofereceram".
- Situação de risco pessoal (segurança, ameaça).
- Prazo real e específico do caso da pessoa (não a regra geral da lei).

Campo novo na `Analise` (`lib/etapas.ts`, etapa "analisar"):
`encaminhar_advogado: boolean` + `motivo_encaminhar: string | null`,
com instrução explícita no prompt de análise: se o que a pessoa quer
(`o_que_quer`) ou o relato pedir uma decisão estratégica, negociação de
valor, avaliação de risco pessoal, ou envolver urgência real de um
processo já em andamento, marcar `encaminhar_advogado: true` e **não**
preencher `orientacao` com uma recomendação de mérito — só sinalizar que
aquele ponto precisa do advogado.

**Como responder quando cai no filtro** (ajuste da Maria em 12/09/2026):
não é recusa seca. É o que uma secretária de verdade faz quando a
pergunta passa do que ela pode responder — resposta **genérica, sem
compromisso**, seguida de um próximo passo concreto de contato humano,
não "isso eu não sei" e ponto:

> "Essa decisão é sua, com orientação do seu advogado — cada caso pesa
> diferente. Posso já agendar uma conversa, ou prefere que ele te ligue
> depois?"

Ou seja, `motivo_encaminhar` não vira só um aviso — vira o texto de uma
resposta padrão nesse tom (reconhece a pergunta, não avalia o mérito,
oferece agendar/ligar), reaproveitando o canal de WhatsApp já registrado
em `docs/entregas/3-testes-externos.md` como o "agendar conversa" de
verdade.

**Segundo ajuste da Maria (mesmo dia): compaixão, não só limite.** A
resposta acima serve para decisão estratégica neutra ("devo processar?").
Mas quando o relato indica **sofrimento, medo ou situação delicada** — não
só "isso é uma decisão sua", mas dor de verdade — o tom não pode ser só
administrativo. Precisa **reconhecer a dor da pessoa** e dizer, com
todas as letras, que aquilo **merece atenção de verdade, não uma
resposta por mensagem**:

> "Percebo que isso pesa muito pra você, e é o tipo de assunto que merece
> ser conversado com calma, não resolvido por mensagem. Vou pedir para o
> seu advogado te ligar o quanto antes — tudo bem?"

Isso é um **terceiro tipo de sinal**, além dos sinais A e B acima: não é
sobre a lei nem sobre estratégia, é sobre o **estado emocional** que o
relato demonstra (medo, angústia, urgência pessoal). Precisa entrar na
etapa "extrair" (`lib/etapas.ts`, que já lê o relato bruto primeiro),
como um campo tipo `sinal_de_sofrimento: boolean`, porque é ali que o
relato original da pessoa é lido antes de virar fato jurídico — e o
prompt dessa etapa já é curto e sem julgamento hoje ("Não julgue, não
oriente, não cite lei"), então essa seria uma exceção deliberada a essa
regra, só para captar esse sinal.

**Os dois princípios juntos**: colocar limite (a IA não avalia mérito
nem promete resultado) sem soar fria — reconhecer o que a pessoa está
sentindo antes de encaminhar, principalmente quando o assunto é
delicado.

**Terceiro ajuste da Maria (mesmo dia): nunca rotular a pessoa.**
Reconhecer a dor não é **classificar** a pessoa — a resposta nunca diz
"você está vulnerável" ou qualquer rótulo parecido na cara dela. Isso
soa clínico e de cima para baixo, o oposto do acolhimento que o ajuste
acima busca. `sinal_de_sofrimento` é um **campo interno**, que decide o
tom e o encaminhamento; não vira palavra na resposta. A frase de exemplo
acima ("percebo que isso pesa muito pra você...") já segue essa regra —
fala do assunto ("isso pesa", "situação delicada"), nunca da pessoa
("você é vulnerável"). Vale como instrução explícita no prompt também,
para não escapar em nenhuma variação de resposta que o modelo gerar.

### Pesquisa: contato com o cliente e como melhorar essas diretrizes (12/09/2026)

Pedido da Maria: pesquisar prática de mercado e regra da OAB para
melhorar o que está registrado acima. Três frentes:

**1. Handoff de IA para humano (prática geral de atendimento) confirma o
desenho, com números:**

- Taxa saudável de encaminhamento para humano: **15–25%** das conversas.
  Abaixo de 10%, sinal de que a pessoa não está achando a opção de
  humano; acima de 30%, sinal de que a IA está encaminhando demais ou não
  resolvendo sozinha. Dá pra usar como meta quando o produto tiver uso
  real.
- **80% das pessoas só usam um chatbot se souberem que existe opção de
  humano.** Isso é mais forte que só disparar o sinal quando algo dá
  errado: **mostrar sempre**, num canto fixo da tela, que dá pra falar
  com o advogado quando quiser — não só nos gatilhos A/B/C.
- Transferência "morna" (o humano recebe um resumo do que já foi
  conversado antes de entrar) em vez de "fria" (a pessoa repete tudo) —
  bate com reaproveitar o `resumo` que a etapa "analisar" já gera, como
  contexto pro advogado quando ele entrar pelo WhatsApp.

**2. IA em situação de crise/saúde sensível (pesquisa acadêmica) confirma
o sinal C:**

- A checagem do sinal de sofrimento deve rodar **antes** de gerar
  qualquer resposta de mérito — bate com a decisão já registrada de
  colocar `sinal_de_sofrimento` na etapa "extrair" (primeira etapa da
  cadeia), não depois.
- A IA deve deixar claro que é IA, sem fingir ser humana — vale conferir
  se isso já está explícito na tela hoje.

**3. Provimento 205/2021 da OAB — corrige a leitura do risco no modelo
B2B2C** (ver aviso na seção "Leitura B2B2C" acima): chatbot de
advogado/escritório específico não pode citar artigo de lei nem emitir
parecer sobre o caso — hoje o produto faz as duas coisas
(`fundamentos`/`fonte` e `motivo_juizado`). **Enquanto a ferramenta for
genérica** (sem vínculo com um advogado determinado, como é hoje), essas
regras de publicidade não se aplicam. Se o modelo B2B2C avançar, isso
precisa ser resolvido antes — por exemplo, uma versão do resultado que o
advogado vê (com artigo citado) diferente da que o cliente vê (sem
citação, só "seu advogado vai avaliar isso com base na lei").

Fontes: [Provimento 205/2021 — contexto geral](https://jurisoft.com.br/blog/provimento-205-2021-da-oab-contexto-geral-do-regramento/),
[chatbot de advocacia e o que o Provimento permite/proíbe](https://kivohub.ai/blog/chatbot-advocacia-conformidade-oab),
[compliance com o Provimento 205/2021](https://chatjuridico.com.br/ia-sem-violar-etica-oab/),
[handoff de IA para humano — taxas e boas práticas](https://www.bluetweak.com/blog/ai-to-human-handoff),
[handoff em atendimento — pesquisa Zendesk 2026 citada](https://www.getmacha.com/blog/ai-chatbot-human-handoff),
[chatbots de saúde mental — detecção de crise e empatia (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11420590/).

## Proposta: acompanhamento real do processo (aguardando aprovação do Eduardo)

Pedido da Maria em 12/09/2026: a ferramenta atualizar o cliente sobre em que
fase o processo real dele está e quais os próximos andamentos, em linguagem
simples. Já tinha sido levantado e deixado de lado (ver "Outras pautas"
abaixo) assumindo que precisaria de convênio com o tribunal. Pesquisando de
novo, achei um caminho sem convênio — **registrando para o Eduardo decidir,
não implementado**, porque mexe em `lib/` (área dele) e no núcleo do produto.

**O que existe:** a **API Pública do DataJud**, do CNJ, gratuita e
documentada, cobre todos os tribunais do Brasil, inclusive o TJPR, sem exigir
convênio — autenticação por uma chave pública compartilhada:

```
https://api-publica.datajud.cnj.jus.br/api_publica_tjpr/_search
```

Devolve as movimentações do processo em formato técnico (códigos da Tabela
Processual Unificada do CNJ), não em linguagem simples.

**Como encaixaria na arquitetura atual:** a pessoa informa o número do
processo (formato CNJ, 20 dígitos) → busca na API → os códigos de
movimentação passam pelo mesmo tipo de etapa que já existe em
`lib/claude.ts`/`lib/analise.ts` para virar "você está na fase X, o próximo
passo é Y" em linguagem simples. Não é código novo do zero, é uma etapa a
mais na cadeia existente.

**Limitações a considerar antes de aprovar:**

- Só processos **não sigilosos** aparecem (família, por exemplo, não).
- Os dados **não são em tempo real**; a sincronização varia por tribunal.
- Só funciona para quem **já tem** número de processo — ou seja, é uma
  funcionalidade para depois que a pessoa já entrou com a ação, fora do
  fluxo atual do produto (que é anterior ao processo existir).
- Precisaria de rota nova (`app/api/...`) e ajuste em `lib/`, além de testar
  se o acesso à API do DataJud funciona a partir de onde o app roda.

Fontes: [API Pública — Portal CNJ](https://www.cnj.jus.br/sistemas/datajud/api-publica/),
[Datajud-Wiki, página de acesso](https://datajud-wiki.cnj.jus.br/api-publica/acesso/),
[tutorial em PDF do CNJ](https://www.cnj.jus.br/wp-content/uploads/2023/05/tutorial-api-publica-datajud-beta.pdf).

## Referências levantadas

- Formulário virtual do TJPR para o juizado (Eduardo mandou no grupo).
- Pesquisa do Gemini sobre o que já existe hoje (Eduardo tem o material).
- As ferramentas da Mila (automação processual do Eduardo) podem ser
  adaptadas para a parte de documentos.

## Outras pautas discutidas e deixadas de lado

- Acessibilidade em geral.
- Suporte a mulher vítima de violência doméstica (ideia da Maria: boa, mas
  difícil de fazer em dois dias).
- Explicar à pessoa o processo que já está em andamento.
