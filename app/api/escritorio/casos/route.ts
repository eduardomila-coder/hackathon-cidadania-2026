import { clientePorTelefone, criarCaso, criarCliente, listarCasosComDetalhes, SITUACOES, type Origem, type Situacao } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { lerCorpo, responderErro } from "../comum";

export const dynamic = "force-dynamic";

type CorpoDoNovoCaso = {
  titulo: string;
  origem: Origem;
  clienteId: string | null;
  cliente: { nome: string; telefone: string; email?: string | null };
  processo: string | null;
  orgao: string | null;
  ato: string | null;
  prazo: string | null;
  relato: string;
  resumo: string;
};

// GET /api/escritorio/casos?situacao= → os casos do advogado, com cliente e
// último registro embutidos, do mais recente ao mais antigo.
export async function GET(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const situacao = new URL(request.url).searchParams.get("situacao");
    const filtro = situacao && SITUACOES.includes(situacao as Situacao) ? { situacao: situacao as Situacao } : {};
    return Response.json(listarCasosComDetalhes(advogado.id, filtro));
  } catch (e) {
    return responderErro(e, "listar casos");
  }
}

// POST /api/escritorio/casos → abre o caso; se o cliente veio inline, cria
// (ou reaproveita o que já existe com o mesmo telefone).
export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await lerCorpo<CorpoDoNovoCaso>(request);

    let clienteId = typeof corpo.clienteId === "string" && corpo.clienteId ? corpo.clienteId : null;
    if (!clienteId && corpo.cliente && typeof corpo.cliente === "object" && (corpo.cliente.nome || corpo.cliente.telefone)) {
      const existente = corpo.cliente.telefone ? clientePorTelefone(advogado.id, corpo.cliente.telefone) : null;
      const cliente = existente ?? await criarCliente(advogado.id, { nome: corpo.cliente.nome ?? "", telefone: corpo.cliente.telefone ?? "", email: corpo.cliente.email ?? null });
      clienteId = cliente.id;
    }

    const caso = await criarCaso(advogado.id, {
      titulo: corpo.titulo ?? "",
      origem: corpo.origem,
      clienteId,
      processo: corpo.processo ?? null,
      orgao: corpo.orgao ?? null,
      ato: corpo.ato ?? null,
      prazo: corpo.prazo ?? null,
      relato: corpo.relato ?? "",
      resumo: corpo.resumo ?? "",
    });
    return Response.json(caso, { status: 201 });
  } catch (e) {
    return responderErro(e, "criar caso");
  }
}
