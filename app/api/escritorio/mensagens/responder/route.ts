import { ErroEscritorio, casoPorId, guardarMensagem, mensagensDo, normalizarTelefone, registrar } from "@/lib/escritorio";
import { ErroEvolution, enviarTexto } from "@/lib/evolution";
import { ErroSessao, exigirAdvogado } from "@/lib/sessao";

export const dynamic = "force-dynamic";

// O único lugar do sistema que manda mensagem ao cliente. Só roda quando o
// advogado clica em "Enviar pelo WhatsApp": envia pela Evolution, guarda a
// mensagem na conversa e anota no caso, se houver um vinculado.

function erro(e: unknown) {
  if (e instanceof ErroSessao || e instanceof ErroEscritorio || e instanceof ErroEvolution) {
    return Response.json({ erro: e.message }, { status: e.status });
  }
  console.error("responder:", e);
  return Response.json({ erro: "Não foi possível enviar a mensagem agora." }, { status: 502 });
}

export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await request.json().catch(() => null) as { contato?: unknown; texto?: unknown; casoId?: unknown } | null;
    const contato = normalizarTelefone(typeof corpo?.contato === "string" ? corpo.contato : "");
    const texto = typeof corpo?.texto === "string" ? corpo.texto.trim().slice(0, 4000) : "";
    if (!texto) throw new ErroEscritorio("Escreva a mensagem antes de enviar.");

    // O caso vem do pedido ou, se não veio, da conversa já vinculada.
    let casoId: string | null = null;
    if (typeof corpo?.casoId === "string" && corpo.casoId) {
      if (!casoPorId(advogado.id, corpo.casoId)) throw new ErroEscritorio("Caso não encontrado.", 404);
      casoId = corpo.casoId;
    } else {
      casoId = [...mensagensDo(advogado.id, { contato })].reverse().find((mensagem) => mensagem.casoId)?.casoId ?? null;
    }

    const envio = await enviarTexto(advogado.usuario, contato, texto);
    const mensagem = await guardarMensagem({
      advogadoId: advogado.id,
      instancia: envio.instancia,
      contato,
      nomeContato: null,
      texto,
      deMim: true,
      quando: envio.quando,
      casoId,
      lida: true,
      idExterno: envio.idExterno,
    });
    if (casoId) {
      const trecho = texto.length > 200 ? `${texto.slice(0, 200)}…` : texto;
      await registrar(advogado.id, casoId, "whatsapp", `Mensagem enviada pelo WhatsApp: "${trecho}"`);
    }
    return Response.json({ mensagem }, { status: 201 });
  } catch (e) { return erro(e); }
}
