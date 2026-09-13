import { adicionarDocumento, atualizarDocumento, ErroEscritorio } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { lerCorpo, responderErro } from "../../../comum";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const corpo = await lerCorpo<{ nome: string; detalhe: string; essencial: boolean }>(request);
    const documento = await adicionarDocumento(advogado.id, id, { nome: corpo.nome ?? "", detalhe: corpo.detalhe, essencial: corpo.essencial });
    return Response.json(documento, { status: 201 });
  } catch (e) {
    return responderErro(e, "adicionar documento");
  }
}

export async function PATCH(request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const corpo = await lerCorpo<{ id: string; recebido: boolean; nome: string; detalhe: string; essencial: boolean }>(request);
    if (typeof corpo.id !== "string" || !corpo.id) throw new ErroEscritorio("Informe qual documento alterar.");
    const { id: documentoId, ...campos } = corpo;
    return Response.json(await atualizarDocumento(advogado.id, id, documentoId, campos));
  } catch (e) {
    return responderErro(e, "alterar documento");
  }
}
