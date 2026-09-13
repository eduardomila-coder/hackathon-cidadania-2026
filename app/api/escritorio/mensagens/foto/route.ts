import { fotoDePerfil } from "@/lib/evolution";
import { mensagensDo } from "@/lib/escritorio";
import { ErroSessao, exigirAdvogado } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const MAXIMO_DE_BYTES = 2 * 1024 * 1024;

function semFoto() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "private, max-age=21600" } });
}

// A foto sai do CDN do WhatsApp pelo servidor, não como uma URL temporária no
// navegador. A sessão e a conversa pertencente ao advogado são exigidas antes
// de qualquer busca, para um advogado nunca abrir a foto de outro contato.
export async function GET(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const contato = new URL(request.url).searchParams.get("contato")?.replace(/\D/g, "") ?? "";
    if (!contato || !mensagensDo(advogado.id, { contato }).length) return new Response(null, { status: 404 });
    const url = await fotoDePerfil(advogado.usuario, contato).catch(() => null);
    if (!url) return semFoto();

    const resposta = await fetch(url, { cache: "no-store", redirect: "error" }).catch(() => null);
    if (!resposta?.ok) return semFoto();
    const tipo = resposta.headers.get("content-type")?.split(";", 1)[0] ?? "";
    const tamanho = Number(resposta.headers.get("content-length") ?? "0");
    if (!tipo.startsWith("image/") || (Number.isFinite(tamanho) && tamanho > MAXIMO_DE_BYTES)) return semFoto();
    const bytes = await resposta.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAXIMO_DE_BYTES) return semFoto();
    return new Response(bytes, {
      headers: {
        "Content-Type": tipo,
        "Cache-Control": "private, max-age=21600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof ErroSessao) return Response.json({ erro: e.message }, { status: e.status });
    console.error("foto de perfil:", e);
    return semFoto();
  }
}
