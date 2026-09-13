"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAdvogado } from "./Advogado";

// Ícones do protótipo (24px, traço 1.7), um por seção.
const TRACOS: Record<string, React.ReactNode> = {
  home: <><path d="M4 11 12 4l8 7v9H5z" /><path d="M9 20v-6h6v6" /></>,
  appt: <><path d="M6 4h12v16H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  cases: <path d="M4 7h6l2 2h8v10H4z" />,
  cal: <><rect x="4" y="5" width="16" height="15" rx="1" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
  msg: <path d="M4 5h16v11H8l-4 3z" />,
  docs: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
  money: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></>,
  training: <><path d="m3 9 9-5 9 5-9 5z" /><path d="M7 12v5c3 2 7 2 10 0v-5" /></>,
  oab: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" /></>,
  gov: <path d="M4 20h16M6 17h12M8 17V9M12 17V9M16 17V9M5 9h14L12 4z" />,
  cert: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></>,
};

export type Contagens = { nomeacoes: number; prazos: number; mensagens: number };

type Ligacao = { destino: string; nome: string; icone: keyof typeof TRACOS; contagem?: keyof Contagens; tambem?: string[] };

// Grupos, ordem e nomes como no protótipo.
const GRUPOS: Array<{ grupo: string; ligacoes: Ligacao[] }> = [
  {
    grupo: "Trabalho",
    ligacoes: [
      { destino: "/escritorio", nome: "Início", icone: "home" },
      { destino: "/escritorio/nomeacoes", nome: "Nomeações", icone: "appt", contagem: "nomeacoes" },
      { destino: "/escritorio/casos", nome: "Casos", icone: "cases", tambem: ["/escritorio/processos"] },
      { destino: "/escritorio/agenda", nome: "Agenda e prazos", icone: "cal", contagem: "prazos" },
      { destino: "/escritorio/mensagens", nome: "Mensagens", icone: "msg", contagem: "mensagens", tambem: ["/escritorio/whatsapp"] },
      { destino: "/escritorio/documentos", nome: "Documentos", icone: "docs" },
    ],
  },
  {
    grupo: "Apoio técnico",
    ligacoes: [
      { destino: "/escritorio/pesquisa", nome: "Pesquisa jurídica", icone: "search" },
      { destino: "/escritorio/honorarios", nome: "Honorários dativos", icone: "money" },
      { destino: "/escritorio/formacao", nome: "Formação e habilitações", icone: "training" },
      { destino: "/escritorio/certificado", nome: "Certificado digital", icone: "cert" },
      { destino: "/escritorio/projudi", nome: "PROJUDI", icone: "gov" },
    ],
  },
  {
    grupo: "Institucional",
    ligacoes: [
      { destino: "/escritorio/oabpr", nome: "Central OAB/PR", icone: "oab" },
      { destino: "/escritorio/gestao", nome: "Gestão do programa", icone: "gov" },
    ],
  },
];

// Breadcrumb da topbar, por prefixo de rota. Do mais específico para o geral.
const MIGALHAS: Array<{ prefixo: string; secao: string; detalhe: string }> = [
  { prefixo: "/escritorio/nomeacoes/", secao: "Nomeações", detalhe: "Nomeação registrada" },
  { prefixo: "/escritorio/nomeacoes", secao: "Nomeações", detalhe: "Caixa de entrada" },
  { prefixo: "/escritorio/casos/", secao: "Casos", detalhe: "Workspace do caso" },
  { prefixo: "/escritorio/casos", secao: "Casos", detalhe: "Todos os casos" },
  { prefixo: "/escritorio/agenda", secao: "Agenda", detalhe: "Semana atual" },
  { prefixo: "/escritorio/mensagens", secao: "Mensagens", detalhe: "Atendimento" },
  { prefixo: "/escritorio/whatsapp", secao: "Mensagens", detalhe: "Conexão do WhatsApp" },
  { prefixo: "/escritorio/documentos", secao: "Documentos", detalhe: "Biblioteca" },
  { prefixo: "/escritorio/pesquisa", secao: "Pesquisa jurídica", detalhe: "Caso atual" },
  { prefixo: "/escritorio/honorarios", secao: "Honorários", detalhe: "Acompanhamento" },
  { prefixo: "/escritorio/formacao", secao: "Formação", detalhe: "Habilitações" },
  { prefixo: "/escritorio/oabpr", secao: "OAB/PR", detalhe: "Central da advocacia dativa" },
  { prefixo: "/escritorio/gestao", secao: "Gestão institucional", detalhe: "Programa" },
  { prefixo: "/escritorio/processos", secao: "Casos", detalhe: "Consulta processual" },
  { prefixo: "/escritorio", secao: "Início", detalhe: "Visão geral" },
];

