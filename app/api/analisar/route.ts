import { analisarRelato, type Etapa } from "@/lib/analise";
import { registrar } from "@/lib/casos";

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
