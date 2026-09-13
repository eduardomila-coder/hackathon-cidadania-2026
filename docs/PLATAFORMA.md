# Plataforma do advogado dativo — especificação de construção

Decisão do Eduardo em 12/09/2026, 18h: o Ponto Dativo deixa de ser uma tela de
demonstração com estado só no navegador e vira uma plataforma em que um
advogado dativo entra com login e senha e trabalha nos casos dele, com tudo
gravado no servidor. Continua rotulada como **ambiente de demonstração**: sem
marca da OAB, sem integração institucional, sem promessa de produção. As
contas são criadas pelo Eduardo no painel da equipe; não há cadastro livre.

Este documento é o contrato entre os módulos. Quem implementa um módulo segue
os nomes, rotas e tipos daqui; se precisar mudar algo, muda aqui também.

## Regras que valem para todo módulo

- Tudo em português: nomes, comentários, commits, textos. Termos técnicos ficam.
- Nenhuma dependência nova. Só `node:crypto`, `node:fs`, o que já está no
  `package.json`.
- Todo acesso ao modelo passa por `perguntarJson` (`lib/claude.ts`).
- Estado em arquivos JSON em `data/` (fora do git), sempre via `lib/banco.ts`.
- Nada sai para o cliente sem controle do advogado. Por padrão a IA redige e
  ele envia; com o **estagiário virtual** ligado naquela conversa (módulo 3), o
  robô pode responder sozinho, dentro das travas: confiança mínima, envio
  automático ou só sugestão, e decisão de responder vinda do próprio modelo.
- Cada rota de API do escritório carrega o advogado da sessão e filtra tudo
  por `advogadoId`. Um advogado nunca vê dado de outro (teste isso).
- CSS: cada módulo em arquivo próprio (`app/escritorio/<modulo>.css`),
  importado pela página que o usa. Reaproveite as classes `md-*` já existentes
  em `app/globals.css`; só a base mexe em `globals.css`.
- Interface em linguagem simples. O usuário é advogado, não programador.
- A faixa "Ambiente de demonstração" fica em todas as telas do escritório, com
  o texto: "Ambiente de demonstração do Hackathon. Use dados fictícios ou de
  casos que você pode tratar; nada aqui é sistema oficial da OAB."

## 1. Base: banco, contas, sessão, casca do escritório

Arquivos: `lib/banco.ts`, `lib/contas.ts`, `lib/sessao.ts`, `lib/escritorio.ts`,
`proxy.ts`, `app/entrar/page.tsx`, `app/api/entrar/route.ts`,
`app/api/sair/route.ts`, `app/api/advogados/route.ts`,
`app/escritorio/layout.tsx`, `app/escritorio/escritorio.css`, `scripts/advogado.mjs`.

### `lib/banco.ts`

```ts
export function listar<T>(colecao: string): T[]                       // data/<colecao>.json, [] se não existe
export async function alterar<T>(colecao: string, fn: (itens: T[]) => T[] | void): Promise<T[]>
  // lê, aplica fn, grava com arquivo temporário + rename; fila por coleção para não perder escrita
export function novoId(): string                                       // crypto.randomUUID()
export function agora(): string                                        // new Date().toISOString()
```

### `lib/contas.ts`

```ts
export type Advogado = { id: string; nome: string; oab: string; usuario: string; senha: string /* scrypt$sal$hash */; criadoEm: string; criadoPor: string; ativo: boolean };
export type AdvogadoPublico = Omit<Advogado, "senha">;
export function criarAdvogado(dados: { nome: string; oab: string; usuario: string; senha: string; criadoPor: string }): Promise<AdvogadoPublico>
  // usuario: minúsculo, sem espaço, único; senha mínima 8; scrypt de node:crypto, sal de 16 bytes
export function autenticar(usuario: string, senha: string): AdvogadoPublico | null   // timingSafeEqual
export function listarAdvogados(): AdvogadoPublico[]
export function advogadoPorId(id: string): AdvogadoPublico | null
export function definirSenha(id: string, senha: string): Promise<void>
export function desativarAdvogado(id: string): Promise<void>
```

### `lib/sessao.ts`

Cookie `pd_sessao` = `base64url(JSON{ id, exp })` + `.` + `HMAC-SHA256`.
Segredo: `SESSAO_SEGREDO` do ambiente ou, se faltar, gerado uma vez e gravado
em `data/segredo-sessao.txt`. Validade 7 dias. `httpOnly`, `sameSite: "lax"`,
`secure` quando `APP_URL` começa com `https`.

