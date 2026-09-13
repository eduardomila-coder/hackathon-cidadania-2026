import { criarHonorariosDoCaso, ErroEscritorio, honorariosDoCaso, removerHonorariosDoCaso, atualizarHonorariosDoCaso, type DadosDosHonorarios } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { lerCorpo, responderErro } from "../../../comum";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    return Response.json({ honorarios: honorariosDoCaso(advogado.id, id) });
  } catch (e) {
    return responderErro(e, "ler honorários");
  }
}

export async function POST(request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const corpo = await lerCorpo<DadosDosHonorarios>(request);
    return Response.json(await criarHonorariosDoCaso(advogado.id, id, corpo), { status: 201 });
  } catch (e) {
    return responderErro(e, "criar honorários");
  }
}

export async function PATCH(request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const corpo = await lerCorpo<DadosDosHonorarios>(request);
    if (corpo.etapas === undefined && corpo.pendencias === undefined && corpo.registros === undefined) throw new ErroEscritorio("Nada para alterar.");
    return Response.json(await atualizarHonorariosDoCaso(advogado.id, id, corpo));
  } catch (e) {
    return responderErro(e, "alterar honorários");
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    await removerHonorariosDoCaso(advogado.id, id);
    return Response.json({ removidos: true });
  } catch (e) {
    return responderErro(e, "remover honorários");
  }
}
