import { atualizarCaso, dossieDoCaso, ErroEscritorio, type CamposDoCaso } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { CAMPOS_EDITAVEIS_DO_CASO, lerCorpo, responderErro } from "../../comum";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

// GET /api/escritorio/casos/[id] → tudo que a página do caso mostra.
export async function GET(_request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const dossie = dossieDoCaso(advogado.id, id);
    if (!dossie) throw new ErroEscritorio("Caso não encontrado.", 404);
    return Response.json(dossie);
  } catch (e) {
    return responderErro(e, "ler caso");
  }
}

// PATCH /api/escritorio/casos/[id] → só os campos editáveis; o resto é
// ignorado sem reclamar.
export async function PATCH(request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const corpo = await lerCorpo<Record<string, unknown>>(request);
    const campos: Record<string, unknown> = {};
    for (const campo of CAMPOS_EDITAVEIS_DO_CASO) {
      if (corpo[campo] !== undefined) campos[campo] = corpo[campo];
    }
    if (Object.keys(campos).length === 0) throw new ErroEscritorio("Nada para alterar.");
    return Response.json(await atualizarCaso(advogado.id, id, campos as CamposDoCaso));
  } catch (e) {
    return responderErro(e, "alterar caso");
  }
}
