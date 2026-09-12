import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { NOME_DO_COOKIE, advogadoDaSessao } from "@/lib/sessao";

// Dois portões, um para cada público:
//
// - A equipe do hackathon entra no painel e nas APIs da equipe com Basic Auth
//   (usuários em PAINEL_USUARIOS). É por aqui que se criam as contas.
// - O advogado entra no escritório com o cookie de sessão emitido em
//   POST /api/entrar. Página sem sessão vai para /entrar; API sem sessão
//   recebe 401 em JSON.
//
// Aqui só se confere assinatura e validade do cookie; quem confirma que a
// conta existe e está ativa é a rota ou o layout, com `advogadoAtual()`.
// O webhook do WhatsApp fica fora dos dois portões: a Evolution o chama
// direto e ele valida o próprio segredo.

const ROTAS_DA_EQUIPE = ["/painel", "/api/tarefas", "/api/advogados"];
const PAGINAS_DO_ESCRITORIO = ["/escritorio"];

function comeca(caminho: string, prefixos: string[]) {
  return prefixos.some((prefixo) => caminho === prefixo || caminho.startsWith(`${prefixo}/`));
}

function equipeAutorizada(request: NextRequest) {
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
  const caminho = request.nextUrl.pathname;

  if (comeca(caminho, ROTAS_DA_EQUIPE)) {
    if (equipeAutorizada(request)) return NextResponse.next();
    return new NextResponse("Acesso restrito ao painel da equipe.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Painel Habeas Titas", charset="UTF-8"' },
    });
  }

  const sessao = advogadoDaSessao(request.cookies.get(NOME_DO_COOKIE)?.value);
  if (sessao) return NextResponse.next();

  if (comeca(caminho, PAGINAS_DO_ESCRITORIO)) {
    const destino = new URL("/entrar", request.url);
    destino.searchParams.set("voltar", `${caminho}${request.nextUrl.search}`);
    return NextResponse.redirect(destino, 302);
  }

  return NextResponse.json({ erro: "Entre com seu usuário e senha para continuar." }, { status: 401 });
}

export const config = {
  matcher: [
    "/painel/:path*",
    "/api/tarefas",
    "/api/advogados",
    "/escritorio/:path*",
    "/api/escritorio/:path*",
    "/api/whatsapp/conexao",
    "/api/processos",
  ],
};