```ts
export function criarCookieDeSessao(advogadoId: string): { nome: string; valor: string; opcoes: {...} }
export function advogadoDaSessao(valorDoCookie: string | undefined): { id: string } | null
export async function advogadoAtual(): Promise<AdvogadoPublico | null>   // usa cookies() de next/headers; null se não logado ou inativo
export function exigirAdvogado(): Promise<AdvogadoPublico>              // lança ErroSessao (401) se não logado
```

### `proxy.ts`

- Basic Auth (como hoje) continua em `/painel/:path*`, `/api/tarefas`,
  `/api/advogados`, `/api/revisoes` se existir.
- Sessão exigida em `/escritorio/:path*` (sem cookie válido → redirect 302 para
  `/entrar?voltar=<caminho>`), `/api/escritorio/:path*`, `/api/whatsapp/conexao`,
  `/api/processos` (sem cookie → 401 JSON). O proxy só valida assinatura e
  validade; a rota confirma que o advogado existe e está ativo.
- `/api/whatsapp/webhook` continua fora de qualquer login (valida o token).

### Rotas de conta

- `POST /api/entrar` `{ usuario, senha }` → 200 `{ advogado: AdvogadoPublico }` e
  cookie; 401 `{ erro }`. Espera 300 ms antes de responder em erro (freio a
  força bruta).
- `POST /api/sair` → limpa o cookie.
- `GET /api/advogados` (Basic Auth da equipe) → lista sem senha.
- `POST /api/advogados` `{ nome, oab, usuario, senha }` → cria; `criadoPor` =
  usuário do Basic Auth. 409 se `usuario` já existe.
- `PATCH /api/advogados` `{ id, senha?, ativo? }`.
- `scripts/advogado.mjs`: `node scripts/advogado.mjs criar "Nome" "OAB/PR 12345" usuario senha`
  faz o mesmo sem o painel (grava direto no `data/advogados.json` com a mesma
  função de `lib/contas.ts` — pode usar `npx tsx`? não: escreva o hash com
  `node:crypto` no próprio script, mesmo formato `scrypt$sal$hash`, N=16384, r=8, p=1, 64 bytes).

### Telas de conta e casca

- `/entrar`: formulário usuário + senha, erro em texto, link "Voltar ao site".
  Depois do login vai para `?voltar` ou `/escritorio`.
- `app/escritorio/layout.tsx` (server component): carrega `advogadoAtual()`;
  se nulo, `redirect("/entrar")`. Renderiza cabeçalho com marca "Ponto Dativo",
  navegação (`Casos` → `/escritorio`, `Mensagens` → `/escritorio/mensagens`,
  `WhatsApp` → `/escritorio/whatsapp`, `Processos` → `/escritorio/processos`),
  nome e OAB do advogado, botão "Sair" (POST `/api/sair` e volta para `/`), a
  faixa de demonstração e `{children}`. Passa o advogado para os filhos por
  um `Provider` cliente (`app/escritorio/Advogado.tsx`: `useAdvogado()`).

### `lib/escritorio.ts` (modelo de dados e CRUD)

Tipos (todos com `advogadoId`, exceto os filhos de caso que herdam pelo `casoId`):

```ts
export type Cliente = { id: string; advogadoId: string; nome: string; telefone: string /* só dígitos, com 55 */; email: string | null; observacoes: string; criadoEm: string };
export type Origem = "nomeacao" | "plantao" | "particular";
export type Situacao = "novo" | "em_andamento" | "aguardando_cliente" | "concluido";
export type Caso = { id: string; advogadoId: string; clienteId: string | null; titulo: string; origem: Origem; processo: string | null /* CNJ só dígitos ou null */; orgao: string | null; ato: string | null; prazo: string | null /* AAAA-MM-DD */; situacao: Situacao; resumo: string; relato: string; notas: string; fundamentos: string[]; criadoEm: string; atualizadoEm: string };
export type Documento = { id: string; casoId: string; nome: string; detalhe: string; essencial: boolean; recebido: boolean; atualizadoEm: string };
export type Tarefa = { id: string; casoId: string; titulo: string; prazo: string | null; concluida: boolean; criadoEm: string };
export type Registro = { id: string; casoId: string; tipo: "registro" | "assistente" | "humano" | "whatsapp"; texto: string; quando: string };
export type Triagem = { id: string; casoId: string; quando: string; resultado: Resultado /* de lib/analise */ };
export type Mensagem = { id: string; advogadoId: string; instancia: string; contato: string /* dígitos */; nomeContato: string | null; texto: string; deMim: boolean; quando: string; casoId: string | null; lida: boolean; idExterno: string | null };
export type Processo = { id: string; advogadoId: string; casoId: string | null; numero: string; classe: string | null; orgao: string | null; ultimoMovimento: string | null; dataMovimento: string | null; consultadoEm: string };
```

