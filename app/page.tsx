"use client";

import { useState } from "react";
import type { Etapa, Resultado } from "@/lib/analise";
import { useDitado } from "@/lib/useDitado";

const ETAPAS: { chave: Etapa; texto: string }[] = [
  { chave: "extraindo", texto: "Lendo o que você contou" },
  { chave: "buscando", texto: "Procurando na lei" },
  { chave: "analisando", texto: "Organizando o seu caso" },
  { chave: "verificando", texto: "Conferindo cada afirmação com a lei" },
];

export default function Home() {
  const [relato, setRelato] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const ditado = useDitado((texto) => setRelato((r) => (r ? r + " " : "") + texto));

  async function enviar() {
    setErro(null);
    setResultado(null);
    setEtapa("extraindo");
    try {
      const res = await fetch("/api/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relato }),
      });
      if (!res.ok || !res.body) {
        setErro((await res.json()).erro ?? "Não consegui analisar agora.");
        return;
      }
      // A resposta chega em linhas JSON: etapas de progresso e, por fim, o resultado.
      const leitor = res.body.getReader();
      const decodificador = new TextDecoder();
      let pendente = "";
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        pendente += decodificador.decode(value, { stream: true });
        const linhas = pendente.split("\n");
        pendente = linhas.pop() ?? "";
        for (const linha of linhas) {
          if (!linha.trim()) continue;
          const msg = JSON.parse(linha) as { etapa?: Etapa; resultado?: Resultado; erro?: string };
          if (msg.etapa) setEtapa(msg.etapa);
          if (msg.resultado) setResultado(msg.resultado);
          if (msg.erro) setErro(msg.erro);
        }
      }
    } catch {
      setErro("Perdi a conexão. Tente de novo.");
    } finally {
      setEtapa(null);
    }
  }

  const carregando = etapa !== null;

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <header className="mb-10 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-xl text-white shadow-lg shadow-blue-200">✓</span>
          <span><strong className="block text-lg leading-none">Cidadania Fácil</strong><small className="text-slate-500">Habeas Titas · OAB/PR</small></span>
        </a>
        <a href="/painel" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:border-blue-300 hover:text-blue-700">Área da equipe →</a>
      </header>

      <section className="mb-8 max-w-3xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-[.18em] text-blue-700">Orientação inicial para pessoas comuns</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">Entenda seu caso.<br /><span className="text-blue-700">Saiba o próximo passo.</span></h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Conte, do seu jeito, o que aconteceu. A gente organiza seu relato, consulta a legislação e mostra caminhos possíveis, inclusive antes de entrar com um processo.</p>
      </section>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {[['1', 'Conte', 'Escreva ou fale o que aconteceu'], ['2', 'Entenda', 'Receba uma explicação simples'], ['3', 'Aja', 'Veja documentos e próximos passos']].map(([n, t, d]) => <div key={n} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{n}</span><span><strong className="block">{t}</strong><small className="text-slate-500">{d}</small></span></div>)}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-8">
      <label className="flex flex-col gap-3">
        <span className="text-xl font-bold">O que aconteceu?</span>
        <span className="sr-only">Seu relato</span>
        <textarea
          className="min-h-52 rounded-2xl border-2 border-slate-200 bg-slate-50 p-5 text-lg leading-8 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
          placeholder="Exemplo: comprei uma geladeira, ela chegou quebrada e a loja não troca…"
          value={relato}
          onChange={(e) => setRelato(e.target.value)}
          disabled={carregando}
        />
      </label>
      <p className="mt-3 text-sm text-slate-500">Não precisa usar palavras difíceis. Diga quem está envolvido, o que aconteceu e o que você gostaria de resolver.</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {ditado.suportado && (
          <button
            type="button"
            onClick={ditado.gravando ? ditado.parar : ditado.iniciar}
            aria-pressed={ditado.gravando}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
          >
            {ditado.gravando ? "⏹ Parar de falar" : "🎤 Falar"}
          </button>
        )}
        <button
          type="button"
          onClick={enviar}
          disabled={carregando || relato.trim().length < 10}
          className="rounded-xl bg-blue-700 px-7 py-3 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {carregando ? "Analisando…" : "Analisar"}
        </button>
      </div>
      </section>

      {carregando && (
        <ol aria-live="polite" className="flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-base">
          {ETAPAS.map((e, i) => {
            const atual = ETAPAS.findIndex((x) => x.chave === etapa);
            const estado = i < atual ? "✓" : i === atual ? "…" : "○";
            return (
              <li key={e.chave} className={i <= atual ? "text-black" : "text-zinc-400"}>
                {estado} {e.texto}
              </li>
            );
          })}
        </ol>
      )}

      {erro && (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          {erro}
        </p>
      )}

      {resultado && <Painel r={resultado} />}

      <footer className="mt-auto pt-12 text-center text-sm text-slate-500">
        Equipe Habeas Titas · Hackathon da Cidadania 2026 · <a href="/painel" className="underline">painel da equipe</a>
      </footer>
      </div>
    </main>
  );
}

