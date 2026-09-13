# Ponto Dativo · briefing de design (para o ChatGPT)

> **Como usar:** cole este arquivo inteiro no ChatGPT, ou anexe, e termine com o
> prompt da seção 14. Ele descreve o produto, quem usa, todas as telas que já
> existem, os fluxos, os textos obrigatórios e as regras que o desenho não pode
> violar. O que já está implementado e o que foi desenhado antes estão nas
> seções 9 e 10.
> Escrito em 12/09/2026, à noite. A aplicação é usada ao vivo na auditoria de
> 13/09, das 10h30 às 14h30.

## 1. O que é o Ponto Dativo

Ponto Dativo é um escritório de apoio demonstrativo para a **advocacia dativa**,
feito pela equipe Habeas Titas (Eduardo, Maria e Fernando) para o Hackathon da
Cidadania 2026 da OAB/PR.

O advogado dativo é nomeado pelo juízo para atender quem não tem condições de
pagar. É um atendimento de poucos recursos e muita responsabilidade: prazo
curto, cliente que chega pelo plantão, documentação espalhada em papel, conversa
no WhatsApp pessoal e consulta ao processo no portal. O produto organiza essa
rotina e ainda ajuda a triar o caso, com fonte em cada afirmação.

O que a ferramenta faz:

- **Atende**: cadastra o cliente, recebe o relato (digitado, ditado por voz ou
  por foto de documento), organiza o próximo compromisso.
- **Organiza**: ficha de nomeação, checklist de documentos, prazos e tarefas,
  linha do tempo do caso.
- **Triagem com fonte**: requisitos do caso, um a um, com o trecho de lei que
  exige e o que comprova, mais caminhos extrajudiciais. A "força do caso" é
  contagem de requisitos comprovados sobre aplicáveis, nunca probabilidade.
- **Conversa**: WhatsApp profissional com o cliente, com sugestão de resposta
  escrita pela IA e envio somente pelo clique do advogado.
- **Processo**: consulta pontual ao DataJud público do CNJ pelo número do
  processo, com o último andamento.

O que a ferramenta **não** faz, e a interface precisa deixar isso evidente: não
dá parecer, não decide estratégia, não calcula nem conta prazo, não protocola,
não responde ao cliente sozinha, não é sistema da OAB.

## 2. Quem usa

| Persona | Quem é | O que precisa da tela |
|---|---|---|
| Advogado dativo | Usa entre um atendimento e outro, muitas vezes no celular, com pouco tempo | Entender em 5 segundos o que é urgente hoje e chegar ao caso em um clique |
| Cliente atendido | Leigo, às vezes com pouca familiaridade digital, responde pelo WhatsApp | Ser acolhido e entender o próximo passo, sem termo técnico |
| Equipe do Hackathon | Eduardo, Maria e Fernando, durante o evento | Painel operacional: cronograma, tarefas, auditoria e pitch |
| Equipe da OAB e auditores | Veem a tela de perto, por 4 horas, com o laptop da equipe na mão | Concluir em segundos que o isolamento entre contas existe, que nada sai sem clique e que a ferramenta é confiável |

Toda a linguagem é para advogado, mas em português simples. Nunca use jargão de
programação na tela (nada de JSON, token, cache, endpoint, deploy).

## 3. Restrições que o desenho não pode violar

1. **Faixa de demonstração em todas as telas do escritório**, com o texto
   literal: "Ambiente de demonstração do Hackathon. Use dados fictícios ou de
   casos que você pode tratar; nada aqui é sistema oficial da OAB."
2. **Nenhuma marca, selo, sigla, brasão ou símbolo da OAB.** Azul-marinho e
   vermelho entram como referência de seriedade, não como identidade oficial.
   Ver a seção 10 para o conflito de paleta que precisa ser resolvido.
3. **Nenhuma mensagem sai para o cliente sem clique do advogado.** A IA redige,
   o advogado envia. A tela precisa tornar isso visível, não só verdadeiro.
4. **Nada de probabilidade de êxito.** O número que aparece é contagem de
   requisitos comprovados, cada um com a fonte.
5. **Conta de advogado só a equipe cria.** Não existe cadastro livre nem
   "criar conta" na tela pública.
6. **Um advogado nunca vê dado de outro.** A tela precisa deixar claro de quem
   é o escritório (nome e OAB no cabeçalho).
7. **Sem dado real.** Casos fictícios, e a tela avisa disso.
8. **Custo sem preço de tabela aparece como "não calculado"**, nunca como zero
   nem como estimativa inventada.
9. **Sem travessão longo nem meia-risca em nenhum texto da interface.**

## 4. Contexto em que o design vai ser julgado

