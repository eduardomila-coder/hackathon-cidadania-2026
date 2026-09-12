export type ArquivoRevisao = {
  nome: string;
  situacao: "adicionado" | "modificado" | "removido" | "renomeado";
  adicoes: number;
  remocoes: number;
};

export type Revisao = {
  numero: number;
  titulo: string;
  autor: string;
  descricao: string | null;
  url: string;
  branch: string;
  atualizadaEm: string;
  arquivos: ArquivoRevisao[];
  verificacoes: { nome: string; resultado: "ok" | "falhou" | "pendente" }[];
  alertas: string[];
};

const DONO = "eduardomila-coder";
const REPOSITORIO = "hackathon-cidadania-2026";
const API = `https://api.github.com/repos/${DONO}/${REPOSITORIO}`;

type PullGithub = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  updated_at: string;
  user: { login: string };
  head: { ref: string; sha: string };
};

function cabecalhos() {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "Habeas-Titas-Release",
  };
}

function situacao(arquivo: string): ArquivoRevisao["situacao"] {
  if (arquivo.startsWith("removido:")) return "removido";
  return "modificado";
}

function alertaDe(arquivo: string): string | null {
  const baixo = arquivo.toLowerCase();
  if (baixo.includes(".env") || baixo.includes("credential") || baixo.includes("secret")) return `Possível segredo: ${arquivo}`;
  if (baixo.includes("docs/privado") || baixo.includes(".pem") || baixo.includes(".key")) return `Arquivo privado: ${arquivo}`;
  if (baixo.includes("package-lock") || baixo.includes("package.json")) return "Dependências mudaram. Confira se a mudança era necessária.";
  return null;
}

async function json<T>(url: string): Promise<T | null> {
  try {
    const resposta = await fetch(url, { headers: cabecalhos(), next: { revalidate: 30 } });
    return resposta.ok ? (await resposta.json() as T) : null;
  } catch {
    return null;
  }
}

export async function listarRevisoes(): Promise<Revisao[] | null> {
  const pulls = await json<PullGithub[]>(`${API}/pulls?state=open&per_page=20`);
  if (!pulls) return null;

  return Promise.all(pulls.map(async (pull) => {
    const arquivosGithub = await json<Array<{ filename: string; status: string; additions: number; deletions: number }>>(`${API}/pulls/${pull.number}/files`);
    const statusGithub = await json<{ state: "success" | "failure" | "pending"; statuses: Array<{ context: string; state: "success" | "failure" | "pending" }> }>(`${API}/commits/${pull.head.sha}/status`);
    const arquivos = (arquivosGithub ?? []).map((arquivo) => ({
      nome: arquivo.filename,
      situacao: arquivo.status === "added" ? "adicionado" : arquivo.status === "removed" ? "removido" : arquivo.status === "renamed" ? "renomeado" : situacao(arquivo.filename),
      adicoes: arquivo.additions,
      remocoes: arquivo.deletions,
    }));
    const alertas = arquivos.map((arquivo) => alertaDe(arquivo.nome)).filter((alerta): alerta is string => alerta !== null);
    const verificacoes: Revisao["verificacoes"] = statusGithub?.statuses.map((status) => ({
      nome: status.context,
      resultado: status.state === "success" ? "ok" : status.state === "failure" ? "falhou" : "pendente",
    })) ?? [];
    if (verificacoes.length === 0) {
      verificacoes.push({ nome: "Build", resultado: "pendente" });
      verificacoes.push({ nome: "Teste no site", resultado: "pendente" });
    }
    return {
      numero: pull.number,
      titulo: pull.title,
      autor: pull.user.login,
      descricao: pull.body,
      url: pull.html_url,
      branch: pull.head.ref,
      atualizadaEm: pull.updated_at,
      arquivos,
      verificacoes,
      alertas,
    };
  }));
}
