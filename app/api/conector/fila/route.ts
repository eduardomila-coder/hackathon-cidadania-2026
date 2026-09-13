import { advogadoDaChave, fila, responder } from "@/lib/conector";

export const dynamic = "force-dynamic";

// As duas rotas que o conector do advogado usa. Ele não entra com sessão de
// navegador: apresenta a chave que o advogado copiou da tela uma única vez.
// Sem chave válida, nada é dito — nem que o advogado existe.
function advogadoDoPedido(request: Request): string {
  const cabecalho = request.headers.get("authorization") ?? "";
  const chave = cabecalho.toLowerCase().startsWith("bearer ") ? cabecalho.slice(7).trim() : "";
  const advogadoId = chave ? advogadoDaChave(chave) : null;
  if (!advogadoId) throw new Error("chave inválida");
  return advogadoId;
}

// GET /api/conector/fila → o que está esperando este conector.
export async function GET(request: Request) {
  try {
    const advogadoId = advogadoDoPedido(request);
    return Response.json({ pedidos: await fila(advogadoId) });
  } catch {
    return Response.json({ erro: "Chave do conector inválida." }, { status: 401 });
  }
}

// POST /api/conector/fila {id, resultado|erro} → devolve o que fez.
export async function POST(request: Request) {
  let advogadoId: string;
  try {
    advogadoId = advogadoDoPedido(request);
  } catch {
    return Response.json({ erro: "Chave do conector inválida." }, { status: 401 });
  }
  try {
    const corpo = await request.json() as { id?: string; resultado?: Record<string, unknown>; erro?: string };
    if (!corpo?.id) return Response.json({ erro: "Informe o pedido." }, { status: 400 });
    await responder(advogadoId, corpo.id, { resultado: corpo.resultado, erro: corpo.erro });
    return Response.json({ ok: true });
  } catch (e) {
    const status = e && typeof e === "object" && "status" in e ? Number((e as { status: unknown }).status) : 400;
    return Response.json({ erro: e instanceof Error ? e.message : "Não deu para responder." }, { status });
  }
}