- Domingo 13/09: entrega do produto às 10h30, auditoria técnica das 10h30 às
  14h30, slides às 15h e pitch de 2 minutos com demonstração de 60 segundos.
- A rubrica dá 300 de 810 pontos para a auditoria técnica, em três critérios:
  confiabilidade, usabilidade e sofisticação técnica. **O auditor roda sozinho,
  no laptop da equipe, e também abre no celular.**
- Muita coisa será vista primeiro em tela pequena: link compartilhado, foto de
  tela, apresentação.
- Prazo real de implementação: uma madrugada. O guia precisa ser aplicável em
  CSS puro, sem biblioteca de componentes e sem refatorar o que funciona.

## 5. Inventário de telas

### 5.1 Site público (sem login)

| Tela | O que mostra | Ações |
|---|---|---|
| Início `/` | Explicação curta, três passos (Acolha, Organize, Decida), formulário de relato com ditado por voz e foto de documento, campo "O processo já está em andamento?", afirmação "Gratuito · Seguro · Sem cadastro" | "Organizar relato", "Abrir escritório de apoio" |
| Triando o caso | Quatro etapas com estado cada (lendo o relato, recuperando trechos da lei, conferindo cada afirmação, montando o dossiê) | Nenhuma, é espera |
| Dossiê do caso | Força do caso (X de Y comprovados), resumo, requisitos um a um com o trecho que exige e o que comprova, "Pedir ao cliente", "Custas nesta via", "Antes de processar", aviso de que orienta e não substitui atendimento | "Completar a conversa" (colar respostas e refazer a triagem) |
| Perguntas frequentes e Contato | Acordeões e um cartão institucional | Navegação |

### 5.2 Entrar `/entrar`

Uma tela só: usuário, senha, botão Entrar, link "Voltar ao site" e a faixa de
demonstração. Vira para o escritório. Erro de credencial aparece em texto
simples. Ninguém entra sem conta criada pela equipe.

### 5.3 Escritório (login do advogado)

Casca comum a todas as telas: cabeçalho com a marca Ponto Dativo e o subtítulo
"escritório do advogado", navegação (Casos, Mensagens, WhatsApp, Processos),
nome e número de OAB do advogado, botão Sair e a faixa de demonstração.

| Tela | O que mostra | Ações |
|---|---|---|
| Casos `/escritorio` | Saudação com o nome, quatro cartões de resumo (casos abertos, prazos em 7 dias, mensagens novas, documentos pendentes), estado do WhatsApp, lista de casos com origem, situação, prazo e último registro | "Novo caso", "Nova nomeação", filtro por situação, abrir caso |
| Nova nomeação | Caixa para colar o texto da intimação e a ficha que a IA extraiu (processo, órgão, ato, prazo informado ou "conferir no ato", resumo, fundamentos a avaliar, documentos a pedir, perguntas ao cliente, alertas) | "Abrir caso a partir da ficha" |
| Caso `/escritorio/casos/[id]` | Oito seções: Ficha (processo, órgão, ato, prazo, resumo, fundamentos), Relato do cliente, Triagem com fontes, Documentos (checklist), Prazos e tarefas, Processo (número e último andamento do DataJud), Conversa (WhatsApp do cliente), Registros (linha do tempo) | Salvar campos, "Triar com fontes", marcar documento recebido, concluir e criar tarefa, "Consultar TJPR", "Sugerir resposta", "Enviar pelo WhatsApp", adicionar registro |
| Mensagens `/escritorio/mensagens` | Duas colunas: conversas à esquerda (nome ou número, última mensagem, não lidas, caso vinculado) e a conversa à direita | "Sugerir resposta" (preenche a caixa, editável), "Enviar pelo WhatsApp", "Vincular a um caso", "Abrir caso com esta conversa". Atualiza sozinha a cada 10 s. Sem WhatsApp conectado, mostra aviso com link para a tela de conexão |
| WhatsApp `/escritorio/whatsapp` | Cadastro do número do advogado, QR para ler no celular, estado da conexão, como conectar passo a passo | "Gerar novo QR", "Desconectar", "Remover número" |
| Processos `/escritorio/processos` | Lista dos processos do advogado com último andamento e caso vinculado, e um campo para consultar número novo | "Consultar TJPR" por número CNJ, com o aviso de que o andamento não é intimação nem prazo |

### 5.4 Painel da equipe `/painel` (Basic Auth, fora do escritório)

