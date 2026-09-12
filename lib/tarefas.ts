import { readFileSync } from "node:fs";
import { join } from "node:path";

// Lê docs/TAREFAS.md e devolve os blocos com suas tarefas. O painel mostra
// isso ao vivo: quem marca [x] e faz /entregar atualiza a página sozinho.
// Responsável: escreva @eduardo, @maria ou @fernando em qualquer lugar da linha.

export type Tarefa = { texto: string; feita: boolean; responsaveis: string[] };
export type Bloco = { dia: string; titulo: string; tarefas: Tarefa[] };

const RESPONSAVEIS = ["eduardo", "maria", "fernando"];

// Tira marcação markdown leve para exibir como texto corrido.
function limpar(md: string): string {
  return md.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/@(eduardo|maria|fernando)/gi, "").replace(/\s{2,}/g, " ").trim();
}

export function lerTarefas(): Bloco[] {
  const md = readFileSync(join(process.cwd(), "docs", "TAREFAS.md"), "utf8");
  const blocos: Bloco[] = [];
  let dia = "";
  let atual: Bloco | null = null;
  for (const linha of md.split("\n")) {
    const h2 = linha.match(/^## (.+)/);
    const h3 = linha.match(/^### (.+)/);
    const item = linha.match(/^- \[( |x|X)\] (.+)/);
    if (h2) {
      dia = h2[1].trim();
      atual = { dia, titulo: "", tarefas: [] };
      blocos.push(atual);
    } else if (h3) {
      atual = { dia, titulo: h3[1].trim(), tarefas: [] };
      blocos.push(atual);
    } else if (item && atual) {
      const texto = item[2];
      const responsaveis = RESPONSAVEIS.filter((r) => new RegExp(`@${r}\\b`, "i").test(texto));
      atual.tarefas.push({ texto: limpar(texto), feita: item[1].toLowerCase() === "x", responsaveis });
    }
  }
  return blocos.filter((b) => b.tarefas.length > 0 || b.titulo);
}
