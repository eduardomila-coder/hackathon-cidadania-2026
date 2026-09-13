"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Caso, ItemDoChecklistDaNomeacao, Nomeacao } from "@/lib/escritorio";
import { chamar, mensagemDeErro } from "../../casos/api";
import { formatarCnj, formatarData, formatarMomento } from "../../casos/formatos";

export function PaginaDaNomeacao({ inicial }: { inicial: Nomeacao }) {
  const router = useRouter();
  const [nomeacao, setNomeacao] = useState(inicial);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const ficha = nomeacao.camposExtraidos;
  const todasConferidas = nomeacao.checklist.length > 0 && nomeacao.checklist.every((item) => item.conferido);
  const url = `/api/escritorio/nomeacoes/${nomeacao.id}`;
  const prazo = ficha.dataPrazo ? formatarData(ficha.dataPrazo) : ficha.prazoInformado;

  async function alternarChecklist(item: ItemDoChecklistDaNomeacao) {
    setErro(null);
    setOcupado(item.id);
    try {
      const checklist = nomeacao.checklist.map((atual) => atual.id === item.id
        ? { ...atual, conferido: !atual.conferido, conferidoEm: !atual.conferido ? new Date().toISOString() : null }
        : atual);
      const atualizada = await chamar<Nomeacao>(url, { metodo: "PATCH", corpo: { checklist } });
      setNomeacao(atualizada);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(null);
    }
  }

  async function mudarEstado() {
    const estado = nomeacao.estado === "aberta" ? "arquivada" : "aberta";
    setErro(null);
    setOcupado("estado");
    try {
      const atualizada = await chamar<Nomeacao>(url, { metodo: "PATCH", corpo: { estado } });
      setNomeacao(atualizada);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(null);
    }
  }

  async function abrirCaso() {
    if (!todasConferidas || nomeacao.estado !== "aberta" || nomeacao.casoId) return;
    setErro(null);
    setOcupado("abrir");
    try {
      const resposta = await chamar<{ caso: Caso }>("/api/escritorio/nomeacao", { metodo: "POST", corpo: { texto: nomeacao.textoOriginal, ficha, nomeacaoId: nomeacao.id } });
      router.push(`/escritorio/casos/${resposta.caso.id}`);
    } catch (e) {
      setErro(mensagemDeErro(e));
      setOcupado(null);
    }
  }

  return <div className="pd-nomeacao-detalhe">
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">Nomeação</p>
        <h1>{ficha.ato ?? "Nomeação a conferir"}</h1>
        <p className="pd-auxiliar">Registrada em {formatarMomento(nomeacao.criadoEm)} · atualizada em {formatarMomento(nomeacao.atualizadoEm)}</p>
      </div>
      <div className="pd-nomeacao-detalhe-acoes">
        <Link href="/escritorio/nomeacoes" className="pd-botao pd-botao-quieto">Todas as nomeações</Link>
        <button type="button" className="pd-botao pd-botao-secundario" onClick={mudarEstado} disabled={ocupado !== null}>
          {ocupado === "estado" ? "Salvando…" : nomeacao.estado === "aberta" ? "Arquivar" : "Reabrir nomeação"}
        </button>
      </div>
    </div>

    <section className="pd-nomeacao-resumo" aria-label="Resumo da nomeação">
      <div>
        <p className="pd-eyebrow">{nomeacao.estado === "aberta" ? "Aberta para conferência" : "Arquivada"}</p>
        <h2>{ficha.processo ? formatarCnj(ficha.processo) : "Processo não identificado no texto"}</h2>
        <p className="pd-auxiliar">{ficha.orgao ?? "Órgão não consta no texto"}{ficha.ato ? ` · ${ficha.ato}` : ""}</p>
      </div>
      <div className="pd-nomeacao-prazo">
        <small>Prazo informado no texto</small>
        <strong>{prazo ?? "Não determinado"}</strong>
        <span>a conferir no processo oficial</span>
      </div>
    </section>

    {erro && <p role="alert" className="pd-aviso pd-aviso-risco">{erro}</p>}

    <section className="pd-cartao" aria-label="Ficha extraída">
      <div className="pd-cartao-cabeca"><h2>Ficha extraída</h2><span className="pd-auxiliar">leitura assistida, a conferir</span></div>
      <div className="pd-cartao-corpo">
        <dl className="pd-dados pd-nomeacao-grade">
          <div className="pd-dado"><dt>Processo</dt><dd>{ficha.processo ? <span className="pd-numero">{formatarCnj(ficha.processo)}</span> : <em>não consta no texto</em>}</dd></div>
          <div className="pd-dado"><dt>Órgão</dt><dd>{ficha.orgao ?? <em>não consta no texto</em>}</dd></div>
          <div className="pd-dado"><dt>Ato indicado</dt><dd>{ficha.ato ?? <em>não consta no texto</em>}</dd></div>
          <div className="pd-dado"><dt>Ciência</dt><dd>{ficha.dataCiencia ? formatarData(ficha.dataCiencia) : <em>não consta no texto</em>}</dd></div>
        </dl>
        <div className="pd-nomeacao-ficha">
          <Bloco titulo="Resumo"><p>{ficha.resumo}</p></Bloco>
          <Bloco titulo="Fundamentos a avaliar" itens={ficha.fundamentosAAvaliar} vazio="Nada sugerido pelo texto." />
          <Bloco titulo="Documentos a pedir" itens={ficha.documentosAPedir} vazio="Nenhum além do checklist padrão." />
          <Bloco titulo="Perguntas ao cliente" itens={ficha.perguntasAoCliente} vazio="Nenhuma por enquanto." />
          <Bloco titulo="Confira antes de confiar" itens={ficha.alertas} vazio="Sem alertas." classe="pd-nomeacao-alertas" />
        </div>
      </div>
    </section>

    <section className="pd-cartao" aria-label="Texto original da nomeação">
      <div className="pd-cartao-cabeca"><h2>Texto original</h2><span className="pd-auxiliar">como foi colado</span></div>
      <div className="pd-cartao-corpo"><pre className="pd-nomeacao-texto">{nomeacao.textoOriginal}</pre></div>
    </section>

    <section className="pd-cartao" aria-label="Conferências humanas">
      <div className="pd-cartao-cabeca"><h2>Conferências humanas</h2><span className="pd-auxiliar">{nomeacao.checklist.filter((item) => item.conferido).length} de {nomeacao.checklist.length} marcadas</span></div>
      <div className="pd-cartao-corpo">
        <p className="pd-aviso pd-aviso-atencao">Marque apenas o que você conferiu. O caso só pode ser aberto depois de todas as confirmações.</p>
        <ul className="pd-nomeacao-checklist">
          {nomeacao.checklist.map((item) => <li key={item.id}>
            <label className="pd-nomeacao-check">
              <input type="checkbox" checked={item.conferido} onChange={() => alternarChecklist(item)} disabled={ocupado !== null} />
              <span><strong>{item.descricao}</strong>{item.conferidoEm ? `Conferido em ${formatarMomento(item.conferidoEm)}` : "Pendente de conferência humana"}</span>
            </label>
          </li>)}
        </ul>
        <div className="pd-nomeacao-acoes">
          {nomeacao.casoId
            ? <Link href={`/escritorio/casos/${nomeacao.casoId}`} className="pd-botao pd-botao-primario">Ver caso aberto</Link>
            : <button type="button" className="pd-botao pd-botao-primario" onClick={abrirCaso} disabled={ocupado !== null || !todasConferidas || nomeacao.estado !== "aberta"}>
              {ocupado === "abrir" ? "Abrindo…" : "Abrir caso a partir da ficha"}
            </button>}
          <span className="pd-auxiliar">{nomeacao.estado === "arquivada" ? "Reabra a nomeação para abrir um caso." : todasConferidas ? "Todas as conferências foram registradas." : "Conclua todas as conferências para liberar a abertura do caso."}</span>
        </div>
      </div>
    </section>
  </div>;
}

function Bloco({ titulo, itens, vazio, classe = "", children }: { titulo: string; itens?: string[]; vazio?: string; classe?: string; children?: React.ReactNode }) {
  return <div className={classe}>
    <h3>{titulo}</h3>
    {children ?? (itens && itens.length > 0 ? <ul>{itens.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{vazio}</p>)}
  </div>;
}
