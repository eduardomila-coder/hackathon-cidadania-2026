"use client";

import Link from "next/link";
import { useState } from "react";

export type AbaDaNomeacao = "pendentes" | "analise" | "convertidas" | "arquivadas";

export type NomeacaoNaTela = {
  id: string;
  destino: string;
  aba: AbaDaNomeacao;
  origem: string;           // "Registro manual", "Convertida"…
  registradaEm: string;
  titulo: string;           // parte assistida ou título do caso
  processo: string | null;
  orgao: string | null;
  estado: { texto: string; tom: "ok" | "warn" | "risk" | "info" | "neutral" };
  ato: string | null;
  prazo: string;            // "Prazo: conferir no processo", "17/09/2026 · em 4 dias"…
};

const ABAS: Array<{ chave: AbaDaNomeacao; nome: string }> = [
  { chave: "pendentes", nome: "Pendentes" },
  { chave: "analise", nome: "Em análise" },
  { chave: "convertidas", nome: "Convertidas em caso" },
  { chave: "arquivadas", nome: "Arquivadas" },
];

// Lista de nomeações no desenho do protótipo: abas, busca por processo, parte
// ou órgão, e uma linha por nomeação.
export function ListaDeNomeacoes({ nomeacoes }: { nomeacoes: NomeacaoNaTela[] }) {
  const [aba, setAba] = useState<AbaDaNomeacao>(nomeacoes.some((item) => item.aba === "pendentes") || nomeacoes.length === 0 ? "pendentes" : "convertidas");
  const [busca, setBusca] = useState("");

  const termo = busca.trim().toLowerCase();
  const contagem = (chave: AbaDaNomeacao) => nomeacoes.filter((item) => item.aba === chave).length;
  const visiveis = nomeacoes.filter((item) => item.aba === aba && (!termo
    || [item.titulo, item.processo, item.orgao, item.ato].some((campo) => campo?.toLowerCase().includes(termo))));

  return <>
    <div className="toolbar">
      <div className="tabs" role="tablist" aria-label="Situação da nomeação">
        {ABAS.map(({ chave, nome }) => <button key={chave} type="button" role="tab" aria-selected={aba === chave}
          className={`tab${aba === chave ? " active" : ""}`} onClick={() => setAba(chave)}>
          {nome}{contagem(chave) > 0 ? ` ${contagem(chave)}` : ""}
        </button>)}
      </div>
      <div className="inline">
        <input className="input" style={{ width: 230 }} placeholder="Processo, parte ou órgão" value={busca} onChange={(evento) => setBusca(evento.target.value)} aria-label="Buscar nomeação" />
      </div>
    </div>
    <section className="card">
      {visiveis.length === 0 && <div className="vazio">
        <strong>{termo ? "Nada encontrado com esse termo." : "Nenhuma nomeação aqui."}</strong>
        {aba === "pendentes" ? "Registre uma nomeação colando a intimação em Registrar nomeação." : "Troque de aba para ver as outras."}
      </div>}
      {visiveis.map((item) => <Link key={item.id} href={item.destino} className="appointment-row" style={{ width: "100%", background: "white", borderLeft: 0, borderRight: 0, borderTop: 0 }}>
        <div><span className="source-tag">{item.origem}</span><div className="tiny muted">{item.registradaEm}</div></div>
        <div><div className="appt-title">{item.titulo}</div><div className="appt-meta mono">{[item.processo, item.orgao].filter(Boolean).join(" · ") || "Processo não informado"}</div></div>
        <div><span className={`status st-${item.estado.tom}`}>{item.estado.texto}</span></div>
        <div className="small">{item.ato ?? "Ato a conferir"}</div>
        <div className="small muted">{item.prazo}</div>
        <div className="chev">›</div>
      </Link>)}
    </section>
  </>;
}
