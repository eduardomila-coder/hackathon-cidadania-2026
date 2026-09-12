// Roda os casos de docs/entregas/dados-de-teste/casos.json contra o app
// (precisa de `npm run dev` rodando) e confere área, cabimento no JEC e o
// resultado da verificação contra a lei.
// Uso: node scripts/testar-casos.mjs [http://localhost:3000]
import { readFile, writeFile } from "node:fs/promises";

const base = process.argv[2] ?? "http://localhost:3000";
const casos = JSON.parse(await readFile(new URL("../docs/entregas/dados-de-teste/casos.json", import.meta.url), "utf8"));

async function analisar(relato) {
  const res = await fetch(`${base}/api/analisar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ relato }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const linhas = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
  const fim = linhas.at(-1);
  if (fim.erro) throw new Error(fim.erro);
  return fim.resultado;
}

let acertos = 0;
const relatorio = [];
for (const caso of casos) {
  const inicio = Date.now();
  let r;
  try {
    r = await analisar(caso.relato);
  } catch (e) {
    console.log(`✗ ${caso.id}: ${e.message}`);
    relatorio.push({ id: caso.id, ok: false, erro: e.message });
    continue;
  }
  const seg = ((Date.now() - inicio) / 1000).toFixed(1);
  const a = r.analise;
  const ok = a.area === caso.esperado.area && a.cabe_juizado_especial === caso.esperado.cabe_juizado_especial;
  acertos += ok ? 1 : 0;
  const conf = r.verificacao.itens.filter((i) => i.situacao === "confirmada").length;
  const derrub = r.verificacao.itens.length - conf;
  const forca = `${r.forca.comprovados}/${r.forca.aplicaveis}`;
  const custo = r.custo.dolares === null ? "sem preço" : `US$ ${r.custo.dolares.toFixed(3)}`;
  console.log(`${ok ? "✓" : "✗"} ${caso.id}: área=${a.area} jec=${a.cabe_juizado_especial} | requisitos ${forca} comprovados | fundamentos ${conf} confirmados, ${derrub} barrados | fontes ${r.fontes.map((f) => f.id).join(",")} (${seg}s, ${custo})`);
  if (!ok) console.log(`    esperado: área=${caso.esperado.area} jec=${caso.esperado.cabe_juizado_especial} — ${a.motivo_juizado}`);
  relatorio.push({ id: caso.id, ok, area: a.area, jec: a.cabe_juizado_especial, forca: r.forca, confirmados: conf, barrados: derrub, sem_base: a.sem_base, fontes: r.fontes.map((f) => f.id), segundos: Number(seg), custo_dolares: r.custo.dolares, modelo: r.custo.modelo });
}
const gasto = relatorio.reduce((t, c) => t + (c.custo_dolares ?? 0), 0);
console.log(`\n${acertos}/${casos.length} casos como esperado · custo da rodada US$ ${gasto.toFixed(3)}`);
await writeFile(new URL("../docs/entregas/dados-de-teste/ultimo-resultado.json", import.meta.url), JSON.stringify({ quando: new Date().toISOString(), base, acertos, total: casos.length, casos: relatorio }, null, 2) + "\n");
process.exitCode = acertos === casos.length ? 0 : 1;
