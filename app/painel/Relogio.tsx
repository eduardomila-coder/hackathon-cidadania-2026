"use client";

import { useSyncExternalStore } from "react";
import type { Marco } from "@/lib/evento";

// Mostra a contagem até o próximo marco pontuado. Roda no navegador: o
// servidor não sabe a hora de quem está olhando.
function formatar(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function assinar(avisar: () => void) {
  const id = setInterval(avisar, 1000);
  return () => clearInterval(id);
}
const agoraMs = () => Math.floor(Date.now() / 1000) * 1000;

export function Relogio({ marcos }: { marcos: Marco[] }) {
  const ms = useSyncExternalStore(assinar, agoraMs, () => null);
  if (ms === null) return <div className="cfp-cartao cfp-prazo" style={{ minHeight: 180 }} aria-hidden />;
  const agora = new Date(ms);

  const pontuados = marcos.filter((m) => m.tipo !== "evento");
  const proximo = pontuados.find((m) => new Date(m.quando).getTime() > agora.getTime());

  if (!proximo) {
    return (
      <div className="cfp-cartao cfp-prazo">
        <span className="cfp-eyebrow">Próximo prazo</span>
        <h2>Fim.</h2>
        <p style={{ color: "#dbe4ee" }}>Todos os marcos passaram. Obrigado, equipe.</p>
      </div>
    );
  }

  const hora = new Date(proximo.quando).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="cfp-cartao cfp-prazo">
      <span className="cfp-eyebrow">Próximo prazo</span>
      <h2>{formatar(new Date(proximo.quando).getTime() - agora.getTime())}</h2>
      <p style={{ color: "#e7edf3" }}>
        <strong>{proximo.titulo}</strong>
        {proximo.pontos ? ` · ${proximo.pontos} pts` : ""}
      </p>
      <p style={{ color: "#aebdce" }}>
        {hora}
        {proximo.evidencia ? ` · Evidência: ${proximo.evidencia}` : ""}
      </p>
    </div>
  );
}
