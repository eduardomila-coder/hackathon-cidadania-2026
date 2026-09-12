import { DRIVE } from "./evento";

// Lê a pasta da equipe no Drive (repositório oficial da OAB/PR) sem credencial:
// a pasta é pública para leitura, e a visão "embeddedfolderview" devolve um HTML
// simples com id, nome e tipo de cada arquivo. É por aqui que o painel sabe o que
// já foi entregue de verdade.

export type ArquivoDrive = { id: string; nome: string; url: string; tipo: string; modificado: string };

const LISTA = `https://drive.google.com/embeddedfolderview?id=${DRIVE.url.split("/").pop()}#list`;
const ENTRADA = /<div class="flip-entry" id="entry-([^"]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?alt="([^"]*)"[\s\S]*?flip-entry-title">([^<]*)<[\s\S]*?flip-entry-last-modified"><div>([^<]*)</g;

let cache: { quando: number; arquivos: ArquivoDrive[] } | null = null;

export async function listarDrive(): Promise<ArquivoDrive[]> {
  if (cache && Date.now() - cache.quando < 20_000) return cache.arquivos;
  try {
    const resposta = await fetch(LISTA, { cache: "no-store", headers: { "User-Agent": "Habeas-Titas-Painel" } });
    if (!resposta.ok) return cache?.arquivos ?? [];
    const html = await resposta.text();
    const arquivos: ArquivoDrive[] = [];
    for (const m of html.matchAll(ENTRADA)) {
      const [, id, url, tipo, nome, modificado] = m;
      arquivos.push({ id, nome: decodificar(nome), url: url.replace(/&amp;/g, "&"), tipo, modificado });
    }
    cache = { quando: Date.now(), arquivos };
    return arquivos;
  } catch {
    return cache?.arquivos ?? [];
  }
}

function decodificar(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// Uma tarefa diz `drive:canvas|pitch` e fica concluída quando existe na pasta um
// arquivo cujo nome contém qualquer uma dessas palavras.
export function acharNoDrive(dicas: string[], arquivos: ArquivoDrive[]): ArquivoDrive | undefined {
  if (dicas.length === 0) return undefined;
  const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return arquivos.find((a) => dicas.some((d) => normal(a.nome).includes(normal(d))));
}
