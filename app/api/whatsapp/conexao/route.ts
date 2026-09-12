import { ErroEvolution, cadastrarNumero, desconectar, estadoDaConexao, iniciarConexao, removerNumero } from "@/lib/evolution";
import { ErroSessao, exigirAdvogado } from "@/lib/sessao";

export const dynamic = "force-dynamic";

// O advogado logado é o dono da instância, do número e do QR: a Evolution
// conhece cada um pelo `usuario` da conta (instância `ponto-dativo-<usuario>`).

function erro(e: unknown) {
  if (e instanceof ErroSessao) return Response.json({ erro: e.message }, { status: e.status });
  if (e instanceof ErroEvolution) return Response.json({ erro: e.message }, { status: e.status });
  console.error("evolution:", e);
  return Response.json({ erro: "A conexão com o WhatsApp não respondeu agora." }, { status: 502 });
}

export async function GET() {
  try {
    const advogado = await exigirAdvogado();
    return Response.json(await estadoDaConexao(advogado.usuario));
  } catch (e) { return erro(e); }
}

export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const usuario = advogado.usuario;
    const corpo = await request.json().catch(() => null) as { acao?: string; numero?: string } | null;
    if (corpo?.acao === "cadastrar") return Response.json(await cadastrarNumero(usuario, corpo.numero ?? ""));
    if (corpo?.acao === "conectar") return Response.json(await iniciarConexao(usuario));
    if (corpo?.acao === "desconectar") return Response.json(await desconectar(usuario));
    if (corpo?.acao === "remover") return Response.json(await removerNumero(usuario));
    return Response.json({ erro: "Ação de WhatsApp inválida." }, { status: 400 });
  } catch (e) { return erro(e); }
}
