import { resumoDoEscritorio } from "@/lib/escritorio";
import { estadoDaConexao } from "@/lib/evolution";
import { exigirAdvogado } from "@/lib/sessao";
import { responderErro } from "../comum";

export const dynamic = "force-dynamic";

// Números do painel e o estado do WhatsApp do advogado. A Evolution fora do
// ar não pode derrubar o painel: vira "indisponivel".
export async function GET() {
  try {
    const advogado = await exigirAdvogado();
    let whatsapp = "indisponivel";
    try {
      whatsapp = (await estadoDaConexao(advogado.usuario)).estado;
    } catch (e) {
      console.warn("estado do WhatsApp indisponível:", e instanceof Error ? e.message : e);
    }
    return Response.json({ ...resumoDoEscritorio(advogado.id), whatsapp });
  } catch (e) {
    return responderErro(e, "resumo");
  }
}
