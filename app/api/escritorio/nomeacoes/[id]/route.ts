import { atualizarNomeacao, ErroEscritorio, nomeacaoPorId, removerNomeacao, type CamposDaNomeacao } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { lerCorpo, responderErro } from "../../comum";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const nomeacao = nomeacaoPorId(advogado.id, id);
    if (!nomeacao) throw new ErroEscritorio("Nomeação não encontrada.", 404);
    return Response.json(nomeacao);
  } catch (e) {
    return responderErro(e, "ler nomeação");
  }
}

export async function PATCH(request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const corpo = await lerCorpo<Record<string, unknown>>(request);
    const campos: Record<string, unknown> = {};
    for (const campo of ["camposExtraidos", "checklist", "estado", "casoId"] as const) {
      if (corpo[campo] !== undefined) campos[campo] = corpo[campo];
    }
    if (Object.keys(campos).length === 0) throw new ErroEscritorio("Nada para alterar.");
    return Response.json(await atualizarNomeacao(advogado.id, id, campos as CamposDaNomeacao));
  } catch (e) {
    return responderErro(e, "alterar nomeação");
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    await removerNomeacao(advogado.id, id);
    return Response.json({ removida: true });
  } catch (e) {
    return responderErro(e, "remover nomeação");
  }
}
