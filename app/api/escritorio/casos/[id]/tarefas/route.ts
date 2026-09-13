import { adicionarTarefa, atualizarTarefa, ErroEscritorio } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { lerCorpo, responderErro } from "../../../comum";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const corpo = await lerCorpo<{ titulo: string; prazo: string | null }>(request);
    const tarefa = await adicionarTarefa(advogado.id, id, { titulo: corpo.titulo ?? "", prazo: corpo.prazo ?? null });
    return Response.json(tarefa, { status: 201 });
  } catch (e) {
    return responderErro(e, "adicionar tarefa");
  }
}

export async function PATCH(request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const corpo = await lerCorpo<{ id: string; concluida: boolean; titulo: string; prazo: string | null }>(request);
    if (typeof corpo.id !== "string" || !corpo.id) throw new ErroEscritorio("Informe qual tarefa alterar.");
    const { id: tarefaId, ...campos } = corpo;
    return Response.json(await atualizarTarefa(advogado.id, id, tarefaId, campos));
  } catch (e) {
    return responderErro(e, "alterar tarefa");
  }
}
