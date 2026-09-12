import { analisarRelato, type Etapa } from "@/lib/analise";

// Resposta em NDJSON: uma linha {"etapa": ...} a cada passo e, por fim,
// {"resultado": ...} ou {"erro": ...}. A tela mostra o progresso real.
export async function POST(request: Request) {
  const { relato } = (await request.json()) as { relato?: string };
  if (!relato || relato.trim().length < 10) {
    return Response.json({ erro: "Conte o que aconteceu com um pouco mais de detalhe." }, { status: 400 });
  }

  const codificador = new TextEncoder();
  const stream = new ReadableStream({
    async start(controlador) {
      const enviar = (obj: unknown) => controlador.enqueue(codificador.encode(JSON.stringify(obj) + "\n"));
      try {
        const resultado = await analisarRelato(relato, (etapa: Etapa) => enviar({ etapa }));
        enviar({ resultado });
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
