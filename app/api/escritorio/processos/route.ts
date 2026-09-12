import { ErroDataJud, consultarProcessoTjpr, dataJudConfigurado } from "@/lib/datajud";
import { ErroEscritorio, atualizarCaso, casoPorId, guardarProcesso, listarCasos, normalizarProcesso, processosDo, registrar } from "@/lib/escritorio";
import { ErroSessao, exigirAdvogado } from "@/lib/sessao";

export const dynamic = "force-dynamic";

// Processos acompanhados pelo advogado logado. A consulta é pontual ao DataJud
// público do CNJ (TJPR) e o resultado fica guardado só para ele, um registro
// por número: consultar de novo atualiza o andamento em vez de acumular.
// Nada aqui é intimação nem fonte de prazo; a tela avisa isso.

function erro(e: unknown) {
  if (e instanceof ErroSessao || e instanceof ErroEscritorio || e instanceof ErroDataJud) {
    return Response.json({ erro: e.message }, { status: e.status });
  }
  console.error("escritorio/processos:", e);
  return Response.json({ erro: "Não foi possível consultar o processo agora." }, { status: 500 });
}

export async function GET() {
  try {
    const advogado = await exigirAdvogado();
    return Response.json({ processos: processosDo(advogado.id), configurado: dataJudConfigurado() });
  } catch (e) {
    return erro(e);
  }
}

export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await request.json().catch(() => null) as { numero?: unknown; casoId?: unknown } | null;
    const numero = normalizarProcesso(corpo?.numero);
    if (!numero) throw new ErroEscritorio("Informe o número do processo no padrão CNJ.");

    // Caso vinculado: o que veio no pedido ou, se nada veio, o caso do
    // advogado que já tem esse número na ficha.
    const casoInformado = typeof corpo?.casoId === "string" ? corpo.casoId.trim() : "";
    const casoDoNumero = casoInformado ? null : listarCasos(advogado.id).find((caso) => caso.processo === numero) ?? null;
    const casoId = casoInformado || casoDoNumero?.id || null;
    if (casoInformado && !casoPorId(advogado.id, casoInformado)) throw new ErroEscritorio("Caso não encontrado.", 404);

    const consulta = await consultarProcessoTjpr(numero);
    if (!consulta.encontrado) {
      return Response.json({ erro: "Não achei esse número no DataJud público do TJPR. Confira os dígitos; processos em segredo de justiça não aparecem lá." }, { status: 404 });
    }

    const processo = await guardarProcesso({
      advogadoId: advogado.id,
      casoId,
      numero,
      classe: consulta.classe ?? null,
      orgao: consulta.orgao ?? null,
      ultimoMovimento: consulta.ultimoMovimento ?? null,
      dataMovimento: consulta.dataMovimento ?? null,
    });

    if (casoId) {
      const caso = casoPorId(advogado.id, casoId);
      if (caso && !caso.processo) await atualizarCaso(advogado.id, casoId, { processo: numero });
      const quando = processo.dataMovimento ? ` (${processo.dataMovimento.slice(0, 10)})` : "";
      await registrar(advogado.id, casoId, "registro", `Andamento consultado no DataJud: ${processo.ultimoMovimento ?? "sem movimentação informada"}${quando}.`);
    }

    return Response.json({ processo }, { status: 201 });
  } catch (e) {
    return erro(e);
  }
}
