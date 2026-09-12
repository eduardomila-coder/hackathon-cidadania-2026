import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";

// WhatsApp do advogado via Evolution API v2. O servidor guarda só a URL e a
// chave global da Evolution; cada advogado cadastra o próprio número na tela
// do escritório, ganha uma instância com o seu login e conecta pelo QR. Nada
// aqui envia mensagem: o webhook só avisa que chegou algo, para revisão humana.

type Configuracao = {
  url: string;
  chave: string;
  urlPublica: string | null;
  segredoWebhook: string | null;
};

export type NumeroCadastrado = {
  usuario: string;
  instancia: string;
  numero: string;
  cadastradoEm: string;
  webhookRegistrado: boolean;
};

type RespostaEstado = { instance?: { state?: string; instanceName?: string } };
type RespostaConectar = { pairingCode?: string; code?: string; base64?: string; instance?: { state?: string } };
type RespostaCriar = { instance?: { instanceName?: string; status?: string }; qrcode?: RespostaConectar };

export class ErroEvolution extends Error {
  constructor(message: string, readonly status = 502) { super(message); }
}

const PASTA = join(process.cwd(), "data");
const ARQUIVO = join(PASTA, "whatsapp.json");

function configuracao(): Configuracao | null {
  const url = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
  const chave = process.env.EVOLUTION_API_KEY;
  if (!url || !chave) return null;

  try {
    const destino = new URL(url);
    const seguro = destino.protocol === "https:" || destino.hostname === "localhost" || destino.hostname === "127.0.0.1";
    if (!seguro) return null;
  } catch { return null; }

  return {
    url,
    chave,
    urlPublica: process.env.APP_URL?.replace(/\/$/, "") ?? null,
    segredoWebhook: process.env.EVOLUTION_WEBHOOK_SECRET ?? null,
  };
}

// Cadastro dos números, um por login do escritório. Guarda só o que a
// conexão precisa: login, nome da instância e número do advogado.
function lerCadastro(): NumeroCadastrado[] {
  try { return JSON.parse(readFileSync(ARQUIVO, "utf8")) as NumeroCadastrado[]; }
  catch { return []; }
}

function gravarCadastro(lista: NumeroCadastrado[]) {
  mkdirSync(PASTA, { recursive: true });
  const temporario = `${ARQUIVO}.${process.pid}.tmp`;
  writeFileSync(temporario, JSON.stringify(lista, null, 2) + "\n");
  renameSync(temporario, ARQUIVO);
}

function cadastroDe(usuario: string) {
  return lerCadastro().find((item) => item.usuario === usuario) ?? null;
}

export function nomeDaInstancia(usuario: string) {
  const limpo = usuario.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!limpo) throw new ErroEvolution("Login inválido para criar a instância.", 400);
  return `ponto-dativo-${limpo}`;
}

// Aceita como o advogado digita: com ou sem +55, DDD, espaços e traços.
// Devolve só dígitos com o código do país, que é o que a Evolution espera.
export function normalizarNumero(entrada: string) {
  const digitos = entrada.replace(/\D/g, "");
  const completo = digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
  if (!/^55\d{10,11}$/.test(completo)) throw new ErroEvolution("Informe o número com DDD, como (41) 99999-9999.", 400);
  return completo;
}

export function formatarNumero(numero: string) {
  const m = numero.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : numero;
}

export function informacaoPublicaEvolution() {
  const dados = configuracao();
  return {
    configurado: Boolean(dados),
    webhookPodeSerConfigurado: Boolean(dados?.urlPublica && dados.segredoWebhook),
  };
}

