import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { ARQUIVO, marcarLinha } from "@/lib/tarefas";

// Clique na caixinha do painel: troca o [ ]/[x] em docs/TAREFAS.md, commita e
// publica em main. O servidor compartilhado segue main, então todo mundo vê a
// mudança em até um minuto; quem clicou vê na hora.

const git = promisify(execFile);
const RAIZ = process.cwd();
let fila: Promise<unknown> = Promise.resolve();

function quemClicou(request: Request) {
  const cabecalho = request.headers.get("authorization") ?? "";
  if (!cabecalho.startsWith("Basic ")) return "equipe";
  try {
    return atob(cabecalho.slice(6)).split(":")[0] || "equipe";
  } catch {
    return "equipe";
  }
}

async function rodar(args: string[]) {
  return git("git", args, { cwd: RAIZ, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
}

async function marcar(linha: number, texto: string, feita: boolean, quem: string) {
  const md = await readFile(ARQUIVO, "utf8");
  const novo = marcarLinha(md, linha, texto, feita);
  if (novo === null) return { status: 409, erro: "A lista mudou desde que você abriu a página. Recarregue e tente de novo." };
  await writeFile(ARQUIVO, novo);

  const resumo = texto.length > 60 ? `${texto.slice(0, 57)}…` : texto;
  const nome = quem[0].toUpperCase() + quem.slice(1);
  try {
    await rodar(["commit", "--only", "docs/TAREFAS.md", "-q", "-m", `${feita ? "conclui" : "reabre"} tarefa: ${resumo}\n\nMarcado no painel por ${nome}.`,
      "--author", `${nome} (painel) <painel@habeastitas.eduardomila.adv.br>`]);
  } catch {
    return { status: 500, erro: "Não consegui registrar a mudança no git." };
  }
  try {
    await rodar(["push", "-q", "origin", "HEAD:main"]);
  } catch {
    // Alguém publicou antes: traz o que chegou e tenta uma vez mais.
    try {
      await rodar(["pull", "-q", "--rebase", "origin", "main"]);
      await rodar(["push", "-q", "origin", "HEAD:main"]);
    } catch {
      return { status: 502, erro: "Marquei aqui, mas não consegui publicar no GitHub. Tente de novo em um minuto." };
    }
  }
  return { status: 200 };
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null) as { linha?: number; texto?: string; feita?: boolean } | null;
  if (!corpo || typeof corpo.linha !== "number" || typeof corpo.texto !== "string" || typeof corpo.feita !== "boolean") {
    return Response.json({ erro: "Pedido incompleto." }, { status: 400 });
  }
  const quem = quemClicou(request);
  const resultado = fila.then(() => marcar(corpo.linha!, corpo.texto!, corpo.feita!, quem));
  fila = resultado.catch(() => undefined);
  const r = await resultado;
  return Response.json(r.status === 200 ? { ok: true } : { erro: r.erro }, { status: r.status });
}
