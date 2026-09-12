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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6 text-lg">
      <header>
        <h1 className="text-3xl font-semibold">Conte o que aconteceu</h1>
        <p className="text-zinc-700">
          Fale ou escreva com suas palavras. A gente organiza, confere na lei e diz o que dá pra fazer.
        </p>
      </header>

      <label className="flex flex-col gap-2">
        <span className="sr-only">Seu relato</span>
        <textarea
          className="min-h-44 rounded-lg border-2 border-zinc-400 p-3 text-lg focus:border-blue-700 focus:outline-none"
          placeholder="Ex.: comprei uma geladeira, ela chegou quebrada e a loja não troca…"
          value={relato}
          onChange={(e) => setRelato(e.target.value)}
          disabled={carregando}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        {ditado.suportado && (
          <button
            type="button"
            onClick={ditado.gravando ? ditado.parar : ditado.iniciar}
            aria-pressed={ditado.gravando}
            className="rounded-lg border-2 border-zinc-500 px-5 py-3 font-medium"
          >
            {ditado.gravando ? "⏹ Parar de falar" : "🎤 Falar"}
          </button>
        )}
        <button
          type="button"
          onClick={enviar}
          disabled={carregando || relato.trim().length < 10}
          className="rounded-lg bg-blue-800 px-5 py-3 font-medium text-white disabled:opacity-40"
        >
          {carregando ? "Analisando…" : "Analisar"}
        </button>
      </div>

      {carregando && (
        <ol aria-live="polite" className="flex flex-col gap-1 rounded-lg bg-zinc-100 p-4">
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
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">
          {erro}
        </p>
      )}

      {resultado && <Painel r={resultado} />}

      <footer className="mt-auto pt-6 text-center text-sm text-zinc-500">
        Equipe Habeas Titas · Hackathon da Cidadania 2026 · <a href="/painel" className="underline">painel da equipe</a>
      </footer>
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
