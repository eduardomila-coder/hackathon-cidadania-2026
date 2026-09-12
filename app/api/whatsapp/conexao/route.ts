import { ErroEvolution, cadastrarNumero, desconectar, estadoDaConexao, iniciarConexao, removerNumero } from "@/lib/evolution";

export const dynamic = "force-dynamic";

// O escritório fica atrás do Basic Auth do proxy. O login que passou por ele
// identifica o advogado: é dele a instância, o número e o QR.
function usuarioDe(request: Request) {
  const cabecalho = request.headers.get("authorization") ?? "";
  if (!cabecalho.startsWith("Basic ")) return null;
  try {
    const usuario = atob(cabecalho.slice(6)).split(":")[0]?.trim();
    return usuario || null;
  } catch { return null; }
}

function erro(e: unknown) {
  if (e instanceof ErroEvolution) return Response.json({ erro: e.message }, { status: e.status });
  console.error("evolution:", e);
  return Response.json({ erro: "A conexão com o WhatsApp não respondeu agora." }, { status: 502 });
}

export async function GET(request: Request) {
  const usuario = usuarioDe(request);
  if (!usuario) return Response.json({ erro: "Sem login." }, { status: 401 });
  try { return Response.json(await estadoDaConexao(usuario)); }
  catch (e) { return erro(e); }
}

export async function POST(request: Request) {
  const usuario = usuarioDe(request);
  if (!usuario) return Response.json({ erro: "Sem login." }, { status: 401 });
  const corpo = await request.json().catch(() => null) as { acao?: string; numero?: string } | null;
  try {
    if (corpo?.acao === "cadastrar") return Response.json(await cadastrarNumero(usuario, corpo.numero ?? ""));
    if (corpo?.acao === "conectar") return Response.json(await iniciarConexao(usuario));
    if (corpo?.acao === "desconectar") return Response.json(await desconectar(usuario));
    if (corpo?.acao === "remover") return Response.json(await removerNumero(usuario));
    return Response.json({ erro: "Ação de WhatsApp inválida." }, { status: 400 });
  } catch (e) { return erro(e); }
}