function Icone({ nome }: { nome: keyof typeof TRACOS }) {
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{TRACOS[nome]}</svg>;
}

export function Navegacao({ contagens, aoNavegar }: { contagens: Contagens; aoNavegar?: () => void }) {
  const caminho = usePathname();
  const atual = ({ destino, tambem = [] }: Ligacao) => destino === "/escritorio"
    ? caminho === "/escritorio"
    : [destino, ...tambem].some((prefixo) => caminho === prefixo || caminho.startsWith(`${prefixo}/`));

  return <nav className="nav" aria-label="Seções do escritório">
    {GRUPOS.map(({ grupo, ligacoes }) => <div key={grupo} style={{ display: "contents" }}>
      <div className="nav-label">{grupo}</div>
      {ligacoes.map((ligacao) => {
        const quantos = ligacao.contagem ? contagens[ligacao.contagem] : 0;
        return <Link key={ligacao.destino} href={ligacao.destino} onClick={aoNavegar}
          className={`nav-item${atual(ligacao) ? " active" : ""}`} aria-current={atual(ligacao) ? "page" : undefined}>
          <Icone nome={ligacao.icone} />
          <span>{ligacao.nome}</span>
          {quantos > 0 && <span className="nav-count" aria-label={`${quantos} em aberto`}>{quantos}</span>}
        </Link>;
      })}
    </div>)}
  </nav>;
}

// Casca inteira: menu lateral, topbar, faixa de demonstração e o conteúdo
// da tela (que vem do servidor como children). É cliente só para abrir e
// fechar o menu no celular.
export function Casca({ contagens, children }: { contagens: Contagens; children: React.ReactNode }) {
  const advogado = useAdvogado();
  const [aberto, setAberto] = useState(false);
  return <div className="app">
    <aside className={`sidebar${aberto ? " open" : ""}`} id="sidebar">
      <Link href="/escritorio" className="brand" aria-label="Escritório Dativo, ir para o início">
        <div className="ed-symbol" aria-hidden="true" />
        <div className="brand-copy"><strong>Escritório Dativo</strong><small>OAB Paraná · Advocacia Dativa</small></div>
      </Link>
      <Navegacao contagens={contagens} aoNavegar={() => setAberto(false)} />
      <div className="sidebar-bottom">
        <div className="user">
          <div className="avatar" aria-hidden="true">{iniciais(advogado.nome)}</div>
          <div><strong>{advogado.nome}</strong><small>{advogado.oab}</small></div>
          <span className="status st-ok">Ativa</span>
        </div>
        <BotaoSair />
      </div>
    </aside>
    <main className="main">
      <Barra aoAbrirMenu={() => setAberto((valor) => !valor)} />
      <div className="demo">DEMONSTRAÇÃO · DADOS FICTÍCIOS · A DECISÃO TÉCNICA, O PRAZO E O ATO PROCESSUAL SÃO SEMPRE DE RESPONSABILIDADE DO ADVOGADO</div>
      <div className="content">{children}</div>
    </main>
  </div>;
}

// Iniciais para o avatar, como no protótipo ("AM").
function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return `${primeira}${ultima}`.toUpperCase() || "?";
}

// Topbar: breadcrumb à esquerda, identificação institucional à direita. O
// chip da direita diz o que é verdade aqui (a conta está ativa); a habilitação
// perante a OAB/PR não é validada nesta demonstração.
function Barra({ aoAbrirMenu }: { aoAbrirMenu: () => void }) {
  const caminho = usePathname();
  const migalha = MIGALHAS.find((item) => item.prefixo.endsWith("/")
    ? caminho.startsWith(item.prefixo) && caminho.length > item.prefixo.length
    : caminho === item.prefixo || caminho.startsWith(`${item.prefixo}/`))
    ?? MIGALHAS[MIGALHAS.length - 1];

  return <header className="topbar">
    <div className="inline">
      <button type="button" className="icon-btn mobile-menu" aria-label="Abrir menu" onClick={aoAbrirMenu}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <nav className="breadcrumb" aria-label="Você está em"><span>{migalha.secao}</span><span aria-hidden="true">›</span><strong>{migalha.detalhe}</strong></nav>
    </div>
    <div className="top-actions">
      <span className="oab-chip">Mantido pela OAB Paraná</span>
      <span className="status st-ok">Conta ativa</span>
      <Link href="/#duvidas" className="icon-btn" aria-label="Dúvidas frequentes" title="Dúvidas frequentes">?</Link>
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
  return <button type="button" className="nav-item" style={{ marginTop: 3 }} onClick={sair} disabled={saindo}>
    <span style={{ width: 16 }} aria-hidden="true">↪</span>{saindo ? "Saindo…" : "Sair"}
  </button>;
}
