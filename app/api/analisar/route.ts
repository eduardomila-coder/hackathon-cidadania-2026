import { analisarRelato } from "@/lib/claude";

export async function POST(request: Request) {
  const { relato } = (await request.json()) as { relato?: string };
  if (!relato || relato.trim().length < 10) {
    return Response.json({ erro: "Conte o que aconteceu com um pouco mais de detalhe." }, { status: 400 });
  }
  try {
    const analise = await analisarRelato(relato);
    return Response.json(analise);
  } catch (e) {
    console.error(e);
    return Response.json({ erro: "Não consegui analisar agora. Tente de novo." }, { status: 500 });
  }
}
