import { ErroEscritorio, normalizarTelefone } from "@/lib/escritorio";
import { atenderComoEstagiario, configDaConversa, sugestaoPendente } from "@/lib/estagiario";
import { ErroSessao, exigirAdvogado } from "@/lib/sessao";

export const dynamic = "force-dynamic";

// Roda o estagiário nesta conversa agora, sem esperar o cliente escrever. Serve
// para o advogado ver o que ele faria antes de ligar o atendimento automático,
// e para a conferência do módulo na auditoria.

function erro(e: unknown) {
  if (e instanceof ErroSessao || e instanceof ErroEscritorio) return Response.json({ erro: e.message }, { status: e.status });
  console.error("estagiario atender:", e);
  return Response.json({ erro: "O estagiário não conseguiu atender agora." }, { status: 502 });
}

export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await request.json().catch(() => null) as { contato?: unknown; soSimular?: unknown } | null;
    const contato = normalizarTelefone(typeof corpo?.contato === "string" ? corpo.contato : "");
    if (!contato) throw new ErroEscritorio("Conversa sem contato.");

    // Simulação: roda mesmo com o estagiário desligado e nunca envia nada. O
    // atendimento de verdade, pelo webhook, continua exigindo estar ligado e
    // respeitando o envio automático.
    const config = configDaConversa(advogado.id, contato);
    const ligado = config.ativo;
    const resultado = await atenderComoEstagiario(advogado, contato, { simular: true });
    return Response.json({
      resultado,
      ligado,
      sugestao: sugestaoPendente(advogado.id, contato),
    });
  } catch (e) { return erro(e); }
}
