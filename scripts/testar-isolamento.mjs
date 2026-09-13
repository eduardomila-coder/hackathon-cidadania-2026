// Teste de isolamento entre advogados do Ponto Dativo.
//
// Cria duas contas pela API da equipe, entra com as duas e confere que uma não
// vê, não abre e não altera nada da outra. Também confere os portões: rota do
// escritório sem cookie, cookie adulterado e webhook fora do login.
//
// Uso: node scripts/testar-isolamento.mjs [http://127.0.0.1:3102]
// Precisa das mesmas variáveis do servidor (PAINEL_USUARIOS) no ambiente.
import { randomUUID } from "node:crypto";

const base = process.argv[2] ?? "http://127.0.0.1:3102";
const marcador = randomUUID().slice(0, 8);

const equipe = (process.env.PAINEL_USUARIOS ?? "")
  .split(";")
  .map((item) => item.split("="))
  .filter(([nome, senha]) => nome && senha)[0];
if (!equipe) throw new Error("PAINEL_USUARIOS não está no ambiente.");
const basic = "Basic " + Buffer.from(`${equipe[0]}:${equipe[1]}`).toString("base64");

let falhas = 0;
let verificacoes = 0;
function conferir(nome, condicao, detalhe = "") {
  verificacoes += 1;
  if (!condicao) falhas += 1;
  console.log(`${condicao ? "✓" : "✗"} ${nome}${detalhe ? ` · ${detalhe}` : ""}`);
}

