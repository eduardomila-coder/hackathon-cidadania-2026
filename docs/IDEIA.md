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
  ou digitado pelo advogado, não puxado do PROJUDI.
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
