import { consultarProcessoTjpr } from "@/lib/datajud";
import { casoPorId, ErroEscritorio, guardarProcesso, registrar } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { responderErro } from "../../../comum";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

// POST /api/escritorio/casos/[id]/processo → consulta pública do DataJud
// (TJPR) com o número da ficha e guarda o último andamento. É consulta
// pontual: não vale como intimação nem conta prazo.
export async function POST(_request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const caso = casoPorId(advogado.id, id);
    if (!caso) throw new ErroEscritorio("Caso não encontrado.", 404);
    if (!caso.processo) throw new ErroEscritorio("Informe o número do processo na ficha antes de consultar.");

    const consulta = await consultarProcessoTjpr(caso.processo);
    if (!consulta.encontrado) throw new ErroEscritorio("O DataJud não encontrou esse número no TJPR. Confira os dígitos na ficha.", 404);

    const processo = await guardarProcesso({
      advogadoId: advogado.id,
      casoId: caso.id,
      numero: consulta.numero,
      classe: consulta.classe ?? null,
      orgao: consulta.orgao ?? null,
      ultimoMovimento: consulta.ultimoMovimento ?? null,
      dataMovimento: consulta.dataMovimento ?? null,
    });
    await registrar(advogado.id, caso.id, "registro", `Consulta ao TJPR: ${consulta.ultimoMovimento}`);
    return Response.json(processo);
  } catch (e) {
    return responderErro(e, "consultar processo");
  }
}
