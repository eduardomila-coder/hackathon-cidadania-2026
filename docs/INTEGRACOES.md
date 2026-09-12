# Integrações do Ponto Dativo

Este documento separa o que já tem conector técnico do que depende de acordo
institucional. Nenhuma credencial é colocada na interface, no repositório ou
em exemplos.

## 1. WhatsApp profissional via Evolution API v2

O conector técnico está em `lib/evolution.ts` e nas rotas
`/api/whatsapp/conexao` e `/api/whatsapp/webhook`.

- A conexão consulta o estado da instância e pode solicitar o QR Code em
  `GET /instance/connect/{instance}`.
- O webhook é registrado em `POST /webhook/set/{instance}` somente para
  `MESSAGES_UPSERT` e `CONNECTION_UPDATE`, sem anexos em base64.
- O segredo do webhook, a URL da Evolution, a chave e o nome da instância ficam
  exclusivamente em variáveis de ambiente descritas em `.env.example`.
- A rota do webhook valida o segredo, não persiste conteúdo de mensagem e não
  envia resposta automática. Estratégia, negociação, prazo real e situação
  sensível exigem revisão do advogado.

O QR e o webhook só podem ser acionados por usuário autenticado no escritório.
Para vários advogados, ainda é obrigatório acrescentar autenticação individual,
cofre de credenciais por conta, banco com criptografia, trilha de auditoria e
política de retenção. O Basic Auth atual protege apenas a demonstração, não é
modelo de produção multiusuário.

Referência técnica: [Evolution API v2 — conexão de instância](https://github.com/evolution-foundation/docs-evolution/blob/main/v2/api-reference/instance-controller/instance-connect.mdx)
e [webhook](https://github.com/evolution-foundation/docs-evolution/blob/main/v2/api-reference/webhook/set.mdx).

## 2. Acompanhamento processual do TJPR

O primeiro conector é uma consulta pontual ao **DataJud público do CNJ**, em
`lib/datajud.ts` e `/api/processos`:

- aceita somente os 20 dígitos de um processo no padrão CNJ;
- consulta o endpoint público do TJPR e devolve classe, órgão e último
  andamento disponível;
- não pesquisa por nome, não acompanha lotes, não contorna login/captcha e não
  acessa processos sigilosos;
- não registra o número nem o resultado no protótipo e não calcula prazo.

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

Por isso, a tela `/escritorio` já apresenta a "ficha de nomeação": ao receber
uma entrada autorizada, o fluxo desejado é registrar a origem imutável do ato,
avisar o advogado responsável, abrir o caso e preparar um roteiro de trabalho
(peças para leitura, documentos pendentes, prazo a conferir e fundamentos a
pesquisar). Ela não considera a nomeação aceita, não calcula prazo, não cria
petição final nem protocola.

Para automatizar essa chegada de verdade faltam dois requisitos externos: uma
integração formal/autorizada com a fonte da intimação (ou uma caixa dedicada do
escritório, nunca uma senha do Portal) e uma conta individual do advogado. Não
há API pública documentada do Portal que autorize coletar convites, nomeações
ou dados de honorários; portanto o protótipo não faz raspagem nem automatiza
login.

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
