"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

// Traço de 20px, sem biblioteca de ícones.
const TRACOS: Record<string, string> = {
  casos: "M3 6.5A1.5 1.5 0 0 1 4.5 5h3l1.4 1.8h6.6A1.5 1.5 0 0 1 17 8.3v6.2A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5z",
  nomeacoes: "M6 3h6l3 3v11H6zM12 3v3h3M8.5 11h4M8.5 13.5h2.5",
  agenda: "M4 6.5A1.5 1.5 0 0 1 5.5 5h9A1.5 1.5 0 0 1 16 6.5v9A1.5 1.5 0 0 1 14.5 17h-9A1.5 1.5 0 0 1 4 15.5zM4 8.8h12M7 3.5v2.5M13 3.5v2.5",
  documentos: "M6.5 3h4.6L14 5.9V17H6.5zM11 3v3h3M8.8 10h4M8.8 12.8h4",
  pesquisa: "M9 15a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13.2 13.2 17 17",
  processos: "M7 5h6M6 5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 6 17h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14 5M7.5 3.5h5V5h-5zM7.5 9.5h5M7.5 12.5h3.5",
  mensagens: "M4 6.5A1.5 1.5 0 0 1 5.5 5h9A1.5 1.5 0 0 1 16 6.5v5A1.5 1.5 0 0 1 14.5 13H9l-3.5 3v-3H5.5A1.5 1.5 0 0 1 4 11.5z",
  whatsapp: "M7 3.5h6A1.5 1.5 0 0 1 14.5 5v10A1.5 1.5 0 0 1 13 16.5H7A1.5 1.5 0 0 1 5.5 15V5A1.5 1.5 0 0 1 7 3.5zM9 14.2h2",
};

type Contagens = {
  casos: number;
  prazos: number;
  documentos: number;
  mensagens: number;
};

type Ligacao = { destino: string; nome: string; icone: keyof typeof TRACOS; contagem?: keyof Contagens; alerta?: boolean };

const GRUPOS: Array<{ grupo: string; ligacoes: Ligacao[] }> = [
  {
    grupo: "Trabalho",
    ligacoes: [
      { destino: "/escritorio", nome: "Casos", icone: "casos", contagem: "casos" },
      { destino: "/escritorio/nomeacoes", nome: "Nomeações", icone: "nomeacoes" },
      { destino: "/escritorio/agenda", nome: "Agenda e prazos", icone: "agenda", contagem: "prazos", alerta: true },
    ],
  },
  {
    grupo: "Instrução",
    ligacoes: [
      { destino: "/escritorio/documentos", nome: "Documentos", icone: "documentos", contagem: "documentos", alerta: true },
      { destino: "/escritorio/pesquisa", nome: "Pesquisa jurídica", icone: "pesquisa" },
      { destino: "/escritorio/honorarios", nome: "Honorários", icone: "processos" },
      { destino: "/escritorio/processos", nome: "Processos", icone: "processos" },
    ],
  },
  {
    grupo: "Atendimento",
    ligacoes: [
      { destino: "/escritorio/mensagens", nome: "Mensagens", icone: "mensagens", contagem: "mensagens", alerta: true },
      { destino: "/escritorio/whatsapp", nome: "WhatsApp", icone: "whatsapp" },
    ],
  },
];

function Icone({ traco }: { traco: string }) {
  return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={traco} />
  </svg>;
}

export function Navegacao({ contagens }: { contagens?: Contagens }) {
  const caminho = usePathname();
  const atual = (destino: string) => destino === "/escritorio"
    ? caminho === "/escritorio" || caminho.startsWith("/escritorio/casos")
    : caminho.startsWith(destino);

  return <nav className="pd-menu-nav" aria-label="Seções do escritório">
    {GRUPOS.map(({ grupo, ligacoes }) => <div key={grupo} style={{ display: "contents" }}>
      <p className="pd-menu-grupo">{grupo}</p>
      {ligacoes.map(({ destino, nome, icone, contagem, alerta }) => {
        const quantos = contagens && contagem ? contagens[contagem] : 0;
        return <Link key={destino} href={destino} className="pd-menu-item"
          aria-current={atual(destino) ? "page" : undefined}>
          <Icone traco={TRACOS[icone]} />
          <span>{nome}</span>
          {quantos > 0 && <span className={`pd-menu-contagem${alerta ? " pd-menu-contagem-alerta" : ""}`}
            aria-label={`${quantos} em aberto`}>{quantos}</span>}
        </Link>;
      })}
    </div>)}
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
