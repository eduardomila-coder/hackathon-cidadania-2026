import { ErroConta } from "@/lib/contas";
import { ErroDataJud } from "@/lib/datajud";
import { ErroEscritorio } from "@/lib/escritorio";
import { ErroEvolution } from "@/lib/evolution";
import { ErroSessao } from "@/lib/sessao";

// O que toda rota do escritório repete: ler o corpo em JSON sem derrubar a
// rota quando vem lixo, e transformar os erros conhecidos em resposta
// `{ erro }` com o status certo. Erro desconhecido vira 500 com mensagem
// genérica e vai para o console, nunca para a tela.

export async function lerCorpo<T extends object>(request: Request): Promise<Partial<T>> {
  const corpo = await request.json().catch(() => null) as unknown;
  return corpo && typeof corpo === "object" && !Array.isArray(corpo) ? corpo as Partial<T> : {};
}

export function responderErro(e: unknown, contexto: string): Response {
  if (e instanceof ErroSessao || e instanceof ErroEscritorio || e instanceof ErroConta || e instanceof ErroDataJud || e instanceof ErroEvolution) {
    return Response.json({ erro: e.message }, { status: e.status });
  }
  console.error(`${contexto}:`, e);
  return Response.json({ erro: "Não foi possível concluir agora. Tente de novo." }, { status: 500 });
}

// Só os campos de `Caso` que o advogado edita pela tela.
export const CAMPOS_EDITAVEIS_DO_CASO = ["titulo", "origem", "situacao", "clienteId", "processo", "orgao", "ato", "prazo", "resumo", "relato", "notas", "fundamentos"] as const;
