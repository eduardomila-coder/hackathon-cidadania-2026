import { NextResponse } from "next/server";
import { autenticar } from "@/lib/contas";
import { criarCookieDeSessao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const ESPERA_EM_ERRO_MS = 300;
const MENSAGEM_DE_ERRO = "Usuário ou senha incorretos.";

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

// Login do advogado. A resposta de erro é sempre a mesma e sempre demora um
// pouco, para não ajudar quem tenta adivinhar usuário ou senha.
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null) as { usuario?: unknown; senha?: unknown } | null;
  const usuario = typeof corpo?.usuario === "string" ? corpo.usuario : "";
  const senha = typeof corpo?.senha === "string" ? corpo.senha : "";

  const advogado = usuario && senha ? autenticar(usuario, senha) : null;
  if (!advogado) {
    await esperar(ESPERA_EM_ERRO_MS);
    return NextResponse.json({ erro: MENSAGEM_DE_ERRO }, { status: 401 });
  }

  const cookie = criarCookieDeSessao(advogado.id);
  const resposta = NextResponse.json({ advogado });
  resposta.cookies.set(cookie.nome, cookie.valor, cookie.opcoes);
  return resposta;
}