async function requisitar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const dados = configuracao();
  if (!dados) throw new ErroEvolution("A integração Evolution ainda não foi configurada no servidor.", 503);
  let resposta: Response;
  try {
    resposta = await fetch(`${dados.url}${caminho}`, {
      ...init,
      cache: "no-store",
      headers: { apikey: dados.chave, "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ErroEvolution("O servidor do WhatsApp não respondeu agora.", 502);
  }
  const corpo = await resposta.json().catch(() => null) as T | null;
  if (resposta.status === 404) throw new ErroEvolution("Instância não encontrada.", 404);
  if (!resposta.ok || !corpo) throw new ErroEvolution("Não foi possível falar com a instância do WhatsApp agora.", resposta.status || 502);
  return corpo;
}

async function imagemDoQr(resposta: RespostaConectar | undefined) {
  const codigo = resposta?.pairingCode ?? resposta?.code ?? null;
  const base64 = resposta?.base64;
  const imagem = base64
    ? base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`
    : codigo ? await QRCode.toDataURL(codigo, { errorCorrectionLevel: "M", margin: 1, width: 280 }) : null;
  return { codigo: resposta?.pairingCode ?? null, imagem };
}

async function registrarWebhook(instancia: string) {
  const dados = configuracao();
  if (!dados?.urlPublica || !dados.segredoWebhook) return false;
  const urlWebhook = new URL("/api/whatsapp/webhook", dados.urlPublica);
  urlWebhook.searchParams.set("token", dados.segredoWebhook);
  await requisitar(`/webhook/set/${encodeURIComponent(instancia)}`, {
    method: "POST",
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: urlWebhook.toString(),
        byEvents: false,
        base64: false,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
      },
    }),
  });
  return true;
}

export async function estadoDaConexao(usuario: string) {
  const publico = informacaoPublicaEvolution();
  const cadastro = cadastroDe(usuario);
  if (!publico.configurado) return { ...publico, estado: "nao_configurado", numero: null, instancia: null };
  if (!cadastro) return { ...publico, estado: "sem_numero", numero: null, instancia: null };
  try {
    const resposta = await requisitar<RespostaEstado>(`/instance/connectionState/${encodeURIComponent(cadastro.instancia)}`);
    return { ...publico, estado: resposta.instance?.state ?? "desconhecido", numero: formatarNumero(cadastro.numero), instancia: cadastro.instancia };
  } catch (e) {
    if (e instanceof ErroEvolution && e.status === 404) return { ...publico, estado: "sem_instancia", numero: formatarNumero(cadastro.numero), instancia: cadastro.instancia };
    throw e;
  }
}

// Cadastra o número, cria a instância na Evolution (ou reaproveita a que já
// existe com esse nome), registra o webhook e devolve o primeiro QR. O número
// não vai no `create` de propósito: com ele a Evolution troca o QR pelo código
// de pareamento, que expira a cada 45 s e falha muito mais na prática.
export async function cadastrarNumero(usuario: string, entrada: string) {
  const numero = normalizarNumero(entrada);
  const instancia = nomeDaInstancia(usuario);
  let qr: RespostaConectar | undefined;
  try {
    const criada = await requisitar<RespostaCriar>("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: instancia,
        token: randomBytes(24).toString("hex"),
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      }),
    });
    qr = criada.qrcode;
  } catch (e) {
    // 403 é "name already in use": a instância ficou de um cadastro anterior.
    if (!(e instanceof ErroEvolution && e.status === 403)) throw e;
  }

  let webhookRegistrado = false;
  try { webhookRegistrado = await registrarWebhook(instancia); }
  catch (e) { console.error("evolution: webhook não registrado:", e); }

  const lista = lerCadastro().filter((item) => item.usuario !== usuario);
  lista.push({ usuario, instancia, numero, cadastradoEm: new Date().toISOString(), webhookRegistrado });
  gravarCadastro(lista);

  if (!qr?.base64 && !qr?.code) qr = await requisitar<RespostaConectar>(`/instance/connect/${encodeURIComponent(instancia)}`);
  return { numero: formatarNumero(numero), instancia, webhookRegistrado, ...(await imagemDoQr(qr)) };
}

// Novo QR para uma instância já cadastrada (o QR da Evolution expira sozinho).
export async function iniciarConexao(usuario: string) {
  const cadastro = cadastroDe(usuario);
  if (!cadastro) throw new ErroEvolution("Cadastre o número do WhatsApp antes de gerar o QR.", 400);
  const resposta = await requisitar<RespostaConectar>(`/instance/connect/${encodeURIComponent(cadastro.instancia)}`);
  if (resposta.instance?.state === "open") return { conectado: true, codigo: null, imagem: null };
  return { conectado: false, ...(await imagemDoQr(resposta)) };
}

export async function desconectar(usuario: string) {
  const cadastro = cadastroDe(usuario);
  if (!cadastro) throw new ErroEvolution("Não há número cadastrado.", 400);
  await requisitar(`/instance/logout/${encodeURIComponent(cadastro.instancia)}`, { method: "DELETE" });
  return { pronto: true };
}

// Apaga a instância na Evolution e o cadastro local. Depois disso não sobra
// sessão do WhatsApp do advogado no servidor.
export async function removerNumero(usuario: string) {
  const cadastro = cadastroDe(usuario);
  if (!cadastro) throw new ErroEvolution("Não há número cadastrado.", 400);
  try { await requisitar(`/instance/logout/${encodeURIComponent(cadastro.instancia)}`, { method: "DELETE" }); }
  catch { /* já estava desconectada */ }
  try { await requisitar(`/instance/delete/${encodeURIComponent(cadastro.instancia)}`, { method: "DELETE" }); }
  catch (e) { if (!(e instanceof ErroEvolution && e.status === 404)) throw e; }
  gravarCadastro(lerCadastro().filter((item) => item.usuario !== usuario));
  return { pronto: true };
}

export function webhookAutorizado(token: string | null) {
  const segredo = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!segredo || !token) return false;
  const esperado = Buffer.from(segredo);
  const recebido = Buffer.from(token);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

export function resumoDoEvento(payload: unknown) {
  const dado = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const evento = typeof dado.event === "string" ? dado.event : typeof dado.type === "string" ? dado.type : "DESCONHECIDO";
  const dados = dado.data && typeof dado.data === "object" ? dado.data as Record<string, unknown> : {};
  const chave = dados.key && typeof dados.key === "object" ? dados.key as Record<string, unknown> : {};
  const mensagem = dados.message && typeof dados.message === "object" ? dados.message as Record<string, unknown> : {};
  return {
    evento,
    instancia: typeof dado.instance === "string" ? dado.instance : null,
    recebida: /messages[._]upsert/i.test(evento) && chave.fromMe !== true,
    temTexto: Boolean(mensagem.conversation || (mensagem.extendedTextMessage as Record<string, unknown> | undefined)?.text),
    temMidia: Object.keys(mensagem).some((chaveMensagem) => /image|document|audio|video/i.test(chaveMensagem)),
  };
}
