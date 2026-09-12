# Integrações do Ponto Dativo

Este documento separa o que já tem conector técnico do que depende de acordo
institucional. Nenhuma credencial é colocada na interface, no repositório ou
em exemplos.

## 0. Contas e sessão do advogado

Desde 12/09/2026 o escritório é uma plataforma com login: cada advogado tem
conta própria e só enxerga o que é dele. O modelo está em `docs/PLATAFORMA.md`;
em resumo:

- **Quem cria a conta é a equipe**, no painel (`/painel`, seção "Advogados"),
  pela API `POST /api/advogados` (Basic Auth de `PAINEL_USUARIOS`) ou pelo
  terminal: `node scripts/advogado.mjs criar "Ana Souza" "OAB/PR 12345" ana.souza senha-forte-123`.
  Não há cadastro livre. A senha fica só como hash scrypt em
  `data/advogados.json`.
- **Sessão** é um cookie assinado (`pd_sessao`, HMAC-SHA256, 7 dias), emitido
  por `POST /api/entrar` e apagado por `POST /api/sair`. O segredo vem de
  `SESSAO_SEGREDO` ou é gerado uma vez em `data/segredo-sessao.txt`.
- `proxy.ts` exige o cookie em `/escritorio/*`, `/api/escritorio/*`,
  `/api/whatsapp/conexao` e `/api/processos`; a rota confirma que a conta
  existe e está ativa. Toda função de `lib/escritorio.ts` filtra por
  `advogadoId`.
- Tudo fica em JSON em `data/`, fora do git, via `lib/banco.ts`. Não há banco
  de dados, criptografia em repouso, trilha de auditoria nem retenção
  definida: é ambiente de demonstração, não produção.

## 1. WhatsApp profissional via Evolution API v2

O conector técnico está em `lib/evolution.ts` e nas rotas
`/api/whatsapp/conexao` e `/api/whatsapp/webhook`. Funciona assim:

1. O advogado entra no escritório com a conta dele e cadastra o próprio
   número em `/escritorio/whatsapp`.
2. O servidor cria uma instância só dele na Evolution, chamada
   `ponto-dativo-<usuario>` (o `usuario` da conta; `POST /instance/create`,
   integração Baileys), e registra o webhook (`POST /webhook/set/{instance}`)
   só para `MESSAGES_UPSERT` e `CONNECTION_UPDATE`, sem anexos em base64.
3. O QR aparece na tela; o advogado lê no celular em Aparelhos conectados. A
   página consulta o estado a cada 4 s e vira "conectado" sozinha. O QR expira
   sozinho e há botão para gerar outro (`GET /instance/connect/{instance}`).
4. "Desconectar" encerra a sessão (`DELETE /instance/logout`) e mantém o
   cadastro; "Remover número" apaga a instância (`DELETE /instance/delete`) e
   o cadastro, sem deixar sessão do advogado no servidor.

O número não vai no `create` de propósito: com ele a Evolution troca o QR pelo
código de pareamento, que expira a cada 45 s e falha muito na prática.

- O cadastro (usuário, instância, número) fica em `data/whatsapp.json`, fora
  do git.
- As mensagens de texto recebidas e enviadas ficam em
  `data/escritorio-mensagens.json`, cada uma com o `advogadoId` dono da
  instância e, quando o telefone bate com um cliente, o `casoId`. Mídia não é
  baixada: vira "[imagem]", "[áudio]" ou "[documento]". O advogado vê tudo em
  `/escritorio/mensagens` e na seção Conversa do caso.
- A URL da Evolution, a chave global e o segredo do webhook ficam
  exclusivamente em variáveis de ambiente descritas em `.env.example`.
- A rota do webhook valida o segredo e **nunca responde sozinha**. A IA pode
  sugerir um texto (`POST /api/escritorio/mensagens/sugerir`), mas ele só sai
  pelo clique do advogado em "Enviar pelo WhatsApp"
  (`POST /api/escritorio/mensagens/responder`). Estratégia, negociação, prazo
  real e situação sensível exigem revisão do advogado.

Para produção ainda é obrigatório acrescentar cofre de credenciais por conta,
banco com criptografia, trilha de auditoria e política de retenção das
conversas. A conta e a sessão de hoje separam os advogados na demonstração;
não são modelo de produção.