Seções: Agora (prazo, foco, linha do tempo do evento, prioridades), Cronograma,
Tarefas (com caixinha que grava no repositório), Advogados de teste (criar e
desativar contas de advogado, com o link `/entrar`), Auditoria, Pitch (com
cronômetro de ensaio), Regras, Equipe, Links. Mais `/revisoes`, a tela que lê os
Pull Requests abertos do GitHub e mostra autor, arquivos, alerta de segredo e
estado das verificações em linguagem simples.

## 6. Estados que precisam ser desenhados

Nenhuma tela pode ser desenhada só no estado cheio. Para cada uma, o guia
precisa prever:

- **Vazio**: primeiro acesso, nenhum caso, nenhuma mensagem vinculada, nenhum
  processo consultado, nenhum documento marcado. O texto do vazio orienta o
  próximo passo, não pede desculpa.
- **Carregando**: triagem da IA (a mais longa), consulta ao DataJud, geração do
  QR, envio de mensagem. Nada de tela congelada e nada de "erro" durante o
  trabalho.
- **Erro tratado**: modelo indisponível, Evolution fora do ar, número CNJ
  inválido, senha errada, sessão expirada, WhatsApp desconectado, limite de
  conta desativada. Em português, com o que fazer em seguida.
- **Urgência**: prazo em 7 dias, mensagem não lida, documento pendente. Precisa
  haver hierarquia visual entre urgente e rotina.
- **Sucesso discreto**: documento marcado, tarefa concluída, resposta enviada,
  número conectado. Sem fogos de artifício.

## 7. Fluxos que o desenho precisa resolver

1. **Primeiro acesso**: a equipe cria a conta, passa o link e o advogado entra.
   Da tela de entrar ao primeiro caso em menos de um minuto, sem tutorial.
2. **Nomeação até caso organizado**: colar a intimação, conferir a ficha,
   abrir o caso, rodar a triagem, marcar documentos, criar tarefas.
3. **Atendimento pelo WhatsApp**: ver a conversa, pedir sugestão à IA, editar,
   vincular a um caso, enviar com o clique. O desenho precisa deixar claro o
   que a IA escreveu e o que o advogado assumiu.
4. **Consulta de processo**: digitar o CNJ, ver último andamento, perceber que
   aquilo não é prazo.
5. **Auditoria em 60 segundos**: qual caminho de tela faz o auditor ver, sem
   ajuda, o isolamento entre advogados e o envio só com clique.

## 8. Textos que devem aparecer

- Faixa de demonstração (texto literal da seção 3, item 1).
- Não-dossiê: "Esta triagem orienta. Não substitui o atendimento e a decisão do
  advogado." e, quando faltar base, "sem base" no lugar de um requisito.
- Custo: "sem preço de tabela" ou "não calculado" quando a tabela não tem o
  modelo.
- Envio: o botão é "Enviar pelo WhatsApp" e ele é o único caminho de saída.
- Sugestão: "Sugerir resposta" e uma marca de que o texto é rascunho editável.
- Prazo: sempre "a conferir no processo oficial", nunca um prazo calculado.

## 9. O que já existe no código (para não quebrar)

- Next.js 16, App Router, CSS puro. Uma dependência nova custa uma madrugada.
- Tokens em `app/globals.css`:
  `--creme:#faf6f0`, `--azul:#143b65`, `--texto:#45566c`,
  `--verde:#a12434`, `--linha:#ded7d0`. Atenção: a variável chamada `--verde`
  guarda um vermelho.
- Componentes já em uso, em `globals.css`: `md-cartao`, `md-campo`,
  `md-botao-primario`, `md-botao-secundario`, `md-link-botao`, `md-eyebrow`,
  `md-titulo-linha`, `md-status`, `md-faixa`, `md-checklist`, `md-linha-tempo`,
  `md-grade-dados`, `md-acoes`, `md-contador`, `md-texto-auxiliar`,
  `md-adicionar`, `md-resumo`, `md-nomeacao`, `md-whatsapp`, `md-qr-conexao`,
  `md-consulta-processo`, `md-processos`, `md-limite`, `md-selo-conferido`.
- Cada módulo tem o seu CSS: `escritorio.css`, `casos.css`, `mensagens.css`,
  `processos.css`, `advogados.css`. O site público e o painel usam as classes
  `cf-` e `cfp-`.
- O escritório hoje reaproveita as classes `md-` do protótipo antigo. O pedido
  deste guia é justamente dar personalidade própria à plataforma.

## 10. Direção visual: o que está decidido e o conflito a resolver

Existem três fontes, e elas não combinam entre si. O guia novo precisa escolher
e declarar a escolha:

- `docs/INTEGRACOES.md` (decisão de 12/09): azul-marinho, vermelho e tons claros
  como referência de seriedade institucional, sem marca da OAB.
