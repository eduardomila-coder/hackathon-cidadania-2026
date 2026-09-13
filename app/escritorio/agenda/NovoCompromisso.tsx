"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Compromissos são anotados dentro do caso (aba Agenda). Este botão só
// pergunta em qual caso e leva para lá.
export function NovoCompromisso({ casos }: { casos: Array<{ id: string; nome: string }> }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  if (casos.length === 0) return null;
  return <div className="inline" style={{ position: "relative" }}>
    <button type="button" className="btn btn-primary" onClick={() => setAberto((valor) => !valor)} aria-expanded={aberto}>Novo compromisso</button>
    {aberto && <div className="card menu-flutuante">
      <div className="card-head"><h2>Em qual caso?</h2></div>
      <div className="lista-menu">
        {casos.map((caso) => <button key={caso.id} type="button" onClick={() => router.push(`/escritorio/casos/${caso.id}?aba=agenda`)}>{caso.nome}</button>)}
      </div>
    </div>}
  </div>;
}
