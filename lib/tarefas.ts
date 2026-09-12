import { readFileSync } from "node:fs";
import { join } from "node:path";

// Lê docs/TAREFAS.md e devolve os blocos com suas tarefas. O painel mostra
// isso ao vivo: clicar na caixinha do site (ou marcar [x] e fazer /entregar)
// atualiza a página para todo mundo.
// Responsável: escreva @eduardo, @maria ou @fernando em qualquer lugar da linha.
// Drive: escreva `drive:canvas|pitch` na linha e a tarefa conta como concluída
// quando um arquivo com uma dessas palavras no nome aparece na pasta da equipe.

export type Tarefa = { texto: string; feita: boolean; responsaveis: string[]; linha: number; dicas: string[] };
export type Bloco = { dia: string; titulo: string; tarefas: Tarefa[] };

const RESPONSAVEIS = ["eduardo", "maria", "fernando"];
const ITEM = /^- \[( |x|X)\] (.+)/;
export const ARQUIVO = join(process.cwd(), "docs", "TAREFAS.md");

// Tira marcação markdown leve para exibir como texto corrido.
export function limpar(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/@(eduardo|maria|fernando)/gi, "")
    .replace(/\bdrive:\S+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function lerTarefas(): Bloco[] {
  const md = readFileSync(ARQUIVO, "utf8");
  const blocos: Bloco[] = [];
  let dia = "";
  let atual: Bloco | null = null;
  md.split("\n").forEach((linha, i) => {
    const h2 = linha.match(/^## (.+)/);
    const h3 = linha.match(/^### (.+)/);
    const item = linha.match(ITEM);
    if (h2) {
      dia = limpar(h2[1]);
      atual = { dia, titulo: "", tarefas: [] };
      blocos.push(atual);
    } else if (h3) {
      atual = { dia, titulo: limpar(h3[1]), tarefas: [] };
      blocos.push(atual);
    } else if (item && atual) {
      const texto = item[2];
      const responsaveis = RESPONSAVEIS.filter((r) => new RegExp(`@${r}\\b`, "i").test(texto));
      const dicas = (texto.match(/\bdrive:(\S+)/i)?.[1] ?? "").split("|").filter(Boolean);
      atual.tarefas.push({ texto: limpar(texto), feita: item[1].toLowerCase() === "x", responsaveis, linha: i, dicas });
    }
  });
  return blocos.filter((b) => b.tarefas.length > 0 || b.titulo);
}

// Troca o [ ] / [x] de uma linha. Confere o texto antes, para não marcar a
// tarefa errada se o arquivo mudou entre a abertura da página e o clique.
export function marcarLinha(md: string, linha: number, texto: string, feita: boolean): string | null {
  const linhas = md.split("\n");
  const item = linhas[linha]?.match(ITEM);
  if (!item || limpar(item[2]) !== texto) return null;
  linhas[linha] = `- [${feita ? "x" : " "}] ${item[2]}`;
  return linhas.join("\n");
}
