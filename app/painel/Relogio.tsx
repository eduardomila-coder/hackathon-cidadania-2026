"use client";

import { useSyncExternalStore } from "react";
import type { Marco } from "@/lib/evento";

// Mostra a hora agora e a contagem até o próximo marco pontuado. Roda no
// navegador: o servidor não sabe a hora de quem está olhando.
function formatar(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : m > 0 ? `${m}min ${String(s).padStart(2, "0")}s` : `${s}s`;
}

// Relógio como fonte externa: no servidor não há hora (null), no navegador
// atualiza a cada segundo sem setState dentro de effect.
function assinar(avisar: () => void) {
  const id = setInterval(avisar, 1000);
  return () => clearInterval(id);
}
const agoraMs = () => Math.floor(Date.now() / 1000) * 1000;

export function Relogio({ marcos }: { marcos: Marco[] }) {
  const ms = useSyncExternalStore(assinar, agoraMs, () => null);
  if (ms === null) return <div className="h-28" aria-hidden />;
  const agora = new Date(ms);

  const pontuados = marcos.filter((m) => m.tipo !== "evento");
  const proximo = pontuados.find((m) => new Date(m.quando).getTime() > agora.getTime());
  const hora = agora.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  const data = agora.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
      <div className="rounded-2xl bg-zinc-900 px-6 py-5 text-white">
        <div className="text-sm uppercase tracking-wide text-zinc-400">{data}</div>
        <div className="text-5xl font-semibold tabular-nums">{hora}</div>
      </div>
      {proximo ? (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 px-6 py-5">
          <div className="text-sm uppercase tracking-wide text-amber-800">Próximo prazo em</div>
          <div className="text-4xl font-semibold tabular-nums text-amber-900">{formatar(new Date(proximo.quando).getTime() - agora.getTime())}</div>
          <div className="mt-1 text-lg">
            <span className="font-medium">{proximo.titulo}</span>
            {proximo.pontos && <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-sm font-semibold">{proximo.pontos} pts</span>}
            <span className="ml-2 text-zinc-600">
              {new Date(proximo.quando).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          {proximo.evidencia && <div className="mt-1 text-zinc-700">Evidência: {proximo.evidencia}</div>}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-6 py-5 text-xl font-medium text-emerald-900">Acabou. Obrigado, equipe.</div>
      )}
    </div>
  );
}
