// Fluxo git do projeto em dois comandos, igual em Mac e Windows:
//   npm run pegar             — traz o que os outros fizeram
//   npm run enviar -- "msg"   — build, commit, junta em main e sobe
// Cada pessoa trabalha em branch própria (nome/o-que); main sempre roda.
import { execSync } from "node:child_process";

const modo = process.argv[2];
const mensagem = process.argv.slice(3).join(" ").trim();

function git(cmd, opts = {}) {
  return execSync(`git ${cmd}`, { stdio: opts.silencioso ? "pipe" : "inherit", encoding: "utf8" });
}
function branchAtual() {
  return git("rev-parse --abbrev-ref HEAD", { silencioso: true }).trim();
}
function falhar(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

if (modo === "pegar") {
  const branch = branchAtual();
  git("fetch origin");
  if (branch === "main") {
    git("pull --rebase --autostash origin main");
  } else {
    git("rebase --autostash origin/main");
  }
  console.log(`\n✓ ${branch} atualizada com o que está em main`);
} else if (modo === "enviar") {
  if (!mensagem) falhar('diga o que fez: npm run enviar -- "adiciona upload de foto"');
  const branch = branchAtual();
  const sujo = git("status --porcelain", { silencioso: true }).trim();
  if (sujo) {
    git("add -A");
    git(`commit -m "${mensagem.replace(/"/g, '\\"')}"`);
  }
  git("fetch origin");
  git("rebase --autostash origin/main");
  try {
    execSync("npm run build", { stdio: "inherit" });
  } catch {
    falhar("o build quebrou. Conserte (ou peça pro Claude Code) e rode de novo. Nada foi enviado.");
  }
  if (branch !== "main") {
    git("switch main");
    git("pull --rebase origin main");
    git(`merge --ff-only ${branch}`);
  }
  git("push origin main");
  if (branch !== "main") git(`switch ${branch}`);
  console.log(`\n✓ enviado para main. Em até 1 minuto está em https://hackathon.eduardomila.adv.br`);
} else {
  falhar("uso: node scripts/git.mjs pegar | enviar \"mensagem\"");
}
