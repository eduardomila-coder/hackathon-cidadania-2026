import { anotarDesfecho, eficiencia, listar, type Desfecho } from "@/lib/casos";

const DESFECHOS: Desfecho[] = ["ganho", "acordo", "perdido", "desistiu"];

export async function GET() {
  return Response.json({ eficiencia: eficiencia(), casos: listar() });
}

// O advogado anota no que deu o caso que passou pela triagem.
export async function POST(request: Request) {
  const { id, desfecho } = (await request.json()) as { id?: string; desfecho?: string };
  if (!id || !DESFECHOS.includes(desfecho as Desfecho)) {
    return Response.json({ erro: "Informe o caso e um desfecho válido." }, { status: 400 });
  }
  if (!anotarDesfecho(id, desfecho as Desfecho)) {
    return Response.json({ erro: "Não encontrei esse caso." }, { status: 404 });
  }
  return Response.json({ eficiencia: eficiencia() });
}
