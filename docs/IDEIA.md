# A ideia

Direção atual, fechada em 12/09/2026 depois da mentoria das 11h e registrada no
canvas da Entrega 1 (`docs/entregas/1-canvas.md`): **ferramenta de triagem
contratada pelo advogado**, que recebe o relato do cliente e devolve o caso
organizado, com a fonte legal de cada ponto. O foco original (o cidadão leigo
usando sozinho) está preservado no fim deste arquivo, em "Como chegamos aqui":
o público mudou, o problema de acesso à Justiça é o mesmo.

## O problema

Quem atende a maior parte da população no Juizado Especial é o advogado que
trabalha sozinho — 72% da advocacia brasileira, ver "Tamanho do público"
abaixo. Antes de fechar contrato, é ele mesmo quem ouve o cliente, separa
documento por documento, decide se o caso vale e traduz o juridiquês no
telefone. Essa triagem não é remunerada e consome o dia. Quando esse advogado
trava, o acesso à Justiça trava junto.

Do outro lado do balcão o problema antigo continua: a pessoa chega ao juizado,
escreve a história à mão e não sabe o que precisa levar. A diferença é que
agora quem opera a ferramenta é o profissional habilitado, que assina por cima.

## A solução

Uma plataforma que o advogado contrata e o cliente alimenta:

1. O cliente **conta o que aconteceu**, por escrito ou **por voz**, pelo link
   que o advogado manda — ou o próprio advogado cola o relato.
2. Se o processo **já corre**, o advogado cola o andamento e a ferramenta o lê
   junto com o relato.
3. A cadeia **organiza o caso** e diz, com o trecho da lei ao lado: se cabe no
   JEC, quais **requisitos legais já estão comprovados** e qual documento falta
   para fechar cada um que ainda está aberto.
4. Lista o que **pedir e perguntar** ao cliente, e os **caminhos sem processo**
   (Procon, consumidor.gov.br, Anatel, mediação) quando existirem.
5. **Mede-se**: mostra o custo real daquela triagem em tokens e o tempo, e
   guarda a medida para responder se a ferramenta está se pagando.

## Força do caso, não probabilidade de êxito

A plataforma **não** estima porcentagem de vitória. Ela conta requisitos:
"2 de 3 requisitos comprovados", cada um com o id do trecho que o exige e o
documento que o comprova. É aritmética sobre fato verificável, e o revisor da
cadeia derruba requisito marcado como comprovado sem prova no relato.

O motivo é direto: não temos base histórica de processos julgados para
sustentar uma probabilidade, e número sem fonte é exatamente a alucinação que
a rubrica da auditoria pune. Jurimetria real sobre dados do TJPR fica como
caminho depois do evento.

## Como a eficiência é medida

Cada triagem registra **só medida** — área, requisitos comprovados, custo,
tempo. Nunca o relato, o nome do cliente ou o número do processo. Depois o
advogado volta e anota no que o caso deu (ganho, acordo, perdido, desistiu).
Com isso saem duas respostas: quanto custou por caso e quantas vezes a força
medida apontou para o mesmo lado que o resultado real, usando o corte
declarado em `lib/casos.ts`.

## O que fica de fora (por enquanto)

- Integração real com o tribunal: exigiria convênio. O andamento entra colado
  ou digitado pelo advogado, não puxado do PROJUDI. Há uma proposta de
  acompanhamento público via DataJud/CNJ, ainda não implementada e aguardando
  aprovação do Eduardo.
- Parecer jurídico: a ferramenta organiza e cita a fonte; quem analisa, decide
  e assina é o advogado. Isso é atividade privativa da advocacia.
- Estimativa de honorário ou de valor de condenação: sem base, não se afirma.

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

Ideia levantada em conversa com a Maria em 12/09/2026. **Adotada na tarde do
mesmo dia**: deixou de ser só reformulação de discurso e passou a ser a
direção do produto, junto com o canvas da Entrega 1. O registro abaixo é o
raciocínio original, mantido porque é o argumento do pitch.

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

## Como chegamos aqui

Direção original, decidida nas reuniões de 10/09/2026 (transcrições em
`docs/privado/`): **atendente virtual do Juizado Especial Cível para a pessoa
leiga de baixa renda**, que contava a história por voz, recebia a classificação
do caso, sabia se cabia no JEC e levava o pedido pronto no formato do
formulário do TJPR.

O que mudou, e por quê:

| Quando | Mudança | Motivo |
|---|---|---|
| 12/09, manhã | Canvas fecha na "linha Advocacia": ferramenta contratada pelo advogado | Mentoria das 11h e conversa da equipe (`docs/entregas/1-canvas.md`) |
| 12/09, tarde | Leitura B2B2C da Maria adotada como direção, não só discurso | O público do autônomo é grande e o risco com a OAB cai quando quem opera é o profissional |
| 12/09, tarde | Métrica entra no produto: força do caso, custo por triagem, eficiência | Pedido de "simetrificar": dizer se vale a pena, quanto custa e se a ferramenta acerta |

O que **não** mudou: a cadeia (`extrair → buscar na lei → analisar citando
trecho → verificar`), o RAG sobre `docs/juridico/`, a regra de não afirmar lei
sem id de trecho, e o fato de que o beneficiário final é a pessoa que não
conseguiria acessar a Justiça sozinha.