- Guia anterior, feito para o site antigo "Cidadania Fácil": fundo marfim
  `#F7F5F0`, azul profundo `#10233B`, verde sálvia `#7E9F8B`, DM Serif Display
  nos títulos e Manrope no texto.
- Código atual: marfim `#faf6f0`, azul `#143b65`, e a variável `--verde` com um
  vermelho `#a12434`, tudo em Georgia e Arial.

**Recomendação para o guia novo:** azul-marinho como cor institucional e de
ação, vermelho apenas como acento de marca, e cores de estado separadas da
marca (verde para conferido e conectado, âmbar para pendente, vermelho para
risco). Assim cor nunca significa duas coisas ao mesmo tempo, e a marca não
disputa espaço com o estado. Se o verde sálvia do guia anterior for mantido,
ele deve virar cor de estado positivo, não cor de marca.

Pedido explícito: resolver isso, nomear os tokens em português e deixar a
migração óbvia para quem for implementar em `globals.css`.

## 11. Restrições técnicas do desenho

- CSS puro, um arquivo por módulo, sem biblioteca de componentes, sem ícone
  colorido de biblioteca, sem gradiente, sem vidro fosco, sem sombra pesada,
  sem borda muito arredondada, sem roxo.
- Funciona de 375 px a 1440 px. Em tela pequena, a navegação do escritório não
  pode cortar conteúdo nem exigir rolagem horizontal da página.
- Alvos de toque de 44 px, foco de teclado visível, contraste alto no texto
  essencial, rótulo ligado ao campo, `aria-current` na navegação, estado nunca
  comunicado só por cor (sempre cor mais texto).
- Nenhuma fonte abaixo de 16 px em campo de formulário no celular.
- Legível em tela de laptop projetada.

## 12. Entregáveis esperados do ChatGPT

1. Um mockup PNG por tela, em desktop e em celular, cobrindo o inventário da
   seção 5 e os estados da seção 6 que mudam o desenho.
2. Um guia markdown de implementação, tela por tela, no formato do guia
   anterior: direção visual, tokens em CSS, tipografia, grade e espaçamento,
   componentes reutilizáveis e regras por tela.
3. Uma tabela ligando cada tela ao arquivo que a implementa
   (`app/escritorio/page.tsx`, `app/escritorio/casos.css` e assim por diante).
4. Um checklist de aceite visual, verificável, com pelo menos os itens da
   seção 13.

## 13. Checklist de aceite

1. Nenhuma tela é a estrutura antiga com as cores trocadas.
2. A faixa de demonstração aparece em todas as telas do escritório.
3. Não existe marca, selo ou símbolo da OAB em nenhum lugar.
4. O advogado vê, no cabeçalho, o nome dele e a OAB.
5. Em 375 px não há corte horizontal, texto abaixo de 16 px em campo nem alvo
   de toque pequeno.
6. Nenhum estado depende só de cor.
7. A tela de mensagens deixa visível que o texto veio da IA e que o envio é
   humano.
8. Um caso sem relato explica o que falta antes de tentar triar.
9. Texto nenhum usa travessão longo nem meia-risca.
10. Dá para contar o caminho de uma ação em cada tela, e nenhuma tela tem mais
    de um botão principal.

## 14. Prompt para colar no ChatGPT

> Leia o briefing anexo com atenção. Ele descreve o Ponto Dativo, o escritório
> de apoio demonstrativo para a advocacia dativa que vai ser auditado ao vivo
> amanhã, 13/09/2026.
>
> Preciso de um design novo para a plataforma do advogado, que hoje reaproveita
> as classes de um protótipo antigo e não tem personalidade própria.
>
> Entregue, no mesmo formato do guia anterior do projeto (mockups mais guia de
> implementação tela por tela):
>
> 1. a direção visual, resolvendo o conflito de paleta da seção 10 e declarando
>    os tokens em CSS, com o nome em português;
> 2. a tipografia, com as fontes, os pesos e a escala;
> 3. a grade e a escala de espaçamento;
> 4. os componentes reutilizáveis (cartão, botão, campo, badge de estado,
>    faixa de demonstração, cabeçalho do escritório, cartão de resumo, item de
>    caso na lista, balão de conversa, checklist de documento, linha do tempo);
> 5. as telas do escritório uma por uma: entrar, casos, nova nomeação, caso,
>    mensagens, WhatsApp e processos, mais o site público e o painel da equipe;
> 6. os estados vazios, de carregamento e de erro de cada tela;
> 7. o checklist de aceite.
>
> Restrições: CSS puro, sem dependência nova, aplicável em uma madrugada por
> quem não é designer; nada de marca da OAB; navegação em português; sem
> travessão; a faixa de demonstração em todas as telas do escritório.