Referência técnica: [Evolution API v2 — conexão de instância](https://github.com/evolution-foundation/docs-evolution/blob/main/v2/api-reference/instance-controller/instance-connect.mdx)
e [webhook](https://github.com/evolution-foundation/docs-evolution/blob/main/v2/api-reference/webhook/set.mdx).

## 2. Acompanhamento processual do TJPR

O primeiro conector é uma consulta pontual ao **DataJud público do CNJ**, em
`lib/datajud.ts`. O advogado usa em `/escritorio/processos` (lista dos
processos dele e campo para consultar um número) e na seção Processo do caso;
a API é `GET`/`POST /api/escritorio/processos` (`{ numero, casoId? }`) e
`POST /api/escritorio/casos/[id]/processo`:

- aceita somente os 20 dígitos de um processo no padrão CNJ;
- consulta o endpoint público do TJPR e devolve classe, órgão e último
  andamento disponível;
- guarda o resultado em `data/escritorio-processos.json`, um registro por
  número e advogado (consultar de novo atualiza o andamento), com o caso
  vinculado quando houver; a consulta entra na linha do tempo do caso;
- não pesquisa por nome, não acompanha lotes, não contorna login/captcha e não
  acessa processos sigilosos;
- não calcula prazo e não trata o andamento como intimação: o prazo se confere
  no processo oficial.

O DataJud disponibiliza metadados de processos públicos, não substitui a
consulta oficial nem é fonte para prazo fatal. Monitoramento recorrente só pode
entrar depois da autenticação individual, armazenamento protegido e da definição
de uma cadência de coleta compatível com o termo de uso da fonte.

Referências: [endpoints oficiais do DataJud](https://datajud-wiki.cnj.jus.br/api-publica/endpoints/),
[acesso e chave pública](https://datajud-wiki.cnj.jus.br/api-publica/acesso/) e
[glossário](https://datajud-wiki.cnj.jus.br/api-publica/glossario/).

## 3. Fluxo da Advocacia Dativa da OAB/PR

O produto é orientado ao fluxo oficial, mas não está integrado ao Portal da
Advocacia Dativa:

1. O profissional apto se cadastra nas listas e define as comarcas e áreas.
2. No plantão, o convite chega por e-mail e deve ser aceito no Portal em até
   24 horas; a entrada usa inscrição OAB e senha do processo eletrônico.
3. Com a nomeação, o escritório organiza cliente, documentos, processo e
   próximos atos.
4. Para honorários, a certidão judicial e o requerimento administrativo seguem
   o fluxo oficial; o sistema pode ajudar a conferir pendências, nunca substituir
   o portal.

### Duas entradas que não podem ser confundidas

- **Convite de plantão:** chega por e-mail, é confirmado no Portal da
  Advocacia Dativa e tem a janela de 24 horas indicada pela OAB/PR.
- **Nomeação para um processo:** deve ser objeto de **intimação judicial**. A
  ficha do Ponto Dativo deve identificar o advogado nomeado, a íntegra do ato,
  processo, órgão, fase, ato solicitado e prazo informado. O advogado confere
  a intimação oficial, manifesta o aceite ou justo motivo e só então decide a
  estratégia da defesa.

Por isso o escritório tem a "ficha de nomeação": ao receber uma entrada
autorizada, o fluxo desejado é registrar a origem imutável do ato, avisar o
advogado responsável, abrir o caso e preparar um roteiro de trabalho (peças
para leitura, documentos pendentes, prazo a conferir e fundamentos a
pesquisar). Ela não considera a nomeação aceita, não calcula prazo, não cria
petição final nem protocola.

Hoje a ficha nasce do texto que o advogado cola em "Nova nomeação"
(`POST /api/escritorio/nomeacao`): a IA extrai processo, órgão, ato, prazo só
se estiver escrito, documentos a pedir e perguntas ao cliente, e o caso é
aberto com origem "nomeação". Para automatizar essa chegada de verdade falta
um requisito externo: uma integração formal/autorizada com a fonte da
intimação (ou uma caixa dedicada do escritório, nunca uma senha do Portal).
Não há API pública documentada do Portal que autorize coletar convites,
nomeações ou dados de honorários; portanto o protótipo não faz raspagem nem
automatiza login.

Não localizamos uma API pública do Portal da Advocacia Dativa para login,
convites, nomeações ou honorários. Logo, não há automação de login nem coleta
do portal. A integração real precisa de autorização e convênio da OAB/PR.

Fonte: [Subsídios e Perguntas Frequentes — Portal da Advocacia Dativa](https://advocaciadativa.oabpr.org.br/subsidios)
e [formação e listas da Advocacia Dativa](https://novaesa.oabpr.org.br/dativa).

## 4. Marca e identidade

O Ponto Dativo usa azul-marinho, vermelho e tons claros como referência de
seriedade institucional, porém não usa logomarca, selo, sigla como marca ou
qualquer símbolo oficial da OAB. A marca oficial e a coparticipação da OAB por
terceiros exigem autorização prévia pelo Provimento 135/2009.

Referências: [Manual de Marca OAB](https://www.oab.org.br/institucionalinstituicao/marcaoficial)
e [Provimento 135/2009](https://www.oab.org.br/leisnormas/legislacao/provimentos/135-2009).