function Painel({ r }: { r: Resultado }) {
  const a = r.analise;
  const naoConfirmadas = r.verificacao.itens.filter((i) => i.situacao !== "confirmada");
  const fonteDe = (id: string) => r.fontes.find((f) => f.id === id);
  return (
    <section aria-label="Resultado da análise" className="flex flex-col gap-5">
      <p className="rounded-lg border-2 border-zinc-300 p-4">{a.resumo}</p>

      <div className={`rounded-lg p-4 ${a.cabe_juizado_especial ? "bg-green-50" : "bg-amber-50"}`}>
        <p className="text-xl font-semibold">
          {a.cabe_juizado_especial ? "Parece caber no Juizado Especial" : "Parece não ser caso do Juizado Especial"}
        </p>
        <p>{a.motivo_juizado}</p>
        {a.encaminhamento && <p className="mt-2"><strong>Onde procurar:</strong> {a.encaminhamento}</p>}
      </div>

      <Lista titulo="Dá pra tentar antes de processar" itens={a.caminhos_extrajudiciais} />
      <Lista titulo="Documentos que você precisa juntar" itens={a.documentos_necessarios} />
      <Lista titulo="Ainda preciso saber" itens={a.perguntas_pendentes} />

      <p>
        <strong>Próximo passo:</strong> {a.orientacao}
      </p>

      <details className="rounded-lg border border-zinc-300 p-3">
        <summary className="cursor-pointer font-medium">
          Onde isso está na lei ({a.fundamentos.length} {a.fundamentos.length === 1 ? "ponto conferido" : "pontos conferidos"})
        </summary>
        <ul className="mt-3 flex flex-col gap-3">
          {a.fundamentos.map((f) => {
            const fonte = fonteDe(f.fonte);
            return (
              <li key={f.afirmacao + f.fonte}>
                <p>✓ {f.afirmacao}</p>
                {fonte && (
                  <p className="text-base text-zinc-600">
                    {fonte.lei}, art. {fonte.artigo}: “{fonte.texto.slice(0, 220)}{fonte.texto.length > 220 ? "…" : ""}”
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </details>

      {(naoConfirmadas.length > 0 || a.sem_base.length > 0 || r.verificacao.alertas.length > 0) && (
        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
          <p className="font-semibold">O que eu não consegui confirmar na lei</p>
          <ul className="mt-2 list-disc pl-5">
            {a.sem_base.map((s) => (
              <li key={s}>{s}</li>
            ))}
            {r.verificacao.alertas.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="mt-2 text-base">Confirme esses pontos na secretaria do juizado ou com um advogado.</p>
        </div>
      )}

      <p className="text-base text-zinc-600">
        Isto é uma orientação organizada a partir do que você contou e da lei. Não substitui advogado nem a secretaria do juizado.
      </p>
    </section>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <div>
      <h2 className="font-semibold">{titulo}</h2>
      <ul className="list-disc pl-5">
        {itens.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
