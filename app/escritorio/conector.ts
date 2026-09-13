// Como o escritório fala com o computador do advogado, dos dois jeitos.
//
// 1. Aberto nesta máquina (`http://127.0.0.1:3100`), o navegador chama o conector
//    direto: resposta na hora.
// 2. Aberto pelo endereço público, o navegador não alcança `127.0.0.1` — o Chrome
//    trata como rede privada e barra. Então o pedido vai para uma fila no
//    servidor e o conector, que pergunta de tempos em tempos, responde por lá.
//
// A tela não escolhe: tenta o caminho rápido e, se não houver resposta, usa a
// fila. Para quem está olhando, é o mesmo botão.

const CONECTOR_LOCAL = "http://127.0.0.1:8766";
const ESPERA_LOCAL_MS = 1500;
const ESPERA_FILA_MS = 90_000;

export type Caminho = "local" | "fila";

async function tentarLocal(caminho: string, corpo?: unknown): Promise<unknown | null> {
  const desistir = AbortSignal.timeout(ESPERA_LOCAL_MS);
  try {
    const resposta = await fetch(`${CONECTOR_LOCAL}${caminho}`, {
      method: corpo === undefined ? "GET" : "POST",
      headers: corpo === undefined ? undefined : { "content-type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: desistir,
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error((dados as { erro?: string }).erro ?? "O conector recusou.");
    return dados;
  } catch {
    // Sem conector nesta máquina (ou bloqueado pelo navegador): segue pela fila.
    return null;
  }
}

async function pelaFila(tipo: string, dados: Record<string, unknown>, esperaMs: number): Promise<unknown> {
  const criado = await fetch("/api/escritorio/conector", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tipo, dados }),
  });
  const { id, erro } = await criado.json() as { id?: string; erro?: string };
  if (!criado.ok || !id) throw new Error(erro ?? "Não deu para pedir ao seu computador.");

  const limite = Date.now() + esperaMs;
  while (Date.now() < limite) {
    await new Promise((seguir) => setTimeout(seguir, 1200));
    const resposta = await fetch(`/api/escritorio/conector?pedido=${id}`, { cache: "no-store" });
    const estado = await resposta.json() as { estado?: string; resultado?: unknown; erro?: string };
    if (estado.estado === "respondido") return estado.resultado;
    if (estado.estado === "erro") throw new Error(estado.erro ?? "O seu computador recusou o pedido.");
  }
  throw new Error("O conector não respondeu. Confira se ele está rodando no seu computador.");
}

/** Faz o pedido pelo caminho que estiver disponível e diz por onde foi. */
export async function pedirAoConector(
  tipo: "certificados" | "assinar" | "projudi-saude" | "projudi-entrar" | "projudi-carteira" | "projudi-processo",
  dados: Record<string, unknown> = {},
  // Quanto esperar pelo conector. O padrão serve para uma ação que a pessoa
  // pediu e está olhando; para saber se o conector existe, passe pouco, senão a
  // tela fica parada à toa.
  esperaMs: number = ESPERA_FILA_MS,
): Promise<{ resultado: unknown; caminho: Caminho }> {
  const local = await (async () => {
    switch (tipo) {
      case "certificados": return tentarLocal("/certificados");
      case "assinar": return tentarLocal("/assinar", dados);
      default: return null; // PROJUDI só pela fila: quem fala com o serviço é o conector
    }
  })();
  if (local !== null) return { resultado: local, caminho: "local" };
  return { resultado: await pelaFila(tipo, dados, esperaMs), caminho: "fila" };
}

/** Estado do pareamento: se existe chave e quando o conector falou pela última vez. */
export async function estadoDoConector(): Promise<{ criadoEm: string; ultimoContato: string | null } | null> {
  const resposta = await fetch("/api/escritorio/conector", { cache: "no-store" });
  if (!resposta.ok) return null;
  const { conector } = await resposta.json() as { conector: { criadoEm: string; ultimoContato: string | null } | null };
  return conector;
}

export async function gerarChave(): Promise<string> {
  const resposta = await fetch("/api/escritorio/conector", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ acao: "chave" }),
  });
  const { chave, erro } = await resposta.json() as { chave?: string; erro?: string };
  if (!resposta.ok || !chave) throw new Error(erro ?? "Não deu para gerar a chave.");
  return chave;
}