Funções (todas filtram por `advogadoId`; as de filho conferem que o caso é do
advogado antes de agir e lançam `ErroEscritorio(404)` se não for):

```ts
listarCasos(advogadoId), casoPorId(advogadoId, casoId), criarCaso(advogadoId, dados), atualizarCaso(advogadoId, casoId, campos)
listarClientes(advogadoId), criarCliente(advogadoId, dados), atualizarCliente(advogadoId, id, campos), clientePorTelefone(advogadoId, telefone)
documentosDoCaso, adicionarDocumento, atualizarDocumento
tarefasDoCaso, adicionarTarefa, atualizarTarefa
registrosDoCaso, registrar(advogadoId, casoId, tipo, texto)
triagensDoCaso, guardarTriagem
mensagensDo(advogadoId, filtro?: { contato?, casoId?, naoLidas? }), guardarMensagem, marcarLidas(advogadoId, contato), vincularMensagens(advogadoId, contato, casoId)
processosDo(advogadoId), guardarProcesso
resumoDoEscritorio(advogadoId): { casosAbertos, prazosProximos: Array<{casoId, titulo, prazo}> (7 dias), mensagensNovas, documentosPendentes }
```

`criarCaso` cria também os quatro documentos padrão (identificação,
comprovante de endereço, contrato ou proposta, conversas e comprovantes) e o
registro "Caso aberto".

## 2. Casos: painel do advogado e página do caso

Arquivos: `app/escritorio/page.tsx`, `app/escritorio/casos/[id]/page.tsx`,
`app/escritorio/casos.css`, `app/api/escritorio/resumo/route.ts`,
`app/api/escritorio/casos/route.ts`, `app/api/escritorio/casos/[id]/route.ts`,
`app/api/escritorio/casos/[id]/{documentos,tarefas,registros,triagem,processo}/route.ts`,
`app/api/escritorio/clientes/route.ts`, `app/api/escritorio/nomeacao/route.ts`,
`lib/assistente.ts` (parte de nomeação).

### APIs

- `GET /api/escritorio/resumo` → `resumoDoEscritorio` + `{ whatsapp: estado }`
  (chame `estadoDaConexao(advogado.usuario)` de `lib/evolution.ts`, com
  try/catch → `"indisponivel"`).
- `GET /api/escritorio/casos?situacao=` → `Caso[]` com `cliente?: Cliente` embutido.
- `POST /api/escritorio/casos` `{ titulo, origem, clienteId?, cliente?: { nome, telefone, email? }, processo?, orgao?, ato?, prazo?, relato?, resumo? }` → `Caso` (cria o cliente se veio inline).
- `GET /api/escritorio/casos/[id]` → `{ caso, cliente, documentos, tarefas, registros, triagens, processo, mensagens }`.
- `PATCH /api/escritorio/casos/[id]` → campos editáveis de `Caso`.
- `POST /api/escritorio/casos/[id]/documentos` `{ nome, detalhe?, essencial? }`; `PATCH` `{ id, recebido?, nome?, detalhe? }`.
- `POST /api/escritorio/casos/[id]/tarefas` `{ titulo, prazo? }`; `PATCH` `{ id, concluida?, titulo?, prazo? }`.
- `POST /api/escritorio/casos/[id]/registros` `{ texto, tipo?: "registro"|"humano" }`.
- `POST /api/escritorio/casos/[id]/triagem` → roda `analisarRelato` com
  `caso.relato` (+ `notas` e as últimas 20 mensagens do cliente vinculadas, como
  "Informações complementares"), guarda `Triagem`, cria registro "assistente",
  devolve `Triagem`. Sem `relato` → 400 "Escreva o relato do cliente antes de triar."
