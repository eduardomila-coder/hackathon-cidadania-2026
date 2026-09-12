const DONO = "eduardomila-coder";
const REPOSITORIO = "hackathon-cidadania-2026";
const API = `https://api.github.com/repos/${DONO}/${REPOSITORIO}`;

type CommitGithub = {
  sha: string;
  commit: { message: string; author: { date: string } };
};

function cabecalhos() {
  return { Accept: "application/vnd.github+json", "User-Agent": "Habeas-Titas-Versoes" };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const commitsResposta = await fetch(`${API}/commits?sha=main&per_page=15`, { headers: cabecalhos(), cache: "no-store" });
  if (!commitsResposta.ok) return Response.json({ erro: "Não consegui consultar as versões agora." }, { status: 502 });
  const commits = await commitsResposta.json() as CommitGithub[];
  const versoes = commits.map((commit) => ({
    id: commit.sha,
    curta: commit.sha.slice(0, 7),
    titulo: commit.commit.message.split("\n")[0],
    quando: commit.commit.author.date,
  }));
  const atual = versoes[0];
  const base = url.searchParams.get("base");
  if (!atual || !base || base === atual.id) return Response.json({ atual, versoes, comparacao: null });
  if (!versoes.some((versao) => versao.id === base)) return Response.json({ atual, versoes, comparacao: null });

  const comparacaoResposta = await fetch(`${API}/compare/${base}...${atual.id}`, { headers: cabecalhos(), cache: "no-store" });
  if (!comparacaoResposta.ok) return Response.json({ atual, versoes, comparacao: null });
  const comparacaoGithub = await comparacaoResposta.json() as {
    commits: Array<{ sha: string; commit: { message: string } }>;
    files: Array<{ filename: string; status: string; additions: number; deletions: number }>;
  };
  return Response.json({
    atual,
    versoes,
    comparacao: {
      desde: base,
      commits: comparacaoGithub.commits.map((commit) => ({ id: commit.sha.slice(0, 7), titulo: commit.commit.message.split("\n")[0] })),
      arquivos: comparacaoGithub.files.map((arquivo) => ({ nome: arquivo.filename, situacao: arquivo.status, adicoes: arquivo.additions, remocoes: arquivo.deletions })),
    },
  });
}
