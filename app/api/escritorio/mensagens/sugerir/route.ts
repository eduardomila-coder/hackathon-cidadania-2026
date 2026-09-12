import { sugerirResposta } from "@/lib/assistente";
import { ErroEscritorio, casoPorId, clientePorId, documentosDoCaso, mensagensDo, normalizarTelefone, triagensDoCaso } from "@/lib/escritorio";
import { ErroSessao, exigirAdvogado } from "@/lib/sessao";

export const dynamic = "force-dynamic";

// A IA redige um rascunho de resposta para o advogado revisar. Esta rota
// nunca envia nada: devolve o texto e a tela o coloca na caixa, editável.

function erro(e: unknown) {
  if (e instanceof ErroSessao || e instanceof ErroEscritorio) return Response.json({ erro: e.message }, { status: e.status });
  console.error("sugerir:", e);
  return Response.json({ erro: "O assistente não conseguiu redigir a resposta agora. Tente de novo em instantes." }, { status: 502 });
}

export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await request.json().catch(() => null) as { contato?: unknown; casoId?: unknown } | null;
    const contato = normalizarTelefone(typeof corpo?.contato === "string" ? corpo.contato : "");
    const mensagens = mensagensDo(advogado.id, { contato });

    // Caso do pedido ou, se não veio, o já vinculado à conversa.
    const casoPedido = typeof corpo?.casoId === "string" && corpo.casoId ? corpo.casoId : null;
    const casoId = casoPedido ?? [...mensagens].reverse().find((mensagem) => mensagem.casoId)?.casoId ?? null;
    const caso = casoId ? casoPorId(advogado.id, casoId) : null;
    if (casoPedido && !caso) throw new ErroEscritorio("Caso não encontrado.", 404);
    if (!caso && mensagens.length === 0) throw new ErroEscritorio("Ainda não há conversa com esse contato nem caso vinculado: escreva a primeira mensagem você mesmo.");

    let contexto: Parameters<typeof sugerirResposta>[0]["caso"] = null;
    if (caso) {
      const ultimaTriagem = triagensDoCaso(advogado.id, caso.id)[0] ?? null;
      contexto = {
        titulo: caso.titulo,
        resumo: caso.resumo || ultimaTriagem?.resultado.analise.resumo || undefined,
        clienteNome: caso.clienteId ? clientePorId(advogado.id, caso.clienteId)?.nome ?? null : null,
        documentosPendentes: [
          ...documentosDoCaso(advogado.id, caso.id).filter((documento) => !documento.recebido).map((documento) => documento.nome),
          ...(ultimaTriagem?.resultado.analise.documentos_necessarios ?? []),
        ].filter((nome, indice, lista) => lista.indexOf(nome) === indice).slice(0, 12),
        perguntas: (ultimaTriagem?.resultado.analise.perguntas_pendentes ?? []).slice(0, 8),
      };
    }

    const sugestao = await sugerirResposta({
      advogado: { nome: advogado.nome },
      mensagens: mensagens.slice(-30).map((mensagem) => ({ texto: mensagem.texto, deMim: mensagem.deMim, quando: mensagem.quando, nomeContato: mensagem.nomeContato })),
      caso: contexto,
    });
    return Response.json({ texto: sugestao.texto, motivo: sugestao.motivo });
  } catch (e) { return erro(e); }
}
