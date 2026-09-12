import type { Metadata } from "next";
import Link from "next/link";
import { AUDITORIA, EQUIPE, LINKS, LOCAL, MARCOS, PITCH, PREMIOS, REGRAS, type Marco } from "@/lib/evento";
import { lerTarefas } from "@/lib/tarefas";
import { Relogio } from "./Relogio";

export const metadata: Metadata = { title: "Painel — Habeas Titas · Hackathon da Cidadania 2026" };
// As tarefas vêm do TAREFAS.md a cada pedido: nada fica em cache.
export const dynamic = "force-dynamic";

const SECOES = [
  ["agora", "Agora"],
  ["cronograma", "Cronograma"],
  ["tarefas", "Tarefas"],
  ["auditoria", "Auditoria"],
  ["pitch", "Pitch"],
  ["regras", "Regras"],
  ["equipe", "Equipe"],
  ["acesso", "Acesso da equipe"],
  ["links", "Links"],
] as const;

const COR_TIPO: Record<Marco["tipo"], string> = {
  entrega: "bg-blue-700 text-white",
  extra: "bg-emerald-600 text-white",
  prazo: "bg-amber-500 text-black",
  evento: "bg-zinc-200 text-zinc-800",
};

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}
function diaDe(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit" });
}

export default function Painel() {
  const blocos = lerTarefas();
  const total = blocos.reduce((s, b) => s + b.tarefas.length, 0);
  const feitas = blocos.reduce((s, b) => s + b.tarefas.filter((t) => t.feita).length, 0);
  const dias = Array.from(new Set(MARCOS.map((m) => diaDe(m.quando))));

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="relative overflow-hidden bg-[#101b3d] text-white">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-7">
          <div className="mb-8 flex items-center justify-between gap-4 text-sm text-blue-100">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">OAB/PR · 12 e 13 de setembro</span>
            <div className="flex gap-2"><Link href="/revisoes" className="rounded-full border border-cyan-300/50 bg-cyan-300/10 px-3 py-1 hover:bg-cyan-300/20">Habeas Release</Link><Link href="/" className="rounded-full border border-white/20 px-3 py-1 hover:bg-white/10">Abrir atendente →</Link></div>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-7">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Hackathon da Cidadania 2026</p>
            <h1 className="mt-2 text-5xl font-black tracking-tight">Habeas Titas</h1>
            <p className="mt-3 max-w-2xl text-lg text-blue-100">Atendente virtual do Juizado Especial Cível para transformar histórias difíceis em próximos passos claros.</p>
            <p className="mt-2 text-sm text-blue-200">{LOCAL}</p>
          </div>
          <nav aria-label="Seções" className="flex flex-wrap gap-2 text-sm">
            {SECOES.map(([id, nome]) => (
              <a key={id} href={`#${id}`} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 hover:bg-white/20">
                {nome}
              </a>
            ))}
          </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-10">
        <section id="agora" aria-labelledby="agora-t" className="flex flex-col gap-4">
          <h2 id="agora-t" className="sr-only">Agora</h2>
          <Relogio marcos={MARCOS} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Placar titulo="Sábado" valor="300 + 30" sub="canvas, V1, V2 · extras" />
            <Placar titulo="Domingo" valor="450 + 30" sub="produto, auditoria, slides · extras" />
            <Placar titulo="Tarefas" valor={`${feitas}/${total}`} sub={`${total ? Math.round((100 * feitas) / total) : 0}% concluído`} />
          </div>
        </section>

        <section id="cronograma" aria-labelledby="crono-t">
          <Titulo id="crono-t">Cronograma e pontuação</Titulo>
          <div className="grid gap-8 lg:grid-cols-3">
            {dias.map((dia) => (
              <div key={dia}>
                <h3 className="mb-3 text-lg font-semibold capitalize">{dia}</h3>
                <ol className="relative flex flex-col gap-3 border-l-2 border-zinc-200 pl-5">
                  {MARCOS.filter((m) => diaDe(m.quando) === dia).map((m, i) => (
                    <li key={i} className="relative">
                      <span className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ${m.tipo === "evento" ? "bg-zinc-300" : m.tipo === "entrega" ? "bg-blue-700" : m.tipo === "prazo" ? "bg-amber-500" : "bg-emerald-600"}`} aria-hidden />
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-sm text-zinc-500">{hora(m.quando)}</span>
                        <span className={m.tipo === "evento" ? "text-zinc-700" : "font-medium"}>{m.titulo}</span>
                        {m.pontos && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COR_TIPO[m.tipo]}`}>{m.pontos} pts</span>}
                      </div>
                      {m.evidencia && <div className="text-sm text-zinc-600">Evidência: {m.evidencia}</div>}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-zinc-600">
            Legenda: <Chip cor={COR_TIPO.entrega}>entrega</Chip> <Chip cor={COR_TIPO.extra}>ponto extra</Chip> <Chip cor={COR_TIPO.prazo}>prazo de evidência</Chip> <Chip cor={COR_TIPO.evento}>programação</Chip>. Slides: o Manual diz 14h30, a programação diz 15h — vale o mais cedo.
          </p>
        </section>

        <section id="tarefas" aria-labelledby="tarefas-t">
          <Titulo id="tarefas-t">Tarefas e responsáveis</Titulo>
          <p className="mb-4 text-zinc-600">
            Lido de <code>docs/TAREFAS.md</code> a cada abertura. Para assumir uma tarefa, escreva <code>@eduardo</code>, <code>@maria</code> ou <code>@fernando</code> na linha; para concluir, marque <code>[x]</code> e faça <code>/entregar</code>.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {blocos.filter((b) => b.tarefas.length > 0).map((b, i) => {
              const ok = b.tarefas.filter((t) => t.feita).length;
              return (
                <article key={i} className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-zinc-500">{b.dia}</div>
                      <h3 className="font-semibold">{b.titulo || "Geral"}</h3>
                    </div>
                    {b.tarefas.length > 0 && <span className="text-sm text-zinc-500">{ok}/{b.tarefas.length}</span>}
                  </div>
                  {b.tarefas.length > 0 && (
                    <div className="mb-3 h-1.5 w-full rounded-full bg-zinc-100" aria-hidden>
                      <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(100 * ok) / b.tarefas.length}%` }} />
                    </div>
                  )}
                  <ul className="flex flex-col gap-2">
                    {b.tarefas.map((t, j) => (
                      <li key={j} className={`flex items-start gap-2 ${t.feita ? "text-zinc-400 line-through" : ""}`}>
                        <span aria-hidden className={`mt-1 inline-block h-4 w-4 shrink-0 rounded border ${t.feita ? "border-emerald-500 bg-emerald-500" : "border-zinc-400"}`} />
                        <span className="sr-only">{t.feita ? "feita:" : "pendente:"}</span>
                        <span className="flex-1">{t.texto}</span>
                        <span className="flex gap-1">
                          {t.responsaveis.map((r) => {
                            const p = EQUIPE.find((e) => e.id === r);
                            return p ? <Avatar key={r} pessoa={p} /> : null;
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <section id="auditoria" aria-labelledby="aud-t">
          <Titulo id="aud-t">Auditoria técnica — 300 pontos</Titulo>
          <p className="mb-4 text-zinc-600">Quatro auditores, nota por consenso, três dimensões. Nota 1 = 0 · 2 = 25 · 3 = 50 · 4 = 75 · 5 = 100 pontos cada.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {AUDITORIA.map((a) => (
              <article key={a.dimensao} className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5">
                <h3 className="text-xl font-semibold">{a.dimensao}</h3>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Nota 5</div>
                  <p>{a.nota5}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Nota 3 (evitar)</div>
                  <p className="text-zinc-600">{a.nota3}</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-800">Como estamos atacando</div>
                  <p>{a.nosso}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="pitch" aria-labelledby="pitch-t">
          <Titulo id="pitch-t">Pitch — 2 minutos, até 25 pontos por jurado</Titulo>
          <p className="mb-4 text-lg font-medium">Roteiro imposto: Problema → Solução → Demo → Impacto.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PITCH.map((p) => (
              <div key={p.criterio} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="font-semibold">{p.criterio}</div>
                <div className="text-xs uppercase tracking-wide text-emerald-700">nota 5</div>
                <p className="text-sm text-zinc-700">{p.nota5}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="regras" aria-labelledby="regras-t">
          <Titulo id="regras-t">Regras que custam pontos ou desclassificam</Titulo>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REGRAS.map((r) => (
              <div key={r.titulo} className="rounded-2xl border-l-4 border-red-500 bg-white p-4 shadow-sm">
                <div className="font-semibold">{r.titulo}</div>
                <p className="text-zinc-700">{r.texto}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-zinc-700">
            <strong>Premiação por categoria:</strong> {PREMIOS.join(" · ")}. Nota final = entregas + auditoria + extras + pitch.
          </p>
        </section>

        <section id="equipe" aria-labelledby="equipe-t">
          <Titulo id="equipe-t">Equipe e áreas</Titulo>
          <div className="grid gap-4 sm:grid-cols-3">
            {EQUIPE.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <Avatar pessoa={p} grande />
                  <div>
                    <div className="text-lg font-semibold">{p.nome}</div>
                    <div className="text-sm text-zinc-600">{p.papel}</div>
                  </div>
                </div>
                <p className="text-zinc-700">{p.area}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-zinc-600">Quem mexe fora da sua área avisa no grupo antes. Pelo menos dois dos três na sede o tempo todo.</p>
        </section>

        <section id="acesso" aria-labelledby="acesso-t">
          <Titulo id="acesso-t">Acesso à pasta compartilhada</Titulo>
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 text-slate-900">
            <p className="text-lg font-semibold">Pasta: <code>hackathon</code></p>
            <p className="mt-1">O Mac do Eduardo compartilha a pasta pela rede Wi-Fi do evento.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-white p-4">
                <h3 className="font-semibold">Windows</h3>
                <p className="mt-1 text-sm">Abra o Explorador e digite:</p>
                <code className="mt-2 block break-all text-sm">\\\\192.168.2.1\\hackathon</code>
              </div>
              <div className="rounded-xl bg-white p-4">
                <h3 className="font-semibold">Mac</h3>
                <p className="mt-1 text-sm">Finder, menu Ir, Conectar ao servidor:</p>
                <code className="mt-2 block break-all text-sm">smb://192.168.2.1/hackathon</code>
              </div>
              <div className="rounded-xl bg-white p-4">
                <h3 className="font-semibold">Android</h3>
                <p className="mt-1 text-sm">No Cx File Explorer ou Solid Explorer, escolha SMB e informe:</p>
                <code className="mt-2 block text-sm">servidor: 192.168.2.1<br />pasta: hackathon</code>
              </div>
            </div>
            <p className="mt-4"><strong>Login:</strong> Maria usa <code>maria</code>; Fernando usa <code>fernando</code>.</p>
            <p className="mt-2 text-sm font-semibold text-red-800">A senha é enviada individualmente. Não publique nem compartilhe a senha neste site.</p>
            <p className="mt-3 text-sm text-slate-700">Use esta pasta para canvas, fotos, prints, slides e materiais. O código continua no GitHub, para evitar edição simultânea e perda de trabalho.</p>
          </div>
        </section>

        <section id="links" aria-labelledby="links-t">
          <Titulo id="links-t">Links</Titulo>
          <ul className="grid gap-3 sm:grid-cols-2">
            {LINKS.map((l) => (
              <li key={l.url}>
                <a href={l.url} className="block rounded-2xl border border-zinc-200 bg-white p-4 hover:border-blue-700">
                  <div className="font-semibold text-blue-800">{l.nome}</div>
                  <div className="text-sm text-zinc-600">{l.desc}</div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500">
        Fontes: Manual de Orientações, slides “Regras do Jogo” e programação oficial (OAB/PR, 2026). Em divergência, vale o Edital.
      </footer>
    </div>
  );
}

function Titulo({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="mb-4 text-2xl font-bold">{children}</h2>;
}
function Chip({ cor, children }: { cor: string; children: React.ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cor}`}>{children}</span>;
}
function Placar({ titulo, valor, sub }: { titulo: string; valor: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{titulo}</div>
      <div className="mt-1 text-3xl font-black tracking-tight text-[#101b3d]">{valor}</div>
      <div className="text-sm text-slate-600">{sub}</div>
    </div>
  );
}
function Avatar({ pessoa, grande }: { pessoa: { nome: string; cor: string }; grande?: boolean }) {
  const inicial = pessoa.nome[0];
  return (
    <span title={pessoa.nome} className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${pessoa.cor} ${grande ? "h-12 w-12 text-xl" : "h-6 w-6 text-xs"}`}>
      {inicial}
      <span className="sr-only">{pessoa.nome}</span>
    </span>
  );
}
