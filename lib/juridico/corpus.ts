import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// A base jurídica mora em docs/juridico/*.md, um "## Art. N" por artigo.
// Aqui ela vira uma lista de trechos com id estável (ex.: L9099-3), que o
// modelo é obrigado a citar. Busca por termos (BM25), sem banco e sem rede.

export type Trecho = {
  id: string;        // ex.: "L9099-3"
  lei: string;       // ex.: "Lei 9.099/1995"
  artigo: number;
  texto: string;
};

const PASTA = join(process.cwd(), "docs", "juridico");

const STOPWORDS = new Set(
  "a o e de da do das dos em no na nos nas um uma uns umas para por com sem que se ao aos as os ou não nao é e ser ter mais como mas seu sua seus suas ele ela eles elas eu meu minha me lhe este esta isto esse essa isso aquele aquela já ja foi era são sao está esta estão estao pelo pela pelos pelas até ate quando onde qual quais quem também tambem muito pouco bem mal só so lá la aqui ali então entao vezes vez dia dias".split(" "),
);

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Radical bem simples: tira plural e sufixos comuns, o suficiente para
// "defeituosa" e "defeito" caírem perto.
function radical(p: string): string {
  return p
    .replace(/(coes|cao|ções|ção)$/, "c")
    .replace(/(mente)$/, "")
    .replace(/(ndo|ada|ado|adas|ados|ida|ido|idas|idos|ar|er|ir)$/, "")
    .replace(/(s|es)$/, "")
    .slice(0, 7);
}

export function termos(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 2 && !STOPWORDS.has(p))
    .map(radical)
    .filter((p) => p.length > 1);
}

type Indexado = Trecho & { termos: string[]; freq: Map<string, number> };

let cache: { trechos: Indexado[]; df: Map<string, number>; mediaLen: number } | null = null;

function lerCorpus() {
  if (cache) return cache;
  const trechos: Indexado[] = [];
  for (const arquivo of readdirSync(PASTA).filter((f) => f.endsWith(".md") && f !== "README.md")) {
    const md = readFileSync(join(PASTA, arquivo), "utf8");
    const titulo = (md.match(/^# (.+)$/m)?.[1] ?? arquivo).split(" — ")[0].trim();
    const sigla = "L" + (titulo.match(/[\d.]+/)?.[0].replace(/\./g, "") ?? arquivo.replace(/\W/g, "").slice(0, 6));
    for (const m of md.matchAll(/^## Art\. (\d+)\s*\n([\s\S]*?)(?=^## Art\. |\s*$(?![\s\S]))/gm)) {
      const artigo = Number(m[1]);
      const texto = m[2].trim();
      if (!texto) continue;
      const ts = termos(texto);
      const freq = new Map<string, number>();
      for (const t of ts) freq.set(t, (freq.get(t) ?? 0) + 1);
      trechos.push({ id: `${sigla}-${artigo}`, lei: titulo, artigo, texto, termos: ts, freq });
    }
  }
  const df = new Map<string, number>();
  for (const t of trechos) for (const termo of t.freq.keys()) df.set(termo, (df.get(termo) ?? 0) + 1);
  const mediaLen = trechos.reduce((s, t) => s + t.termos.length, 0) / Math.max(trechos.length, 1);
  cache = { trechos, df, mediaLen };
  return cache;
}

export function porId(id: string): Trecho | undefined {
  return lerCorpus().trechos.find((t) => t.id === id);
}

// BM25 clássico (k1=1.5, b=0.75). Devolve os n trechos mais parecidos com a consulta.
export function buscar(consulta: string, n = 6): Trecho[] {
  const { trechos, df, mediaLen } = lerCorpus();
  const N = trechos.length;
  const q = Array.from(new Set(termos(consulta)));
  const k1 = 1.5, b = 0.75;
  const pontuados = trechos.map((t) => {
    let score = 0;
    for (const termo of q) {
      const tf = t.freq.get(termo) ?? 0;
      if (!tf) continue;
      const idf = Math.log(1 + (N - (df.get(termo) ?? 0) + 0.5) / ((df.get(termo) ?? 0) + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * t.termos.length) / mediaLen)));
    }
    return { t, score };
  });
  return pontuados
    .filter((p) => p.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, n)
    .map((p) => ({ id: p.t.id, lei: p.t.lei, artigo: p.t.artigo, texto: p.t.texto }));
}

// Todo caso passa por estes artigos, independentemente da busca: competência,
// quem pode ser parte, advogado, e o aviso de que o sistema não é advogado.
export const BASE_FIXA = ["L9099-3", "L9099-8", "L9099-9", "L9099-14", "Lorient-4", "Lorient-5", "Lorient-6"];

export function contexto(consulta: string, n = 6): Trecho[] {
  const fixos = BASE_FIXA.map(porId).filter((t): t is Trecho => Boolean(t));
  const vistos = new Set(fixos.map((t) => t.id));
  const extras = buscar(consulta, n + vistos.size).filter((t) => !vistos.has(t.id)).slice(0, n);
  return [...fixos, ...extras];
}

export function formatarContexto(trechos: Trecho[]): string {
  return trechos
    .map((t) => `[${t.id}] ${t.lei}, art. ${t.artigo}\n${t.texto}`)
    .join("\n\n---\n\n");
}
