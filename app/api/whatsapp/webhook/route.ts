import { resumoDoEvento, webhookAutorizado } from "@/lib/evolution";

// Esta rota é pública para a Evolution, mas só aceita o segredo configurado no
// servidor. Ela não grava a conversa nem dispara resposta automática: primeiro
// chega à fila humana, e o advogado decide quando usar a triagem.
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!webhookAutorizado(token)) return Response.json({ erro: "Webhook não autorizado." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  if (!payload) return Response.json({ erro: "Evento inválido." }, { status: 400 });

  const resumo = resumoDoEvento(payload);
  return Response.json({ recebido: true, acao: resumo.recebida ? "aguardar_revisao_humana" : "ignorado", ...resumo }, { status: 202 });
}