async function pedir(caminho, { metodo = "GET", corpo, cookie, cabecalhos = {} } = {}) {
  const res = await fetch(`${base}${caminho}`, {
    method: metodo,
    redirect: "manual",
    headers: {
      ...(corpo ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...cabecalhos,
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await res.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* resposta em texto puro */ }
  const definir = res.headers.getSetCookie?.() ?? [];
  const cookieEmitido = definir[0]?.split(";")[0] ?? null;
  return { status: res.status, json, texto, cookieEmitido };
}

// 1. Contas criadas só pela equipe.
const semAuth = await pedir("/api/advogados", { metodo: "POST", corpo: { nome: "x", oab: "y", usuario: "z", senha: "12345678" } });
conferir("criar conta sem Basic Auth é barrado", semAuth.status === 401, `HTTP ${semAuth.status}`);

const senha = `teste-${marcador}-forte`;
const ana = { nome: `Ana Teste ${marcador}`, oab: "OAB/PR 90001", usuario: `ana.${marcador}`, senha };
const bruno = { nome: `Bruno Teste ${marcador}`, oab: "OAB/PR 90002", usuario: `bruno.${marcador}`, senha };
for (const conta of [ana, bruno]) {
  const res = await pedir("/api/advogados", { metodo: "POST", corpo: conta, cabecalhos: { Authorization: basic } });
  conferir(`equipe cria a conta ${conta.usuario}`, res.status === 201 || res.status === 200, `HTTP ${res.status}`);
}
const repetida = await pedir("/api/advogados", { metodo: "POST", corpo: ana, cabecalhos: { Authorization: basic } });
conferir("usuário repetido é recusado", repetida.status === 409, `HTTP ${repetida.status}`);

// 2. Entrada das duas contas.
const entrarAna = await pedir("/api/entrar", { metodo: "POST", corpo: { usuario: ana.usuario, senha } });
const entrarBruno = await pedir("/api/entrar", { metodo: "POST", corpo: { usuario: bruno.usuario, senha } });
conferir("Ana entra e recebe cookie", entrarAna.status === 200 && !!entrarAna.cookieEmitido, `HTTP ${entrarAna.status}`);
conferir("Bruno entra e recebe cookie", entrarBruno.status === 200 && !!entrarBruno.cookieEmitido, `HTTP ${entrarBruno.status}`);
conferir("a resposta do login não devolve a senha", !JSON.stringify(entrarAna.json ?? {}).includes(senha));

const errada = await pedir("/api/entrar", { metodo: "POST", corpo: { usuario: ana.usuario, senha: "senha-errada-123" } });
conferir("senha errada recebe 401", errada.status === 401, `HTTP ${errada.status}`);

const cookieAna = entrarAna.cookieEmitido;
const cookieBruno = entrarBruno.cookieEmitido;

// 3. Portões.
const semCookie = await pedir("/api/escritorio/casos");
conferir("API do escritório sem cookie responde 401", semCookie.status === 401, `HTTP ${semCookie.status}`);
const adulterado = cookieAna.replace(/.$/, (c) => (c === "a" ? "b" : "a"));
const comAdulterado = await pedir("/api/escritorio/casos", { cookie: adulterado });
conferir("cookie adulterado é recusado", comAdulterado.status === 401, `HTTP ${comAdulterado.status}`);
const pagina = await pedir("/escritorio");
conferir("página do escritório sem cookie manda para /entrar", pagina.status === 302, `HTTP ${pagina.status}`);

// 4. Ana trabalha.
const casoAna = await pedir("/api/escritorio/casos", {
  metodo: "POST",
  cookie: cookieAna,
  corpo: {
    titulo: `Caso da Ana ${marcador}`,
    origem: "particular",
    cliente: { nome: `Cliente Ana ${marcador}`, telefone: `55419999${marcador.replace(/\D/g, "").padEnd(4, "9")}` },
    processo: null,
    relato: "Relato fictício do teste de isolamento.",
    resumo: "Caso criado pelo teste de isolamento.",
  },
});
conferir("Ana abre um caso", casoAna.status === 201 && !!casoAna.json?.id, `HTTP ${casoAna.status}`);
const idAna = casoAna.json?.id;

const detalheAna = await pedir(`/api/escritorio/casos/${idAna}`, { cookie: cookieAna });
conferir("Ana lê o próprio caso", detalheAna.status === 200, `HTTP ${detalheAna.status}`);
conferir("caso novo nasce com os quatro documentos padrão", (detalheAna.json?.documentos?.length ?? 0) === 4, `${detalheAna.json?.documentos?.length} documentos`);
conferir("o caso nasce com registro na linha do tempo", (detalheAna.json?.registros?.length ?? 0) >= 1);

const tarefaAna = await pedir(`/api/escritorio/casos/${idAna}/tarefas`, { metodo: "POST", cookie: cookieAna, corpo: { titulo: "Conferir prazo no ato" } });
conferir("Ana cria tarefa no próprio caso", tarefaAna.status === 200 || tarefaAna.status === 201, `HTTP ${tarefaAna.status}`);

const resumoAna = await pedir("/api/escritorio/resumo", { cookie: cookieAna });
conferir("resumo de Ana conta o caso aberto", (resumoAna.json?.casosAbertos ?? 0) >= 1, `casosAbertos ${resumoAna.json?.casosAbertos}`);

// 5. Bruno não enxerga nada.
const listaBruno = await pedir("/api/escritorio/casos", { cookie: cookieBruno });
const vazou = (listaBruno.json ?? []).some((caso) => caso.id === idAna);
conferir("lista de casos de Bruno não traz o caso da Ana", !vazou, `${(listaBruno.json ?? []).length} casos`);
const resumoBruno = await pedir("/api/escritorio/resumo", { cookie: cookieBruno });
conferir("resumo de Bruno fica zerado", (resumoBruno.json?.casosAbertos ?? -1) === 0, `casosAbertos ${resumoBruno.json?.casosAbertos}`);
const clientesBruno = await pedir("/api/escritorio/clientes", { cookie: cookieBruno });
conferir("Bruno não vê o cliente da Ana", (clientesBruno.json ?? []).length === 0, `${(clientesBruno.json ?? []).length} clientes`);

// 6. Bruno não alcança o caso da Ana, por nenhuma rota.
const tentativas = [
  ["GET", `/api/escritorio/casos/${idAna}`, undefined],
  ["PATCH", `/api/escritorio/casos/${idAna}`, { titulo: "invadido" }],
  ["POST", `/api/escritorio/casos/${idAna}/documentos`, { nome: "invasão" }],
  ["POST", `/api/escritorio/casos/${idAna}/tarefas`, { titulo: "invasão" }],
  ["POST", `/api/escritorio/casos/${idAna}/registros`, { texto: "invasão" }],
  ["POST", `/api/escritorio/casos/${idAna}/triagem`, {}],
  ["POST", `/api/escritorio/casos/${idAna}/processo`, {}],
];
for (const [metodo, caminho, corpo] of tentativas) {
  const res = await pedir(caminho, { metodo, corpo, cookie: cookieBruno });
  conferir(`Bruno recebe 404 em ${metodo} ${caminho.replace(idAna, "<caso-da-ana>")}`, res.status === 404, `HTTP ${res.status}`);
}

// 7. O caso da Ana continua intacto depois das tentativas.
const depois = await pedir(`/api/escritorio/casos/${idAna}`, { cookie: cookieAna });
conferir("o caso da Ana não foi alterado", depois.json?.caso?.titulo === `Caso da Ana ${marcador}`, `título "${depois.json?.caso?.titulo}"`);

// 8. Webhook fora do login, com segredo próprio.
const webhook = await pedir("/api/whatsapp/webhook", { metodo: "POST", corpo: { event: "messages.upsert", instance: "x", data: {} } });
conferir("webhook não cai no portão do escritório", webhook.status !== 404 && !(webhook.texto ?? "").includes("Entre com seu usuário"), `HTTP ${webhook.status}`);

console.log(`\n${falhas === 0 ? "Isolamento confirmado" : `${falhas} verificação(ões) falharam`}: ${verificacoes - falhas} de ${verificacoes} verificações passaram.`);
process.exitCode = falhas === 0 ? 0 : 1;
