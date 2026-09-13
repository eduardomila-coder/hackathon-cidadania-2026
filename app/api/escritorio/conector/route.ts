import { conectorDoAdvogado, novaChave, pedidoPorId, pedir, type TipoDePedido } from "@/lib/conector";
import { exigirAdvogado } from "@/lib/sessao";
import { lerCorpo, responderErro } from "../comum";

export const dynamic = "force-dynamic";

const TIPOS: TipoDePedido[] = ["certificados", "assinar", "projudi-saude", "projudi-entrar", "projudi-carteira", "projudi-processo"];

// GET  /api/escritorio/conector            → se há conector pareado e quando falou
// GET  /api/escritorio/conector?pedido=id  → o que o conector respondeu
export async function GET(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const id = new URL(request.url).searchParams.get("pedido");
    if (id) {
      const pedido = pedidoPorId(advogado.id, id);
      if (!pedido) return Response.json({ erro: "Esse pedido não existe mais." }, { status: 404 });
      return Response.json({ estado: pedido.estado, resultado: pedido.resultado, erro: pedido.erro });
    }
    return Response.json({ conector: conectorDoAdvogado(advogado.id) });
  } catch (e) {
    return responderErro(e, "estado do conector");
  }
}

// POST /api/escritorio/conector {acao:"chave"}         → chave nova, mostrada uma vez
// POST /api/escritorio/conector {tipo, dados}          → põe um pedido na fila
export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await lerCorpo<{ acao?: string; tipo?: TipoDePedido; dados?: Record<string, unknown> }>(request);

    if (corpo.acao === "chave") {
      return Response.json({ chave: await novaChave(advogado.id) }, { status: 201 });
    }
    if (!corpo.tipo || !TIPOS.includes(corpo.tipo)) {
      return Response.json({ erro: "Pedido desconhecido." }, { status: 400 });
    }
    const pedido = await pedir(advogado.id, corpo.tipo, corpo.dados ?? {});
    return Response.json({ id: pedido.id }, { status: 201 });
  } catch (e) {
    return responderErro(e, "pedido ao conector");
  }
}
