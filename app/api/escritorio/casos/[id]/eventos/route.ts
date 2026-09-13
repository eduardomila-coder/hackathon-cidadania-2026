import { adicionarEvento, atualizarEvento, eventosDoCaso, ErroEscritorio, removerEvento, type CamposDoEvento, type DadosDoEvento } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { lerCorpo, responderErro } from "../../../comum";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    return Response.json(eventosDoCaso(advogado.id, id));
  } catch (e) {
    return responderErro(e, "listar eventos");
  }
}

export async function POST(request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const corpo = await lerCorpo<DadosDoEvento>(request);
    return Response.json(await adicionarEvento(advogado.id, id, corpo as DadosDoEvento), { status: 201 });
  } catch (e) {
    return responderErro(e, "adicionar evento");
  }
}

export async function PATCH(request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const corpo = await lerCorpo<Record<string, unknown>>(request);
    if (typeof corpo.id !== "string" || !corpo.id) throw new ErroEscritorio("Informe qual evento alterar.");
    const campos: Record<string, unknown> = {};
    for (const campo of ["tipo", "titulo", "descricao", "data", "prazoInformado"] as const) {
      if (corpo[campo] !== undefined) campos[campo] = corpo[campo];
    }
    if (Object.keys(campos).length === 0) throw new ErroEscritorio("Nada para alterar.");
    return Response.json(await atualizarEvento(advogado.id, id, corpo.id, campos as CamposDoEvento));
  } catch (e) {
    return responderErro(e, "alterar evento");
  }
}

export async function DELETE(request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const corpo = await lerCorpo<{ id: string }>(request);
    if (typeof corpo.id !== "string" || !corpo.id) throw new ErroEscritorio("Informe qual evento remover.");
    await removerEvento(advogado.id, id, corpo.id);
    return Response.json({ removido: true });
  } catch (e) {
    return responderErro(e, "remover evento");
  }
}
