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

- Integração real com o tribunal: exigiria convênio. Mostramos o pedido pronto
  para a pessoa levar ou protocolar.
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
