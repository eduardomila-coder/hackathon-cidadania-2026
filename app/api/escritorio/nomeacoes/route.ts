import { criarNomeacao, listarNomeacoes, type DadosDaNomeacao, ESTADOS_DA_NOMEACAO, type EstadoDaNomeacao } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { lerCorpo, responderErro } from "../comum";

export const dynamic = "force-dynamic";

// GET /api/escritorio/nomeacoes?estado=aberta|arquivada
export async function GET(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const estado = new URL(request.url).searchParams.get("estado");
    const filtro = estado && ESTADOS_DA_NOMEACAO.includes(estado as EstadoDaNomeacao) ? { estado: estado as EstadoDaNomeacao } : {};
    return Response.json(listarNomeacoes(advogado.id, filtro));
  } catch (e) {
    return responderErro(e, "listar nomeações");
  }
}

// POST /api/escritorio/nomeacoes cria o registro sem abrir caso automaticamente.
export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await lerCorpo<DadosDaNomeacao>(request);
    return Response.json(await criarNomeacao(advogado.id, corpo as DadosDaNomeacao), { status: 201 });
  } catch (e) {
    return responderErro(e, "criar nomeação");
  }
}
