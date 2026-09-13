import { midiaDaMensagem } from "@/lib/evolution";
import { mensagensDo } from "@/lib/escritorio";
import { ErroSessao, exigirAdvogado } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const MAXIMO_DE_BYTES = 5 * 1024 * 1024;

function semMidia() {
  return new Response(null, { status: 404, headers: { "Cache-Control": "private, max-age=600" } });
}

// A imagem ou figurinha de uma mensagem, buscada na Evolution na hora e
// transmitida ao navegador. A mensagem tem que ser do advogado da sessão:
// ele nunca abre mídia de conversa alheia. Só imagem passa; áudio, vídeo e
// documento continuam como marcador de texto.
export async function GET(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const mensagem = id ? mensagensDo(advogado.id).find((item) => item.id === id) : undefined;
    if (!mensagem?.idExterno || !/^\[(imagem|figurinha)\]/.test(mensagem.texto)) return semMidia();
    const midia = await midiaDaMensagem(advogado.usuario, mensagem.idExterno, MAXIMO_DE_BYTES).catch(() => null);
    if (!midia || !midia.tipo.startsWith("image/")) return semMidia();
    return new Response(new Uint8Array(midia.bytes), {
      headers: {
        "Content-Type": midia.tipo,
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof ErroSessao) return Response.json({ erro: e.message }, { status: e.status });
    console.error("mídia da mensagem:", e);
    return semMidia();
  }
}
