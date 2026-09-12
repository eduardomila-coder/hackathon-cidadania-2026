import { ErroEvolution, configurarWebhook, estadoDaConexao, iniciarConexao } from "@/lib/evolution";

export const dynamic = "force-dynamic";

function erro(e: unknown) {
  if (e instanceof ErroEvolution) return Response.json({ erro: e.message }, { status: e.status });
  console.error("evolution:", e);
  return Response.json({ erro: "A conexão com o WhatsApp não respondeu agora." }, { status: 502 });
}

export async function GET() {
  try { return Response.json(await estadoDaConexao()); }
  catch (e) { return erro(e); }
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null) as { acao?: string } | null;
  try {
    if (corpo?.acao === "conectar") return Response.json(await iniciarConexao());
    if (corpo?.acao === "webhook") return Response.json(await configurarWebhook());
    return Response.json({ erro: "Ação de WhatsApp inválida." }, { status: 400 });
  } catch (e) { return erro(e); }
}
