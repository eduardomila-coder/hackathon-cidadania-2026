import { ErroConta, criarAdvogado, definirAtivo, definirSenha, listarAdvogados } from "@/lib/contas";

export const dynamic = "force-dynamic";

// Contas dos advogados, administradas pela equipe. O proxy já exigiu o Basic
// Auth de PAINEL_USUARIOS; aqui só se lê quem é a pessoa da equipe para
// gravar em `criadoPor`.
function quemDaEquipe(request: Request) {
  const cabecalho = request.headers.get("authorization") ?? "";
  if (!cabecalho.startsWith("Basic ")) return "equipe";
  try {
    return atob(cabecalho.slice(6)).split(":")[0]?.trim() || "equipe";
  } catch {
    return "equipe";
  }
}

function erro(e: unknown) {
  if (e instanceof ErroConta) return Response.json({ erro: e.message }, { status: e.status });
  console.error("advogados:", e);
  return Response.json({ erro: "Não foi possível concluir agora." }, { status: 500 });
}

export function GET() {
  return Response.json({ advogados: listarAdvogados() });
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null) as { nome?: string; oab?: string; usuario?: string; senha?: string } | null;
  if (!corpo) return Response.json({ erro: "Envie nome, OAB, usuário e senha." }, { status: 400 });
  try {
    const advogado = await criarAdvogado({
      nome: corpo.nome ?? "",
      oab: corpo.oab ?? "",
      usuario: corpo.usuario ?? "",
      senha: corpo.senha ?? "",
      criadoPor: quemDaEquipe(request),
    });
    return Response.json({ advogado }, { status: 201 });
  } catch (e) {
    return erro(e);
  }
}

export async function PATCH(request: Request) {
  const corpo = await request.json().catch(() => null) as { id?: string; senha?: string; ativo?: boolean } | null;
  if (!corpo?.id) return Response.json({ erro: "Informe o id do advogado." }, { status: 400 });
  if (corpo.senha === undefined && corpo.ativo === undefined) return Response.json({ erro: "Informe a nova senha ou se a conta fica ativa." }, { status: 400 });
  try {
    if (corpo.senha !== undefined) await definirSenha(corpo.id, corpo.senha);
    if (corpo.ativo !== undefined) await definirAtivo(corpo.id, Boolean(corpo.ativo));
    const advogado = listarAdvogados().find((item) => item.id === corpo.id) ?? null;
    return Response.json({ advogado });
  } catch (e) {
    return erro(e);
  }
}
