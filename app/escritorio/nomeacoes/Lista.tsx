"use client";

import Link from "next/link";
import { useState } from "react";
import type { EstadoDaNomeacao } from "@/lib/escritorio";

export type NomeacaoNaTela = {
  id: string;
  titulo: string;
  processo: string | null;
  orgao: string | null;
  ato: string | null;
  estado: EstadoDaNomeacao;
  casoId: string | null;
  registradaEm: string;
  atualizadaEm: string;
};

type Filtro = "todas" | "abertas" | "arquivadas" | "caso_aberto";

const FILTROS: Array<{ chave: Filtro; nome: string }> = [
  { chave: "todas", nome: "Todas" },
  { chave: "abertas", nome: "Abertas" },
  { chave: "arquivadas", nome: "Arquivadas" },
  { chave: "caso_aberto", nome: "Com caso aberto" },
];

function combina(nomeacao: NomeacaoNaTela, filtro: Filtro) {
  if (filtro === "todas") return true;
  if (filtro === "abertas") return nomeacao.estado === "aberta";
  if (filtro === "arquivadas") return nomeacao.estado === "arquivada";
  return Boolean(nomeacao.casoId);
}

function MarcaDoEstado({ estado }: { estado: EstadoDaNomeacao }) {
  return estado === "aberta"
    ? <span className="pd-estado pd-estado-atencao">Aberta</span>
    : <span className="pd-estado">Arquivada</span>;
}

export function ListaDeNomeacoes({ nomeacoes }: { nomeacoes: NomeacaoNaTela[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const visiveis = nomeacoes.filter((item) => combina(item, filtro));

  if (nomeacoes.length === 0) {
    return <div className="pd-vazio">
      <strong>Nenhuma nomeação registrada ainda.</strong>
      Quando chegar uma intimação de nomeação, abra <Link href="/escritorio">a mesa de trabalho</Link> e use <b>Nova nomeação</b>: o texto colado vira uma ficha e um registro próprio para a sua conferência.
    </div>;
  }

  return <section className="pd-cartao" aria-label="Nomeações registradas">
    <div className="pd-cartao-cabeca">
      <h2>Registros de nomeação</h2>
      <span className="pd-auxiliar">{visiveis.length} de {nomeacoes.length}</span>
    </div>

    <div className="pd-nomeacoes-abas">
      <div className="pd-abas" role="tablist" aria-label="Filtrar nomeações">
        {FILTROS.map(({ chave, nome }) => {
          const quantidade = nomeacoes.filter((item) => combina(item, chave)).length;
          return <button
            key={chave}
            type="button"
            role="tab"
            className="pd-aba"
            aria-selected={filtro === chave}
            onClick={() => setFiltro(chave)}
          >{nome} <span className="pd-numero">{quantidade}</span></button>;
        })}
      </div>
    </div>

    <div className="pd-nomeacoes-cabecalho" aria-hidden="true">
      <span>Nomeação</span>
      <span>Processo e órgão</span>
      <span>Estado</span>
      <span>Caso</span>
      <span>Atualizada</span>
      <span />
    </div>

    {visiveis.length === 0
      ? <p className="pd-nomeacoes-sem-filtro">Nenhuma nomeação neste filtro.</p>
      : <div className="pd-lista">
        {visiveis.map((item) => <Link key={item.id} className="pd-linha" href={`/escritorio/nomeacoes/${item.id}`}>
          <div className="pd-nomeacoes-celula">
            <p className="pd-linha-titulo">{item.titulo}</p>
            <p className="pd-linha-meta">
              registrada em {item.registradaEm}
            </p>
          </div>

          <div className="pd-nomeacoes-celula">
            <p className="pd-eyebrow pd-so-estreito">Processo e órgão</p>
            {item.processo
              ? <p className="pd-numero">{item.processo}</p>
              : <p className="pd-auxiliar">número não consta no registro</p>}
            <p className="pd-linha-meta">{item.orgao ?? "órgão não consta"}{item.ato ? ` · ${item.ato}` : ""}</p>
          </div>

          <div className="pd-nomeacoes-celula">
            <p className="pd-eyebrow pd-so-estreito">Estado</p>
            <MarcaDoEstado estado={item.estado} />
            <p className="pd-linha-meta">{item.estado === "aberta" ? "aguarda sua decisão" : "registro preservado"}</p>
          </div>

          <div className="pd-nomeacoes-celula">
            <p className="pd-eyebrow pd-so-estreito">Caso</p>
            {item.casoId
              ? <span className="pd-estado pd-estado-ok">Caso aberto</span>
              : <p className="pd-auxiliar">ainda não aberto</p>}
          </div>

          <div className="pd-nomeacoes-celula">
            <p className="pd-eyebrow pd-so-estreito">Atualizada</p>
            <p className="pd-nomeacoes-registro">{item.atualizadaEm}</p>
            {item.ato && <p className="pd-linha-meta">{item.ato}</p>}
          </div>

          <span className="pd-seta" aria-hidden="true">›</span>
        </Link>)}
      </div>}
  </section>;
}
