"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const LIGACOES = [
  ["/escritorio", "Casos"],
  ["/escritorio/mensagens", "Mensagens"],
  ["/escritorio/whatsapp", "WhatsApp"],
  ["/escritorio/processos", "Processos"],
] as const;

export function Navegacao() {
  const caminho = usePathname();
  const atual = (destino: string) => destino === "/escritorio" ? caminho === "/escritorio" || caminho.startsWith("/escritorio/casos") : caminho.startsWith(destino);
  return <nav className="pd-nav" aria-label="Navegação do escritório">
    {LIGACOES.map(([destino, nome]) => <Link key={destino} href={destino} aria-current={atual(destino) ? "page" : undefined}>{nome}</Link>)}
  </nav>;
}

// Sai do escritório: apaga o cookie no servidor e volta para o site.
export function BotaoSair() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  async function sair() {
    setSaindo(true);
    try { await fetch("/api/sair", { method: "POST" }); }
    finally {
      router.push("/");
      router.refresh();
    }
  }
  return <button type="button" className="pd-sair" onClick={sair} disabled={saindo}>{saindo ? "Saindo…" : "Sair"}</button>;
}
