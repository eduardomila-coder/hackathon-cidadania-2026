"use client";

import Link from "next/link";
import { useState } from "react";
import type { Situacao } from "@/lib/escritorio";
import type { TomDoPrazo } from "../casos/formatos";

export type NomeacaoNaTela = {
  id: string;
  titulo: string;
  cliente: string | null;
  processo: string | null;
  orgao: string | null;
  ato: string | null;
  situacao: Situacao;
  situacaoNome: string;
  registradaEm: string;
  prazo: { data: string; texto: string; tom: TomDoPrazo } | null;
  ultimoRegistro: { texto: string; quando: string } | null;
};

type Filtro = "todas" | "conferir" | "aberto" | "concluidas";

// "A conferir" são as nomeações que ainda estão como caso novo; "caso aberto"
// junta o que já andou ou espera o cliente; "concluídas" é o encerrado.
const FILTROS: Array<{ chave: Filtro; nome: string }> = [
  { chave: "todas", nome: "Todas" },
  { chave: "conferir", nome: "A conferir" },
  { chave: "aberto", nome: "Caso aberto" },
  { chave: "concluidas", nome: "Concluídas" },
];

function combina(situacao: Situacao, filtro: Filtro) {
  if (filtro === "todas") return true;
  if (filtro === "conferir") return situacao === "novo";
  if (filtro === "concluidas") return situacao === "concluido";
  return situacao === "em_andamento" || situacao === "aguardando_cliente";
}

const CLASSE_DO_TOM: Record<TomDoPrazo, string> = {
  vencido: "pd-estado pd-estado-risco",
  hoje: "pd-estado pd-estado-risco",
  urgente: "pd-estado pd-estado-atencao",
  proximo: "pd-estado pd-estado-atencao",
  normal: "pd-estado",
};

function MarcaDaNomeacao({ situacao }: { situacao: Situacao }) {
  if (situacao === "novo") return <span className="pd-estado pd-estado-atencao">A conferir no processo</span>;
  if (situacao === "concluido") return <span className="pd-estado pd-estado-ok">Caso concluído</span>;
  return <span className="pd-estado pd-estado-info">Caso aberto</span>;
}

export function ListaDeNomeacoes({ nomeacoes }: { nomeacoes: NomeacaoNaTela[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const visiveis = nomeacoes.filter((item) => combina(item.situacao, filtro));

  if (nomeacoes.length === 0) {
    return <div className="pd-vazio">
      <strong>Nenhuma nomeação registrada ainda.</strong>
      Quando chegar uma intimação de nomeação, abra <Link href="/escritorio">a mesa de trabalho</Link> e use <b>Nova nomeação</b>: o texto colado vira uma ficha com processo, órgão, ato e prazo, e o caso só abre depois que você conferir.
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
          const quantidade = nomeacoes.filter((item) => combina(item.situacao, chave)).length;
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
      <span>Nomeação e cliente</span>
      <span>Processo e órgão</span>
      <span>Situação</span>
      <span>Prazo anotado</span>
      <span>Último registro</span>
      <span />
    </div>

    {visiveis.length === 0
      ? <p className="pd-nomeacoes-sem-filtro">Nenhuma nomeação neste filtro.</p>
      : <div className="pd-lista">
        {visiveis.map((item) => <Link key={item.id} className="pd-linha" href={`/escritorio/casos/${item.id}`}>
          <div className="pd-nomeacoes-celula">
            <p className="pd-linha-titulo">{item.titulo}</p>
            <p className="pd-linha-meta">
              {item.cliente ?? "sem cliente vinculado"} · registrada em {item.registradaEm}
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
            <p className="pd-eyebrow pd-so-estreito">Situação</p>
            <MarcaDaNomeacao situacao={item.situacao} />
            <p className="pd-linha-meta">{item.situacaoNome}</p>
          </div>

          <div className="pd-nomeacoes-celula">
            <p className="pd-eyebrow pd-so-estreito">Prazo anotado</p>
            {item.prazo
              ? <>
                <p className="pd-numero">{item.prazo.data}</p>
                <span className={CLASSE_DO_TOM[item.prazo.tom]}>{item.prazo.texto}</span>
              </>
              : <p className="pd-auxiliar">sem data anotada</p>}
          </div>

          <div className="pd-nomeacoes-celula">
            <p className="pd-eyebrow pd-so-estreito">Último registro</p>
            {item.ultimoRegistro
              ? <>
                <p className="pd-nomeacoes-registro">{item.ultimoRegistro.texto}</p>
                <p className="pd-linha-meta">{item.ultimoRegistro.quando}</p>
              </>
              : <p className="pd-auxiliar">sem registro na linha do tempo</p>}
          </div>

          <span className="pd-seta" aria-hidden="true">›</span>
        </Link>)}
      </div>}
  </section>;
}
