"use client";

import Link from "next/link";
import { useState } from "react";
import type { Origem, Situacao } from "@/lib/escritorio";
import { descreverPrazo, formatarCnj, formatarData, formatarMomento, NOMES_DA_ORIGEM, NOMES_DA_SITUACAO, SITUACOES } from "./formatos";

export type CasoNaLista = {
  id: string; titulo: string; cliente: string | null; origem: Origem;
  processo: string | null; orgao: string | null; prazo: string | null; situacao: Situacao;
  ultimo: { texto: string; quando: string } | null;
};

type Filtro = "todos" | Situacao;

const CLASSE_DA_SITUACAO: Record<Situacao, string> = { novo: "warn-text", em_andamento: "info-text", aguardando_cliente: "warn-text", concluido: "muted" };

export function ListaDeCasos({ casos }: { casos: CasoNaLista[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const contagem = (chave: Filtro) => chave === "todos" ? casos.length : casos.filter((caso) => caso.situacao === chave).length;
  const visiveis = casos.filter((caso) => (filtro === "todos" || caso.situacao === filtro) && (!termo
    || [caso.titulo, caso.cliente, caso.processo, caso.orgao].some((campo) => campo?.toLowerCase().includes(termo))));

  return <>
    <div className="toolbar">
      <div className="tabs" role="tablist" aria-label="Situação do caso">
        {(["todos", ...SITUACOES] as Filtro[]).map((chave) => <button key={chave} type="button" role="tab" aria-selected={filtro === chave}
          className={`tab${filtro === chave ? " active" : ""}`} onClick={() => setFiltro(chave)}>
          {chave === "todos" ? "Todos" : NOMES_DA_SITUACAO[chave]}{contagem(chave) > 0 ? ` ${contagem(chave)}` : ""}
        </button>)}
      </div>
      <input className="input" style={{ width: 230 }} placeholder="Caso, parte ou processo" value={busca} onChange={(evento) => setBusca(evento.target.value)} aria-label="Buscar caso" />
    </div>
    <section className="card">
      <div className="list">
        {visiveis.length === 0 && <div className="vazio"><strong>{termo ? "Nada encontrado." : "Nenhum caso nesta situação."}</strong>Abra um caso pelo relato ou registre uma nomeação.</div>}
        {visiveis.map((caso) => {
          const prazo = descreverPrazo(caso.prazo);
          const urgente = caso.situacao !== "concluido" && prazo && ["vencido", "hoje", "urgente", "proximo"].includes(prazo.tom);
          return <Link key={caso.id} href={`/escritorio/casos/${caso.id}`} className="list-row" style={{ borderLeft: 0, borderRight: 0, borderTop: 0, background: "white" }}>
            <div><div className="list-title">{caso.cliente ?? caso.titulo}</div><div className="list-meta mono">{[caso.processo ? formatarCnj(caso.processo) : null, caso.orgao ?? NOMES_DA_ORIGEM[caso.origem]].filter(Boolean).join(" · ")}{caso.cliente ? ` · ${caso.titulo}` : ""}</div></div>
            <span className={`row-state ${urgente ? "risk-text" : CLASSE_DA_SITUACAO[caso.situacao]}`}>{urgente ? (prazo!.tom === "vencido" ? "Prazo vencido" : "Prazo próximo") : NOMES_DA_SITUACAO[caso.situacao]}</span>
            <strong className={`deadline-text${urgente ? " risk-text" : ""}`}>{caso.prazo ? formatarData(caso.prazo) : "Sem data"}</strong>
            <span className="small muted">{caso.ultimo ? `${caso.ultimo.texto.slice(0, 60)}${caso.ultimo.texto.length > 60 ? "…" : ""} · ${formatarMomento(caso.ultimo.quando, { comAno: false })}` : "Sem registro"}</span>
            <span className="chev">›</span>
          </Link>;
        })}
      </div>
    </section>
  </>;
}
