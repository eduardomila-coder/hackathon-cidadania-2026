import { registrar } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { lerCorpo, responderErro } from "../../../comum";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

// Nota do advogado na linha do tempo. Pela API só entram "registro" e
// "humano"; "assistente" e "whatsapp" são gravados pelo servidor.
export async function POST(request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const corpo = await lerCorpo<{ texto: string; tipo: "registro" | "humano" }>(request);
    const tipo = corpo.tipo === "registro" ? "registro" : "humano";
    const registro = await registrar(advogado.id, id, tipo, corpo.texto ?? "");
    return Response.json(registro, { status: 201 });
  } catch (e) {
    return responderErro(e, "registrar");
  }
}