- `POST /api/escritorio/casos/[id]/processo` → `consultarProcessoTjpr(caso.processo)`,
  guarda `Processo`, devolve. Sem `processo` → 400.
- `GET/POST/PATCH /api/escritorio/clientes`.
- `POST /api/escritorio/nomeacao` `{ texto }` (o advogado cola a intimação de
  nomeação) → `fichaDeNomeacao(texto)` da IA → cria `Caso` com `origem:
  "nomeacao"`, `titulo`, `processo`, `orgao`, `ato`, `prazo` igual a
  `ficha.dataPrazo`, que só existe quando a intimação traz a data do
  vencimento ou de um ato já designado; prazo em dias ("15 dias") e data da
  intimação **não** viram `prazo` do caso (ver abaixo), `resumo`,
  `fundamentos`, documentos sugeridos e tarefas "Conferir íntegra da
  intimação e a data de ciência" e "Confirmar prazo no processo oficial".
  Devolve `{ caso, ficha }`.

### `lib/assistente.ts` — `fichaDeNomeacao(texto)`

`perguntarJson` com prompt que exige: `{ processo: string|null, orgao, ato,
prazoInformado: string|null, dataCiencia: "AAAA-MM-DD"|null,
dataPrazo: "AAAA-MM-DD"|null, resumo, fundamentosAAvaliar: string[] (ideias,
não teses prontas), documentosAPedir: string[], perguntasAoCliente: string[],
alertas: string[] }`. Regras no prompt: não calcular prazo que não esteja
escrito; não decidir tese; não inventar número de processo; tudo em português
simples.

`dataCiencia` é a data da intimação/ciência; `dataPrazo` é só a data de
vencimento ou de ato designado. `normalizarFicha` ainda trava, no código, o
caso em que o modelo repete a data da intimação em `dataPrazo`: ela volta para
`dataCiencia`, o `prazo` fica `null` e entra o alerta de que quem conta o prazo
é o advogado. Sem essa trava o painel anunciava "vence hoje" para um prazo que
só começa a contar naquela data: alarme falso onde o erro custa caro.

### Telas

- `/escritorio` (painel): saudação com nome; cartões de resumo (casos abertos,
  prazos em 7 dias, mensagens novas, documentos pendentes) e o estado do
  WhatsApp com link; botões "Novo caso" e "Nova nomeação"; lista de casos
  (título, cliente, origem, situação, prazo, último registro) com filtro por
  situação; vazio → texto orientando a abrir o primeiro caso.
  - "Novo caso": formulário na própria página (título, origem, cliente novo ou
    existente, telefone, processo, órgão, ato, prazo, relato).
  - "Nova nomeação": caixa para colar o texto da intimação → mostra a ficha
    que a IA extraiu → botão "Abrir caso a partir da ficha" (chama a API).
- `/escritorio/casos/[id]`: cabeçalho com título, situação (select que salva),
  origem, cliente (nome/telefone), prazo. Seções: **Ficha** (processo, órgão,
  ato, prazo, resumo, fundamentos a avaliar; edição inline com salvar),
  **Relato do cliente** (textarea + salvar) e botão "Triar com fontes" →
  mostra a última triagem: força (X de Y comprovados), resumo, cabe no JEC,
  requisitos com fonte, documentos a pedir, perguntas; **Documentos**
  (checklist com marcar recebido e adicionar), **Prazos e tarefas** (lista,
  concluir, adicionar com data), **Processo** (número; botão consultar TJPR;
  último andamento), **Conversa** (componente `Conversa` do módulo 3, com
  `contato` = telefone do cliente e `casoId`), **Registros** (linha do tempo,
  adicionar nota). Botões que chamam IA mostram "Trabalhando…" e nunca
  enviam nada ao cliente.

## 3. Mensagens: WhatsApp de verdade, com o advogado no envio

Arquivos: `app/api/whatsapp/webhook/route.ts`, `app/api/whatsapp/conexao/route.ts`
(sessão em vez de Basic), `lib/evolution.ts` (acrescentar `enviarTexto`),
`app/api/escritorio/mensagens/route.ts`, `app/api/escritorio/mensagens/{responder,sugerir,vincular}/route.ts`,
`app/escritorio/mensagens/page.tsx`, `app/escritorio/whatsapp/page.tsx`,
`app/escritorio/Conversa.tsx`, `app/escritorio/mensagens.css`,
`lib/assistente.ts` (parte de resposta).

