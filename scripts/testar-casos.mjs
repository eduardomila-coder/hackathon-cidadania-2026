// Roda os casos de docs/entregas/dados-de-teste/casos.json contra o app
// (precisa de `npm run dev` rodando) e confere área e cabimento no JEC.
// Uso: node scripts/testar-casos.mjs [http://localhost:3000]
import { readFile } from "node:fs/promises";

const base = process.argv[2] ?? "http://localhost:3000";
const casos = JSON.parse(await readFile(new URL("../docs/entregas/dados-de-teste/casos.json", import.meta.url), "utf8"));

let acertos = 0;
for (const caso of casos) {
  const inicio = Date.now();
  const res = await fetch(`${base}/api/analisar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ relato: caso.relato }),
  });
  const seg = ((Date.now() - inicio) / 1000).toFixed(1);
  if (!res.ok) {
    console.log(`✗ ${caso.id}: HTTP ${res.status} (${seg}s)`);
    continue;
  }
  const a = await res.json();
  const ok = a.area === caso.esperado.area && a.cabe_juizado_especial === caso.esperado.cabe_juizado_especial;
  acertos += ok ? 1 : 0;
  console.log(`${ok ? "✓" : "✗"} ${caso.id}: área=${a.area} jec=${a.cabe_juizado_especial} (${seg}s)`);
  if (!ok) console.log(`    esperado: área=${caso.esperado.area} jec=${caso.esperado.cabe_juizado_especial} — ${a.motivo_juizado}`);
}
console.log(`\n${acertos}/${casos.length} casos como esperado`);
process.exitCode = acertos === casos.length ? 0 : 1;
