import { NextResponse } from "next/server";
import { cookieDeSaida } from "@/lib/sessao";

export const dynamic = "force-dynamic";

// Encerra a sessão: manda o navegador apagar o cookie. Não há sessão no
// servidor para invalidar, então o cookie some e pronto.
export async function POST() {
  const cookie = cookieDeSaida();
  const resposta = NextResponse.json({ pronto: true });
  resposta.cookies.set(cookie.nome, cookie.valor, cookie.opcoes);
  return resposta;
}
