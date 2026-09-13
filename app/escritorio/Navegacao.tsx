"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAdvogado } from "./Advogado";

// Traços de 20px, sem biblioteca de ícones.
const TRACOS: Record<string, string> = {
  inicio: "M3.2 10 10 4l6.8 6M4.8 9v7.5h10.4V9M8.5 16.5V12h3v4.5",
  nomeacoes: "M6 3h6l3 3v11H6zM12 3v3h3M8.5 11h4M8.5 13.5h2.5",
  agenda: "M4 6.5A1.5 1.5 0 0 1 5.5 5h9A1.5 1.5 0 0 1 16 6.5v9A1.5 1.5 0 0 1 14.5 17h-9A1.5 1.5 0 0 1 4 15.5zM4 8.8h12M7 3.5v2.5M13 3.5v2.5",
  mensagens: "M4 6.5A1.5 1.5 0 0 1 5.5 5h9A1.5 1.5 0 0 1 16 6.5v5A1.5 1.5 0 0 1 14.5 13H9l-3.5 3v-3H5.5A1.5 1.5 0 0 1 4 11.5z",
  documentos: "M6.5 3h4.6L14 5.9V17H6.5zM11 3v3h3M8.8 10h4M8.8 12.8h4",
  pesquisa: "M9 15a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13.2 13.2 17 17",
  dinheiro: "M4 6.5h12A1.5 1.5 0 0 1 17.5 8v4A1.5 1.5 0 0 1 16 13.5H4A1.5 1.5 0 0 1 2.5 12V8A1.5 1.5 0 0 1 4 6.5zM10 8.7a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z",
  formacao: "M3.2 8 10 4.5 16.8 8 10 11.5zM6.5 9.7v3.8c2.2 1.6 4.8 1.6 7 0V9.7",
  processos: "M7 5h6M6 5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 6 17h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14 5M7.5 3.5h5V5h-5zM7.5 9.5h5M7.5 12.5h3.5",
  oabpr: "M10 3.5 16.5 6v4.4c0 3.2-2.2 5.7-6.5 6.9-4.3-1.2-6.5-3.7-6.5-6.9V6zM7.5 10h5M10 7.5v5",
  whatsapp: "M7 3.5h6A1.5 1.5 0 0 1 14.5 5v10A1.5 1.5 0 0 1 13 16.5H7A1.5 1.5 0 0 1 5.5 15V5A1.5 1.5 0 0 1 7 3.5zM9 14.2h2",
};

type Contagens = {
  casos: number;
  prazos: number;
  documentos: number;
  mensagens: number;
};

type Ligacao = { destino: string; nome: string; icone: keyof typeof TRACOS; contagem?: keyof Contagens; alerta?: boolean };

// Grupos e ordem como no protótipo: Trabalho, Apoio técnico, Institucional.
const GRUPOS: Array<{ grupo: string; ligacoes: Ligacao[] }> = [
  {
    grupo: "Trabalho",
    ligacoes: [
      { destino: "/escritorio", nome: "Início", icone: "inicio", contagem: "casos" },
      { destino: "/escritorio/nomeacoes", nome: "Nomeações", icone: "nomeacoes" },
      { destino: "/escritorio/agenda", nome: "Agenda e prazos", icone: "agenda", contagem: "prazos", alerta: true },
      { destino: "/escritorio/mensagens", nome: "Mensagens", icone: "mensagens", contagem: "mensagens", alerta: true },
      { destino: "/escritorio/documentos", nome: "Documentos", icone: "documentos", contagem: "documentos", alerta: true },
    ],
  },
  {
    grupo: "Apoio técnico",
    ligacoes: [
      { destino: "/escritorio/pesquisa", nome: "Pesquisa jurídica", icone: "pesquisa" },
      { destino: "/escritorio/honorarios", nome: "Honorários dativos", icone: "dinheiro" },
      { destino: "/escritorio/formacao", nome: "Formação e habilitações", icone: "formacao" },
      { destino: "/escritorio/processos", nome: "Processos", icone: "processos" },
    ],
  },
  {
    grupo: "Institucional",
    ligacoes: [
      { destino: "/escritorio/oabpr", nome: "Central OAB/PR", icone: "oabpr" },
      { destino: "/escritorio/whatsapp", nome: "WhatsApp", icone: "whatsapp" },
    ],
  },
];

// Breadcrumb da topbar, por prefixo de rota. Do mais específico para o geral.
const MIGALHAS: Array<{ prefixo: string; secao: string; detalhe: string }> = [
  { prefixo: "/escritorio/nomeacoes", secao: "Nomeações", detalhe: "Caixa de entrada" },
  { prefixo: "/escritorio/agenda", secao: "Agenda", detalhe: "Semana atual" },
  { prefixo: "/escritorio/mensagens", secao: "Mensagens", detalhe: "Atendimento" },
  { prefixo: "/escritorio/documentos", secao: "Documentos", detalhe: "Biblioteca" },
  { prefixo: "/escritorio/pesquisa", secao: "Pesquisa jurídica", detalhe: "Caso atual" },
  { prefixo: "/escritorio/honorarios", secao: "Honorários", detalhe: "Acompanhamento" },
  { prefixo: "/escritorio/formacao", secao: "Formação", detalhe: "Habilitações" },
  { prefixo: "/escritorio/oabpr", secao: "OAB/PR", detalhe: "Central da advocacia dativa" },
  { prefixo: "/escritorio/processos", secao: "Processos", detalhe: "Consulta" },
  { prefixo: "/escritorio/whatsapp", secao: "WhatsApp", detalhe: "Conexão" },
  { prefixo: "/escritorio/casos", secao: "Casos", detalhe: "Workspace do caso" },
  { prefixo: "/escritorio", secao: "Início", detalhe: "Visão geral" },
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

// Topbar do escritório: breadcrumb à esquerda e a identificação institucional à
// direita. O texto da direita não afirma habilitação verificada: a validação
// com a OAB/PR não existe nesta demonstração.
export function Barra() {
  const caminho = usePathname();
  const advogado = useAdvogado();
  const migalha = MIGALHAS.find((item) => caminho === item.prefixo || caminho.startsWith(`${item.prefixo}/`))
    ?? MIGALHAS[MIGALHAS.length - 1];

  return <header className="pd-topbar">
    <nav className="pd-breadcrumb" aria-label="Você está em">
      <span>{migalha.secao}</span>
      <span aria-hidden="true">›</span>
      <strong>{migalha.detalhe}</strong>
    </nav>
    <div className="pd-top-acoes">
      <span className="pd-oab-chip">Mantido pela OAB Paraná</span>
      <span className="pd-estado pd-estado-info" title={`Usuário ${advogado.usuario}`}>{advogado.oab}</span>
    </div>
  </header>;
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
  return <button type="button" className="pd-sair" onClick={sair} disabled={saindo}>
    <span aria-hidden="true">↪</span>{saindo ? "Saindo…" : "Sair"}
  </button>;
}
