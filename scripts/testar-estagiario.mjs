// Teste do estagiário virtual do Ponto Dativo.
//
// Confere o que ele faz e, mais importante, o que ele NÃO faz: com a conversa
// desligada não responde, com o cliente agradecendo ele não fala, e no modo de
// sugestão ele prepara a resposta sem mandar nada ao cliente. Usa o mesmo
// caminho da produção: cria a conta pela API da equipe, cadastra o número,
// abre o caso e injeta o evento do WhatsApp pelo webhook da Evolution.
//
// Uso: node --env-file=.env.local scripts/testar-estagiario.mjs [http://127.0.0.1:3000]
// Precisa de PAINEL_USUARIOS e EVOLUTION_WEBHOOK_SECRET no ambiente.
import { randomUUID } from "node:crypto";

const base = (process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const marcador = randomUUID().slice(0, 8);
const segredo = process.env.EVOLUTION_WEBHOOK_SECRET ?? "";
if (!segredo) throw new Error("EVOLUTION_WEBHOOK_SECRET não está no ambiente.");

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
  const cookieEmitido = (res.headers.getSetCookie?.() ?? [])[0]?.split(";")[0] ?? null;
  return { status: res.status, json, texto, cookieEmitido };
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Evento no formato da Evolution, como o que chega do WhatsApp de verdade.
function eventoDoCliente({ instancia, contato, texto, id }) {
  return {
    event: "messages.upsert",
    instance: instancia,
    data: {
      key: { remoteJid: `${contato}@s.whatsapp.net`, fromMe: false, id },
      pushName: "Cliente do Teste",
      message: { conversation: texto },
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
  };
}

async function conversaAtual(cookie, contato) {
  const res = await pedir(`/api/escritorio/mensagens?contato=${contato}`, { cookie });
  return Array.isArray(res.json) ? res.json : [];
}

// Espera o estagiário terminar: o webhook responde antes dele (roda no `after`).
async function esperarEstagiario(cookie, contato, { ateMudarDe, limiteMs = 90000 } = {}) {
  const inicio = Date.now();
  let ultimo = null;
  while (Date.now() - inicio < limiteMs) {
    const res = await pedir(`/api/escritorio/estagiario?contato=${contato}`, { cookie });
    ultimo = res.json ?? null;
    if (ultimo && (ateMudarDe ? ultimo.sugestao?.id && ultimo.sugestao.id !== ateMudarDe : ultimo.sugestao)) return ultimo;
    await esperar(3000);
  }
  return ultimo;
}

// 1. Conta, número e caso, tudo pelo caminho da plataforma.
const senha = `teste-${marcador}-forte`;
const usuario = `estagiario.${marcador}`;
const criada = await pedir("/api/advogados", {
  metodo: "POST",
  cabecalhos: { Authorization: basic },
  corpo: { nome: `Estagiário Teste ${marcador}`, oab: "OAB/PR 90010", usuario, senha },
});
conferir("equipe cria a conta do advogado", criada.status === 201 || criada.status === 200, `HTTP ${criada.status}`);

const entrada = await pedir("/api/entrar", { metodo: "POST", corpo: { usuario, senha } });
conferir("advogado entra com a conta criada", entrada.status === 200 && Boolean(entrada.cookieEmitido), `HTTP ${entrada.status}`);
const cookie = entrada.cookieEmitido;

const numeroDoCliente = "5541990007788";
const contato = numeroDoCliente;
const numeroDoAdvogado = `(41) 99000-11${marcador.slice(0, 2).replace(/\D/g, "0")}`;
const cadastro = await pedir("/api/whatsapp/conexao", { metodo: "POST", cookie, corpo: { acao: "cadastrar", numero: numeroDoAdvogado } });
conferir("número do advogado cadastrado no servidor", cadastro.status === 200 && Boolean(cadastro.json?.instancia), `HTTP ${cadastro.status}`);
const instancia = cadastro.json?.instancia ?? `ponto-dativo-${usuario.replace(/\./g, "-")}`;

const caso = await pedir("/api/escritorio/casos", {
  metodo: "POST",
  cookie,
  corpo: {
    titulo: `Caso do estagiário ${marcador}`,
    origem: "particular",
    cliente: { nome: `Cliente do Estagiário ${marcador}`, telefone: numeroDoCliente },
    orgao: "Juizado Especial Cível de Curitiba",
    resumo: "Caso criado pelo teste do estagiário virtual.",
    relato: "O cliente comprou um produto que veio com defeito e a loja não respondeu ao pedido de troca. Tem a nota e as conversas com a loja.",
  },
});
conferir("caso aberto com o telefone do cliente", caso.status === 201 && Boolean(caso.json?.id), `HTTP ${caso.status}`);
const casoId = caso.json?.id;

const mensagemDoCliente = (texto) => eventoDoCliente({ instancia, contato, texto, id: `teste-${randomUUID()}` });

// 2. Desligado, o webhook é só cofre: guarda e não responde.
const antesDesligado = await conversaAtual(cookie, contato);
const desligado = await pedir(`/api/whatsapp/webhook?token=${encodeURIComponent(segredo)}`, {
  metodo: "POST",
  corpo: mensagemDoCliente("Bom dia, o produto que comprei veio com defeito. O que eu faço?"),
});
conferir("webhook aceita o evento do cliente", desligado.status === 202, `HTTP ${desligado.status}`);
conferir("com o estagiário desligado, o webhook não aciona ninguém", desligado.json?.estagiario === "desligado", `acao ${desligado.json?.estagiario}`);
const depoisDesligado = await conversaAtual(cookie, contato);
conferir("a mensagem do cliente fica guardada", depoisDesligado.length > antesDesligado.length, `${antesDesligado.length} -> ${depoisDesligado.length}`);
conferir("ninguém respondeu ao cliente", depoisDesligado.every((mensagem) => !mensagem.deMim), "nenhuma mensagem de saída");

// 3. Ligado no modo sugestão (sem envio automático).
const ligadoSemEnvio = await pedir("/api/escritorio/estagiario", { metodo: "POST", cookie, corpo: { contato, ativo: true, autoEnviar: false, confiancaMinima: 0.5 } });
conferir("o advogado liga o estagiário nesta conversa", ligadoSemEnvio.json?.config?.ativo === true && ligadoSemEnvio.json?.config?.autoEnviar === false, JSON.stringify(ligadoSemEnvio.json?.config ?? {}).slice(0, 90));

const comEstagiario = await pedir(`/api/whatsapp/webhook?token=${encodeURIComponent(segredo)}`, {
  metodo: "POST",
  corpo: mensagemDoCliente("A loja não me respondeu. Vocês podem me ajudar?"),
});
conferir("com o estagiário ligado, o webhook o aciona", comEstagiario.json?.estagiario === "acionado", `acao ${comEstagiario.json?.estagiario}`);

const estadoComSugestao = await esperarEstagiario(cookie, contato);
const sugestao = estadoComSugestao?.sugestao ?? null;
conferir("o estagiário prepara a resposta", Boolean(sugestao?.texto), sugestao ? `${sugestao.texto.slice(0, 60)}…` : "sem sugestão");
conferir("a sugestão explica por que não foi enviada", Boolean(sugestao?.motivo), sugestao?.motivo ?? "");
const conversaAposSugestao = await conversaAtual(cookie, contato);
conferir("nada saiu para o cliente no modo sugestão", conversaAposSugestao.every((mensagem) => !mensagem.doEstagiario), "nenhuma mensagem do estagiário");
const dossie = await pedir(`/api/escritorio/casos/${casoId}`, { cookie });
const registros = (dossie.json?.registros ?? []).map((registro) => registro.texto).join(" | ");
conferir("a decisão fica registrada no caso", /estagiário/i.test(registros), registros.slice(-120));

// 4. Obrigado não merece resposta: ele deve ficar quieto, sem responder nada.
const idDaSugestao = sugestao?.id ?? null;
const antesDoObrigado = conversaAposSugestao.length;
await pedir(`/api/whatsapp/webhook?token=${encodeURIComponent(segredo)}`, {
  metodo: "POST",
  corpo: mensagemDoCliente("Obrigado, vou aguardar."),
});
const depoisDoObrigado = await esperarEstagiario(cookie, contato, { ateMudarDe: idDaSugestao ?? undefined, limiteMs: 75000 });
const conversaDepoisDoObrigado = await conversaAtual(cookie, contato);
conferir("agradecimento não vira conversa fiada: nada novo saiu", conversaDepoisDoObrigado.length === antesDoObrigado, `${antesDoObrigado} -> ${conversaDepoisDoObrigado.length}`);
const dossie2 = await pedir(`/api/escritorio/casos/${casoId}`, { cookie });
const registros2 = (dossie2.json?.registros ?? []).map((registro) => registro.texto);
conferir("o caso ganha o registro da decisão do estagiário", registros2.length > (dossie.json?.registros ?? []).length, `${(dossie.json?.registros ?? []).length} -> ${registros2.length}`);
void depoisDoObrigado;

// 5. A simulação da tela mostra o que ele faria e não envia nada.
const simulacao = await pedir("/api/escritorio/estagiario/atender", { metodo: "POST", cookie, corpo: { contato } });
const resultadoSimulacao = simulacao.json?.resultado ?? {};
conferir("a simulação devolve o que o estagiário faria", simulacao.status === 200 && ["sugerida", "calado", "sem_mensagem_do_cliente"].includes(resultadoSimulacao.acao), `acao ${resultadoSimulacao.acao}`);
conferir("a simulação diz que nada foi enviado", simulacao.json?.sugestao ? String(simulacao.json.sugestao.motivo).startsWith("Simulação") : resultadoSimulacao.acao !== "sugerida", String(simulacao.json?.sugestao?.motivo ?? resultadoSimulacao.motivo ?? "").slice(0, 70));

// 6. Desligar devolve a conversa ao advogado.
await pedir("/api/escritorio/estagiario", { metodo: "POST", cookie, corpo: { contato, ativo: false } });
const antesDeDesligar = (await conversaAtual(cookie, contato)).length;
const comDesligado = await pedir(`/api/whatsapp/webhook?token=${encodeURIComponent(segredo)}`, {
  metodo: "POST",
  corpo: mensagemDoCliente("Vocês estão aí?"),
});
conferir("desligado de novo, o webhook não aciona o estagiário", comDesligado.json?.estagiario === "desligado", `acao ${comDesligado.json?.estagiario}`);
await esperar(8000);
const conversaFinal = await conversaAtual(cookie, contato);
conferir("e a conversa continua sem resposta automática", conversaFinal.length === antesDeDesligar + 1 && conversaFinal.every((mensagem) => !mensagem.doEstagiario), `${antesDeDesligar} -> ${conversaFinal.length}`);

// Limpeza: o número de teste não fica cadastrado no servidor.
const limpeza = await pedir("/api/whatsapp/conexao", { metodo: "POST", cookie, corpo: { acao: "remover" } });
conferir("o número de teste é removido no fim", limpeza.status === 200, `HTTP ${limpeza.status}`);

console.log(`\n${falhas === 0 ? "Estagiário virtual conferido" : `${falhas} falha(s)`}: ${verificacoes - falhas} de ${verificacoes} verificações passaram.`);
if (falhas) console.log(`Falhas: ${falhas}`);
process.exit(falhas === 0 ? 0 : 1);
