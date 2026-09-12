import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function autorizado(request: NextRequest) {
  const cabecalho = request.headers.get("authorization");
  if (!cabecalho?.startsWith("Basic ")) return false;

  try {
    const credenciais = atob(cabecalho.slice(6));
    const separador = credenciais.indexOf(":");
    if (separador < 1) return false;
    const usuario = credenciais.slice(0, separador);
    const senha = credenciais.slice(separador + 1);
    const configurados = (process.env.PAINEL_USUARIOS ?? "")
      .split(";")
      .map((item) => item.split("="))
      .filter(([nome, valor]) => nome && valor);
    return configurados.some(([nome, valor]) => nome === usuario && valor === senha);
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  if (autorizado(request)) return NextResponse.next();

  return new NextResponse("Acesso restrito ao painel da equipe.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Painel Habeas Titas", charset="UTF-8"' },
  });
}

// O escritório e a configuração do WhatsApp não podem ficar públicos. O
// webhook é deixado fora do Basic Auth porque a Evolution o chama diretamente
// e ele já valida um segredo exclusivo no servidor.
export const config = { matcher: ["/painel/:path*", "/api/tarefas", "/escritorio/:path*", "/api/whatsapp/conexao", "/api/processos"] };
