import { timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";

type Configuracao = {
  url: string;
  chave: string;
  instancia: string;
  urlPublica: string | null;
  segredoWebhook: string | null;
};

type RespostaEstado = { instance?: { state?: string; instanceName?: string } };
type RespostaConectar = { pairingCode?: string; code?: string; base64?: string };

export class ErroEvolution extends Error {
  constructor(message: string, readonly status = 502) { super(message); }
}

function configuracao(): Configuracao | null {
  const url = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
  const chave = process.env.EVOLUTION_API_KEY;
  const instancia = process.env.EVOLUTION_INSTANCE;
  if (!url || !chave || !instancia || !/^[a-zA-Z0-9_-]+$/.test(instancia)) return null;

  try {
    const destino = new URL(url);
    const seguro = destino.protocol === "https:" || destino.hostname === "localhost" || destino.hostname === "127.0.0.1";
    if (!seguro) return null;
  } catch { return null; }

  return {
    url,
    chave,
    instancia,
    urlPublica: process.env.APP_URL?.replace(/\/$/, "") ?? null,
    segredoWebhook: process.env.EVOLUTION_WEBHOOK_SECRET ?? null,
  };
}

export function informacaoPublicaEvolution() {
  const dados = configuracao();
  return {
    configurado: Boolean(dados),
    instancia: dados?.instancia ?? null,
    webhookPodeSerConfigurado: Boolean(dados?.urlPublica && dados.segredoWebhook),
  };
}

async function requisitar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const dados = configuracao();
  if (!dados) throw new ErroEvolution("A integração Evolution ainda não foi configurada no servidor.", 503);
  const resposta = await fetch(`${dados.url}${caminho}`, {
    ...init,
    cache: "no-store",
    headers: { apikey: dados.chave, "Content-Type": "application/json", ...init?.headers },
  });
  const corpo = await resposta.json().catch(() => null) as T | null;
  if (!resposta.ok || !corpo) throw new ErroEvolution("Não foi possível falar com a instância do WhatsApp agora.", resposta.status || 502);
  return corpo;
}

export async function estadoDaConexao() {
  const dados = configuracao();
  if (!dados) return { ...informacaoPublicaEvolution(), estado: "nao_configurado" as const };
  const resposta = await requisitar<RespostaEstado>(`/instance/connectionState/${encodeURIComponent(dados.instancia)}`);
  const estado = resposta.instance?.state ?? "desconhecido";
  return { ...informacaoPublicaEvolution(), estado, instancia: resposta.instance?.instanceName ?? dados.instancia };
}

export async function iniciarConexao() {
  const dados = configuracao();
  if (!dados) throw new ErroEvolution("Configure a instância Evolution no servidor antes de gerar o QR Code.", 503);
  const resposta = await requisitar<RespostaConectar>(`/instance/connect/${encodeURIComponent(dados.instancia)}`);
  const codigo = resposta.pairingCode ?? resposta.code ?? null;
  const imagemBase64 = resposta.base64;
  const imagem = imagemBase64
    ? imagemBase64.startsWith("data:") ? imagemBase64 : `data:image/png;base64,${imagemBase64}`
    : codigo ? await QRCode.toDataURL(codigo, { errorCorrectionLevel: "M", margin: 1, width: 280 }) : null;
  return { codigo, imagem };
}

export async function configurarWebhook() {
  const dados = configuracao();
  if (!dados?.urlPublica || !dados.segredoWebhook) throw new ErroEvolution("Defina APP_URL e EVOLUTION_WEBHOOK_SECRET no servidor antes de registrar o webhook.", 503);
  const urlWebhook = new URL("/api/whatsapp/webhook", dados.urlPublica);
  urlWebhook.searchParams.set("token", dados.segredoWebhook);
  await requisitar(`/webhook/set/${encodeURIComponent(dados.instancia)}`, {
    method: "POST",
    body: JSON.stringify({
      enabled: true,
      url: urlWebhook.toString(),
      webhookByEvents: false,
      webhookBase64: false,
      events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
    }),
  });
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
    recebida: evento === "MESSAGES_UPSERT" && chave.fromMe !== true,
    temTexto: Boolean(mensagem.conversation || (mensagem.extendedTextMessage as Record<string, unknown> | undefined)?.text),
    temMidia: Object.keys(mensagem).some((chaveMensagem) => /image|document|audio|video/i.test(chaveMensagem)),
  };
}
