import { atualizarCliente, criarCliente, ErroEscritorio, listarClientes } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { lerCorpo, responderErro } from "../comum";

export const dynamic = "force-dynamic";

type CorpoDoCliente = { id: string; nome: string; telefone: string; email: string | null; observacoes: string };

export async function GET() {
  try {
    const advogado = await exigirAdvogado();
    return Response.json(listarClientes(advogado.id));
  } catch (e) {
    return responderErro(e, "listar clientes");
  }
}

export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await lerCorpo<CorpoDoCliente>(request);
    const cliente = await criarCliente(advogado.id, { nome: corpo.nome ?? "", telefone: corpo.telefone ?? "", email: corpo.email ?? null, observacoes: corpo.observacoes });
    return Response.json(cliente, { status: 201 });
  } catch (e) {
    return responderErro(e, "criar cliente");
  }
}

export async function PATCH(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await lerCorpo<CorpoDoCliente>(request);
    if (typeof corpo.id !== "string" || !corpo.id) throw new ErroEscritorio("Informe qual cliente alterar.");
    const { id, ...campos } = corpo;
    return Response.json(await atualizarCliente(advogado.id, id, campos));
  } catch (e) {
    return responderErro(e, "alterar cliente");
  }
}
