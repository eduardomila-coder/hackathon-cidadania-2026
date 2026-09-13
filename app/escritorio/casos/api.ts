// Chamada às rotas do escritório a partir do navegador. Toda resposta de
// erro vem como `{ erro }`; sessão vencida manda de volta para /entrar.

export class ErroDaApi extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function chamar<T>(url: string, opcoes: { metodo?: "GET" | "POST" | "PATCH"; corpo?: unknown } = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: opcoes.metodo ?? "GET",
      headers: opcoes.corpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      cache: "no-store",
    });
  } catch {
    throw new ErroDaApi("Sem conexão com o servidor. Tente de novo.", 0);
  }
  const dados = await resposta.json().catch(() => null) as { erro?: unknown } | null;
  if (resposta.status === 401) {
    // Recarga de verdade, e não navegação do cliente, de propósito: a sessão
    // venceu no meio de uma ação e o layout do escritório é renderizado no
    // servidor, com o cookie novo.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/entrar?voltar=${encodeURIComponent(window.location.pathname)}`);
    throw new ErroDaApi("Sua sessão venceu. Entre de novo.", 401);
  }
  if (!resposta.ok) {
    const mensagem = dados && typeof dados.erro === "string" && dados.erro ? dados.erro : "Não foi possível concluir agora. Tente de novo.";
    throw new ErroDaApi(mensagem, resposta.status);
  }
  return dados as T;
}

export function mensagemDeErro(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Não foi possível concluir agora. Tente de novo.";
}