- Cadastro do WhatsApp passa a ser por `advogado.usuario` (a função
  `cadastrarNumero(usuario, numero)` já existe; a rota troca o Basic pela
  sessão). Instância `ponto-dativo-<usuario>`. `data/whatsapp.json` continua.
- Webhook: em `messages.upsert`/`MESSAGES_UPSERT`, acha o advogado pelo campo
  `instance` do payload (via `data/whatsapp.json` → `usuario` → advogado por
  usuário, função `advogadoPorUsuario` em `lib/contas.ts`), extrai `remoteJid`
  (ignora grupos `@g.us` e status), `pushName`, texto (`conversation` ou
  `extendedTextMessage.text`; mídia vira texto "[imagem]", "[áudio]",
  "[documento]" sem baixar nada), `fromMe`, `messageTimestamp`, `key.id`;
  guarda `Mensagem` (idempotente por `idExterno`), com `casoId` do caso mais
  recente cujo cliente tem esse telefone, se houver. Responde 202. Depois da
  resposta, se o estagiário virtual está ligado naquela conversa, ele é acionado
  (`after()` do Next), com as mensagens seguidas do cliente virando um
  atendimento só.
- `lib/evolution.ts`: `enviarTexto(usuario, numero, texto)` → `POST
  /message/sendText/{instancia}` `{ number, text }`; erro claro se a instância
  não está `open`.
- `GET /api/escritorio/mensagens` → conversas: `[{ contato, nome, ultimaMensagem, quando, naoLidas, casoId, clienteNome }]`;
  `?contato=` → mensagens daquele contato (e marca lidas).
- `POST /api/escritorio/mensagens/responder` `{ contato, texto, casoId? }` →
  envia pela Evolution, guarda a `Mensagem` com `deMim: true`, cria registro
  "whatsapp" no caso se houver.
- `POST /api/escritorio/mensagens/sugerir` `{ contato, casoId? }` →
  `sugerirResposta` da IA → `{ texto }`. Nunca envia.
- `POST /api/escritorio/mensagens/vincular` `{ contato, casoId }` ou
  `{ contato, novoCaso: { titulo } }` → vincula mensagens; cria cliente com o
  telefone se não existir.

### `lib/assistente.ts` — `sugerirResposta({ advogado, mensagens, caso? })`

Resposta humana, curta, em português simples, na primeira pessoa do
escritório do advogado (assina "Equipe do Dr./Dra. Nome"), que acolhe, pede
o que falta (documentos do checklist, informações das perguntas da última
triagem se houver) e combina o próximo passo. Nunca dá parecer, nunca promete
resultado, nunca fala de prazo, nunca cita lei. Retorna `{ texto: string,
motivo: string }`.

### Telas

- `/escritorio/mensagens`: caixa alta com a lista de conversas à esquerda
  (avatar de iniciais, busca, selo de não lidas, caso vinculado) e a conversa à
  direita, no visual do painel de mensagens da Mila (papel de parede, balão com
  rabicho, agrupamento na mesma sequência, separador de dia, hora e marca de
  enviada, compositor com emoji). Na coluna de contexto, em tela larga ou pelo
  botão do cabeçalho, ficam o caso vinculado, o vínculo e o painel do
  **estagiário virtual**. Atualiza a cada 10 s. Sem WhatsApp conectado → aviso
  com link para `/escritorio/whatsapp`.
- `app/escritorio/Conversa.tsx` (cliente): `props { contato, casoId?, aoAtualizar?, sugestao?, aoEnviarSugestao?, aoDescartarSugestao? }`;
  mostra a conversa com esse contato, a caixa de resposta com "Sugerir resposta"
  e "Enviar pelo WhatsApp", e a resposta preparada pelo estagiário quando houver
  (`Enviar como está`, `Editar na caixa`, `Descartar`); sem contato → "Cadastre o
  telefone do cliente para ver a conversa aqui."
- `/escritorio/whatsapp`: o cartão "Canal profissional" atual (cadastro do
  número, QR, estado, desconectar, remover), tirado da página antiga.

### Estagiário virtual — `lib/estagiario.ts`

