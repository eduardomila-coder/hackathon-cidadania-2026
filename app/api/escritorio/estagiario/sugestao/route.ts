import { enviarTexto } from "@/lib/evolution";
import { ErroEscritorio, guardarMensagem, mensagensDo, registrar } from "@/lib/escritorio";
import { fecharSugestao, sugestaoPendente } from "@/lib/estagiario";
import { agora } from "@/lib/banco";
import { ErroSessao, exigirAdvogado } from "@/lib/sessao";

export const dynamic = "force-dynamic";

// O que fazer com a resposta que o estagiário preparou: enviar (o advogado
// assumiu o texto e clicou) ou descartar. O envio é sempre por clique aqui,
// mesmo quando o estagiário está no modo automático.

function erro(e: unknown) {
  if (e instanceof ErroSessao || e instanceof ErroEscritorio) return Response.json({ erro: e.message }, { status: e.status });
  console.error("estagiario sugestao:", e);
  return Response.json({ erro: "Não foi possível concluir agora." }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await request.json().catch(() => null) as { id?: unknown; acao?: unknown; texto?: unknown } | null;
    const id = typeof corpo?.id === "string" ? corpo.id : "";
    const acao = corpo?.acao === "enviar" ? "enviar" : corpo?.acao === "descartar" ? "descartar" : null;
    if (!id || !acao) throw new ErroEscritorio("Pedido inválido para a sugestão do estagiário.");

    const sugestao = await fecharSugestao(advogado.id, id, acao === "enviar" ? "enviada" : "descartada");
    if (acao === "descartar") return Response.json({ sugestao, enviada: false });

    // O advogado pode ter ajustado o texto antes de enviar.
    const texto = (typeof corpo?.texto === "string" && corpo.texto.trim() ? corpo.texto : sugestao.texto).trim().slice(0, 4000);
    await enviarTexto(advogado.usuario, sugestao.contato, texto);
    await guardarMensagem({
      advogadoId: advogado.id,
      instancia: `ponto-dativo-${advogado.usuario.replace(/\./g, "-")}`,
      contato: sugestao.contato,
      nomeContato: mensagensDo(advogado.id, { contato: sugestao.contato })[0]?.nomeContato ?? null,
      texto,
      deMim: true,
      quando: agora(),
      casoId: sugestao.casoId,
      lida: true,
      idExterno: null,
      doEstagiario: true,
    });
    if (sugestao.casoId) await registrar(advogado.id, sugestao.casoId, "assistente", `O advogado enviou a resposta preparada pelo estagiário virtual: ${texto}`);
    return Response.json({ sugestao: { ...sugestao, texto }, enviada: true, sugestaoPendente: sugestaoPendente(advogado.id, sugestao.contato) });
  } catch (e) { return erro(e); }
}
