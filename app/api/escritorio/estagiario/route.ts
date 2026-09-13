import { estadoDaConexao } from "@/lib/evolution";
import { ErroEscritorio, normalizarTelefone } from "@/lib/escritorio";
import { CONFIANCAS, atualizarConfig, configDaConversa, sugestaoPendente } from "@/lib/estagiario";
import { ErroSessao, exigirAdvogado } from "@/lib/sessao";

export const dynamic = "force-dynamic";

// Estagiário virtual da conversa: ligar, desligar e escolher como ele responde.
// A configuração é por conversa, como o robô da Mila; nada aqui envia mensagem.

function erro(e: unknown) {
  if (e instanceof ErroSessao || e instanceof ErroEscritorio) return Response.json({ erro: e.message }, { status: e.status });
  console.error("estagiario:", e);
  return Response.json({ erro: "Não foi possível falar com o estagiário agora." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const contato = normalizarTelefone(new URL(request.url).searchParams.get("contato") ?? "");
    if (!contato) throw new ErroEscritorio("Conversa sem contato.");
    const config = configDaConversa(advogado.id, contato);
    // Sem WhatsApp conectado o envio automático não sai. A tela avisa antes de
    // o advogado ligar o estagiário achando que ele vai falar sozinho.
    const conexao = await estadoDaConexao(advogado.usuario).catch(() => ({ estado: "indisponivel" }));
    return Response.json({
      config,
      sugestao: sugestaoPendente(advogado.id, contato),
      confiancas: CONFIANCAS,
      whatsapp: conexao.estado,
    });
  } catch (e) { return erro(e); }
}

export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await request.json().catch(() => null) as {
      contato?: unknown; ativo?: unknown; autoEnviar?: unknown; confiancaMinima?: unknown;
      instrucao?: unknown; avisarQueEDeMaquina?: unknown;
    } | null;
    const contato = normalizarTelefone(typeof corpo?.contato === "string" ? corpo.contato : "");
    if (!contato) throw new ErroEscritorio("Conversa sem contato.");

    const config = await atualizarConfig(advogado.id, contato, {
      ...(typeof corpo?.ativo === "boolean" ? { ativo: corpo.ativo } : {}),
      ...(typeof corpo?.autoEnviar === "boolean" ? { autoEnviar: corpo.autoEnviar } : {}),
      ...(typeof corpo?.confiancaMinima === "number" ? { confiancaMinima: corpo.confiancaMinima } : {}),
      ...(typeof corpo?.instrucao === "string" ? { instrucao: corpo.instrucao } : {}),
      ...(typeof corpo?.avisarQueEDeMaquina === "boolean" ? { avisarQueEDeMaquina: corpo.avisarQueEDeMaquina } : {}),
    }, advogado.usuario);

    const conexao = await estadoDaConexao(advogado.usuario).catch(() => ({ estado: "indisponivel" }));
    return Response.json({ config, sugestao: sugestaoPendente(advogado.id, contato), confiancas: CONFIANCAS, whatsapp: conexao.estado });
  } catch (e) { return erro(e); }
}