Ligado pelo advogado **por conversa**, atende o cliente no WhatsApp com as regras
do robô da Estagiária da Mila (`ai_robot.py` da automação processual): não
inventar fato, não revelar nota interna, não prometer resultado, não falar de
prazo, não repetir o que já foi dito, não responder agradecimento, mensagem curta
= resposta curta. A decisão de 12/09 dizia que o WhatsApp não enviava resposta
automática; agora envia, com as travas abaixo, e a mudança está registrada no
cofre.

Estado (sempre via `lib/banco.ts`):

- `data/escritorio-estagiario.json`: `{ advogadoId, contato, ativo, autoEnviar,
  confiancaMinima, instrucao, avisarQueEDeMaquina, atualizadoEm, atualizadoPor }`.
  Padrão: desligado, `autoEnviar: true`, confiança 0,72.
- `data/escritorio-estagiario-sugestoes.json`: `{ advogadoId, contato, casoId,
  texto, motivo, estado: "pendente" | "enviada" | "descartada", quando }`.
- `Mensagem` ganhou `doEstagiario?: boolean`: a tela marca o balão com o selo
  "estagiário", para ninguém confundir quem falou.

Contrato com o modelo (`DecisaoDoEstagiarioSchema`):
`{ mensagem, enviar, confianca, intencao, faltando, fontes, motivoDeSilencio }`.

As travas, na ordem: estar `ativo` naquela conversa, `enviar` verdadeiro,
`confianca >= confiancaMinima` e `autoEnviar`. Se qualquer uma barrar, o texto
vira sugestão com o motivo e nada sai; se o modelo não escreveu texto, só fica o
registro do motivo. Toda decisão entra como registro no caso, inclusive a de
ficar quieto. Sem WhatsApp conectado, o envio falha e o texto não se perde:
vira sugestão com o erro no motivo.

Rotas:

- `GET /api/escritorio/estagiario?contato=` → `{ config, sugestao, confiancas, whatsapp }`.
- `POST /api/escritorio/estagiario` `{ contato, ativo?, autoEnviar?, confiancaMinima?, instrucao?, avisarQueEDeMaquina? }` → grava e devolve o mesmo.
- `POST /api/escritorio/estagiario/atender` `{ contato }` → simulação: roda mesmo
  com ele desligado, nunca envia, devolve `{ resultado, ligado, sugestao }`.
- `POST /api/escritorio/estagiario/sugestao` `{ id, acao: "enviar" | "descartar", texto? }`
  → envia pelo WhatsApp do advogado (marcando `doEstagiario`) ou descarta.

## 4. Painel da equipe, processos e documentação

Arquivos: `app/painel/Advogados.tsx` (e ligação em `app/painel/page.tsx`),
`app/escritorio/processos/page.tsx`, `app/api/escritorio/processos/route.ts`,
`README.md`, `docs/INTEGRACOES.md`, `.env.example`, `docs/CEREBRO.md`.

- Seção "Advogados de teste" no `/painel`: lista (nome, OAB, usuário, criado
  em, ativo) e formulário de criação (nome, OAB, usuário, senha) que chama
  `/api/advogados`; botão "Desativar". Mostra o link `/entrar` para passar ao
  advogado.
- `/escritorio/processos`: lista de `Processo` do advogado com último
  andamento e caso vinculado; campo para consultar um número novo
  (`POST /api/escritorio/processos { numero, casoId? }` → DataJud → guarda).
- Documentação: README ganha a seção "Plataforma do advogado" (como criar
  conta, entrar, fluxo nomeação → caso → triagem → WhatsApp); `.env.example`
  ganha `SESSAO_SEGREDO`; `docs/CEREBRO.md` registra a decisão.

## Ordem e integração

1. Base (módulo 1) primeiro; `npm run build` verde.
2. Módulos 2, 3 e 4 em paralelo, cada um em branch própria a partir da base.
3. Integração: junta as três, resolve conflitos, `npm run lint`, `npm run build`.
4. Teste ponta a ponta com Playwright: cria advogado pela API da equipe, entra,
   abre caso, marca documento, cria tarefa, cola nomeação, roda triagem,
   consulta processo, vê mensagens; e o teste de isolamento: um segundo
   advogado não enxerga nada do primeiro.
5. Revisão adversarial: autenticação, isolamento entre advogados, webhook,
   as travas do estagiário virtual (ele nunca fala fora delas), nada de segredo
   na tela ou no git.
