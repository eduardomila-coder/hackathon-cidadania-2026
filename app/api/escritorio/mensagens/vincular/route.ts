import { ErroEscritorio, atualizarCaso, casoPorId, clientePorTelefone, criarCaso, criarCliente, mensagensDo, normalizarTelefone, registrar, vincularMensagens, type Caso } from "@/lib/escritorio";
import { ErroSessao, exigirAdvogado } from "@/lib/sessao";

export const dynamic = "force-dynamic";

// Liga uma conversa do WhatsApp a um caso: existente (`casoId`) ou novo
// (`novoCaso.titulo`). Se o telefone ainda não é de nenhum cliente do
// advogado, cria o cliente com o nome que veio do WhatsApp.

function erro(e: unknown) {
  if (e instanceof ErroSessao || e instanceof ErroEscritorio) return Response.json({ erro: e.message }, { status: e.status });
  console.error("vincular:", e);
  return Response.json({ erro: "Não foi possível vincular a conversa agora." }, { status: 500 });
}

function formatarTelefone(numero: string) {
  const partes = numero.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return partes ? `+55 (${partes[1]}) ${partes[2]}-${partes[3]}` : numero;
}

export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await request.json().catch(() => null) as { contato?: unknown; casoId?: unknown; novoCaso?: { titulo?: unknown } | null } | null;
    const contato = normalizarTelefone(typeof corpo?.contato === "string" ? corpo.contato : "");
    const casoId = typeof corpo?.casoId === "string" && corpo.casoId ? corpo.casoId : null;
    const tituloNovo = typeof corpo?.novoCaso?.titulo === "string" ? corpo.novoCaso.titulo.trim() : "";
    if (!casoId && !tituloNovo) throw new ErroEscritorio("Escolha um caso ou dê um título ao caso novo.");

    const mensagens = mensagensDo(advogado.id, { contato });
    const nomeDoWhatsApp = [...mensagens].reverse().find((mensagem) => mensagem.nomeContato)?.nomeContato ?? null;

    // O cliente com esse telefone, criado agora se ainda não existe.
    let cliente = clientePorTelefone(advogado.id, contato);
    if (!cliente) {
      cliente = await criarCliente(advogado.id, {
        nome: nomeDoWhatsApp ?? formatarTelefone(contato),
        telefone: contato,
        observacoes: nomeDoWhatsApp ? "Cliente criado a partir da conversa do WhatsApp; confira o nome." : "Cliente criado a partir da conversa do WhatsApp; nome ainda não informado.",
      });
    }

    let caso: Caso;
    if (casoId) {
      const existente = casoPorId(advogado.id, casoId);
      if (!existente) throw new ErroEscritorio("Caso não encontrado.", 404);
      // Caso sem cliente ganha este; caso com outro cliente fica como está.
      caso = existente.clienteId ? existente : await atualizarCaso(advogado.id, casoId, { clienteId: cliente.id });
    } else {
      caso = await criarCaso(advogado.id, { titulo: tituloNovo, origem: "particular", clienteId: cliente.id });
    }

    const vinculadas = await vincularMensagens(advogado.id, contato, caso.id);
    await registrar(advogado.id, caso.id, "whatsapp", `Conversa do WhatsApp com ${cliente.nome} (${formatarTelefone(contato)}) vinculada ao caso.`);
    return Response.json({ caso, cliente, vinculadas }, { status: casoId ? 200 : 201 });
  } catch (e) { return erro(e); }
}
