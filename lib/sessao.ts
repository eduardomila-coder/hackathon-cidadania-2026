import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cookies } from "next/headers";
import { advogadoPorId, type AdvogadoPublico } from "./contas";

// Sessão do advogado: um cookie assinado, sem tabela de sessões no servidor.
// Valor = base64url(JSON{ id, exp }) + "." + HMAC-SHA256 do primeiro pedaço.
// O `proxy.ts` só confere assinatura e validade (é rápido e não lê o banco);
// a rota ou o layout confirma, com `advogadoAtual()`, que a conta existe e
// continua ativa.

export const NOME_DO_COOKIE = "pd_sessao";
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const ARQUIVO_SEGREDO = join(process.cwd(), "data", "segredo-sessao.txt");

export class ErroSessao extends Error {
  readonly status = 401;
  constructor(message = "Entre com seu usuário e senha para continuar.") { super(message); }
}

let segredoEmMemoria: string | null = null;

// Segredo da assinatura: `SESSAO_SEGREDO` do ambiente ou, se faltar, um
// gerado uma vez e guardado em `data/`. Sem isso, cada reinício derrubaria
// todo mundo do escritório.
function segredo(): string {
  if (segredoEmMemoria) return segredoEmMemoria;
  const doAmbiente = process.env.SESSAO_SEGREDO?.trim();
  if (doAmbiente) return (segredoEmMemoria = doAmbiente);

  try {
    const lido = readFileSync(ARQUIVO_SEGREDO, "utf8").trim();
    if (lido) return (segredoEmMemoria = lido);
  } catch { /* ainda não existe */ }

  const novo = randomBytes(32).toString("hex");
  mkdirSync(dirname(ARQUIVO_SEGREDO), { recursive: true });
  try {
    writeFileSync(ARQUIVO_SEGREDO, `${novo}\n`, { flag: "wx", mode: 0o600 });
    return (segredoEmMemoria = novo);
  } catch {
    // Outro processo gravou primeiro: usa o dele.
    return (segredoEmMemoria = readFileSync(ARQUIVO_SEGREDO, "utf8").trim());
  }
}

function assinar(carga: string) {
  return createHmac("sha256", segredo()).update(carga).digest("base64url");
}

function cookieSeguro() {
  return (process.env.APP_URL ?? "").trim().toLowerCase().startsWith("https");
}

export function criarCookieDeSessao(advogadoId: string) {
  const exp = Date.now() + VALIDADE_MS;
  const carga = Buffer.from(JSON.stringify({ id: advogadoId, exp })).toString("base64url");
  return {
    nome: NOME_DO_COOKIE,
    valor: `${carga}.${assinar(carga)}`,
    opcoes: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: cookieSeguro(),
      path: "/",
      expires: new Date(exp),
      maxAge: Math.floor(VALIDADE_MS / 1000),
    },
  };
}

// Cookie vazio e já vencido, para o navegador apagar o atual.
export function cookieDeSaida() {
  return {
    nome: NOME_DO_COOKIE,
    valor: "",
    opcoes: { httpOnly: true, sameSite: "lax" as const, secure: cookieSeguro(), path: "/", expires: new Date(0), maxAge: 0 },
  };
}

export function advogadoDaSessao(valorDoCookie: string | undefined): { id: string } | null {
  if (!valorDoCookie) return null;
  const separador = valorDoCookie.indexOf(".");
  if (separador < 1) return null;
  const carga = valorDoCookie.slice(0, separador);
  const assinatura = valorDoCookie.slice(separador + 1);

  const esperada = Buffer.from(assinar(carga));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;

  try {
    const dados = JSON.parse(Buffer.from(carga, "base64url").toString("utf8")) as { id?: unknown; exp?: unknown };
    if (typeof dados.id !== "string" || !dados.id || typeof dados.exp !== "number") return null;
    if (dados.exp <= Date.now()) return null;
    return { id: dados.id };
  } catch {
    return null;
  }
}

// O advogado logado, lido do cookie do pedido atual (server components e
// route handlers). null se não há sessão, se a conta sumiu ou foi desativada.
export async function advogadoAtual(): Promise<AdvogadoPublico | null> {
  const loja = await cookies();
  const sessao = advogadoDaSessao(loja.get(NOME_DO_COOKIE)?.value);
  if (!sessao) return null;
  const advogado = advogadoPorId(sessao.id);
  return advogado && advogado.ativo ? advogado : null;
}

export async function exigirAdvogado(): Promise<AdvogadoPublico> {
  const advogado = await advogadoAtual();
  if (!advogado) throw new ErroSessao();
  return advogado;
}
