import { analisarRelato, type Etapa } from "@/lib/analise";
import { registrar } from "@/lib/casos";
import type { ImagemDocumento } from "@/lib/claude";

// Resposta em NDJSON: uma linha {"etapa": ...} a cada passo e, por fim,
// {"resultado": ...} ou {"erro": ...}. A tela mostra o progresso real.
export async function POST(request: Request) {
  const tipoConteudo = request.headers.get("content-type") ?? "";
  let relato: string | undefined;
  let imagem: ImagemDocumento | undefined;

  if (tipoConteudo.includes("multipart/form-data")) {
    const dados = await request.formData();
    relato = dados.get("relato")?.toString();
    const arquivo = dados.get("documento");
    if (arquivo instanceof File) {
      const tipos = ["image/jpeg", "image/png", "image/webp"] as const;
      if (!tipos.includes(arquivo.type as typeof tipos[number])) {
        return Response.json({ erro: "Envie uma foto em JPG, PNG ou WebP." }, { status: 400 });
      }
      if (arquivo.size > 5 * 1024 * 1024) {
        return Response.json({ erro: "A foto deve ter no máximo 5 MB." }, { status: 400 });
      }
      imagem = {
        mime: arquivo.type as ImagemDocumento["mime"],
        dadosBase64: Buffer.from(await arquivo.arrayBuffer()).toString("base64"),
      };
    }
  } else {
    ({ relato } = (await request.json()) as { relato?: string });
  }
  if (!relato || relato.trim().length < 10) {
    return Response.json({ erro: "Conte o que aconteceu com um pouco mais de detalhe." }, { status: 400 });
  }

  const codificador = new TextEncoder();
  const stream = new ReadableStream({
    async start(controlador) {
      const enviar = (obj: unknown) => controlador.enqueue(codificador.encode(JSON.stringify(obj) + "\n"));
      try {
        const resultado = await analisarRelato(relato, (etapa: Etapa) => enviar({ etapa }), imagem);
        // A medição não pode derrubar a triagem: se o registro falhar, o
        // advogado ainda recebe o dossiê.
        let caso = null;
        try {
          caso = registrar(resultado);
        } catch (e) {
          console.error("não registrei o caso:", e);
        }
        enviar({ resultado, caso });
      } catch (e) {
        console.error(e);
        enviar({ erro: "Não consegui analisar agora. Tente de novo." });
      } finally {
        controlador.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8" } });
}
