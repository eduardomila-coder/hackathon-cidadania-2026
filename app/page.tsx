"use client";

import { useState } from "react";
import type { Analise } from "@/lib/claude";
import { useDitado } from "@/lib/useDitado";

export default function Home() {
  const [relato, setRelato] = useState("");
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const ditado = useDitado((texto) => setRelato((r) => (r ? r + " " : "") + texto));

  async function enviar() {
    setCarregando(true);
    setErro(null);
    setAnalise(null);
    const res = await fetch("/api/analisar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relato }),
    });
    const dados = await res.json();
    if (!res.ok) setErro(dados.erro);
    else setAnalise(dados);
    setCarregando(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Conte o que aconteceu</h1>
        <p className="text-zinc-600">
          Fale ou escreva com suas palavras. A gente organiza e diz o que dá pra fazer.
        </p>
      </header>

      <textarea
        className="min-h-40 rounded-lg border border-zinc-300 p-3"
        placeholder="Ex.: comprei uma geladeira, ela chegou quebrada e a loja não troca…"
        value={relato}
        onChange={(e) => setRelato(e.target.value)}
      />

      <div className="flex gap-3">
        {ditado.suportado && (
          <button
            type="button"
            onClick={ditado.gravando ? ditado.parar : ditado.iniciar}
            className="rounded-lg border border-zinc-300 px-4 py-2"
          >
            {ditado.gravando ? "⏹ Parar" : "🎤 Falar"}
          </button>
        )}
        <button
          type="button"
          onClick={enviar}
          disabled={carregando || relato.trim().length < 10}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-40"
        >
          {carregando ? "Analisando…" : "Analisar"}
        </button>
      </div>

      {erro && <p className="text-red-600">{erro}</p>}

      {analise && (
        <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4">
          <p>{analise.resumo}</p>
          <p>
            <strong>Área:</strong> {analise.area} ·{" "}
            <strong>Juizado Especial:</strong>{" "}
            {analise.cabe_juizado_especial ? "cabe" : "não cabe"} — {analise.motivo_juizado}
          </p>
          <Lista titulo="Dá pra tentar antes de processar" itens={analise.caminhos_extrajudiciais} />
          <Lista titulo="Documentos que você precisa juntar" itens={analise.documentos_necessarios} />
          <Lista titulo="Ainda preciso saber" itens={analise.perguntas_pendentes} />
          <p>
            <strong>Próximo passo:</strong> {analise.orientacao}
          </p>
        </section>
      )}
    </main>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <div>
      <h2 className="font-medium">{titulo}</h2>
      <ul className="list-disc pl-5">
        {itens.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
