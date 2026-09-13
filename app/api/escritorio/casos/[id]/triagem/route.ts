import { analisarRelato } from "@/lib/analise";
import { registrar as registrarMedida } from "@/lib/casos";
import { casoPorId, ErroEscritorio, guardarTriagem, mensagensDo, registrar } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { responderErro } from "../../../comum";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

const MENSAGENS_NA_TRIAGEM = 20;

function quandoCurto(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// POST /api/escritorio/casos/[id]/triagem → roda a cadeia de análise com o
// relato do caso, mais as anotações do advogado e as últimas mensagens do
// cliente pelo WhatsApp como informação complementar. Guarda a triagem e
// deixa o registro na linha do tempo. Não envia nada a ninguém.
export async function POST(_request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id } = await params;
    const caso = casoPorId(advogado.id, id);
    if (!caso) throw new ErroEscritorio("Caso não encontrado.", 404);
    if (caso.relato.trim().length < 10) throw new ErroEscritorio("Escreva o relato do cliente antes de triar.");

    const partes = [caso.relato.trim()];
    if (caso.notas.trim()) partes.push(`Anotações do advogado sobre o caso:\n"""\n${caso.notas.trim()}\n"""`);
    const doCliente = mensagensDo(advogado.id, { casoId: caso.id }).filter((mensagem) => !mensagem.deMim && mensagem.texto.trim()).slice(-MENSAGENS_NA_TRIAGEM);
    if (doCliente.length > 0) {
      partes.push(`Informações complementares (mensagens do cliente pelo WhatsApp):\n"""\n${doCliente.map((mensagem) => `[${quandoCurto(mensagem.quando)}] ${mensagem.texto.trim()}`).join("\n")}\n"""`);
    }

    let resultado;
    try {
      resultado = await analisarRelato(partes.join("\n\n"));
    } catch (e) {
      console.error("triagem do caso:", e);
      return Response.json({ erro: "O assistente não conseguiu triar agora. Confira a conexão com o modelo e tente de novo." }, { status: 502 });
    }

    const triagem = await guardarTriagem(advogado.id, caso.id, resultado);
    const { forca, analise } = resultado;
    await registrar(advogado.id, caso.id, "assistente", `Triagem com fontes: ${forca.comprovados} de ${forca.aplicaveis} requisitos comprovados. ${analise.resumo}`);
    // A medição do projeto guarda só números; se falhar, a triagem já está salva.
    try { registrarMedida(resultado); } catch (e) { console.error("não registrei a medida da triagem:", e); }

    return Response.json(triagem, { status: 201 });
  } catch (e) {
    return responderErro(e, "triagem");
  }
}
