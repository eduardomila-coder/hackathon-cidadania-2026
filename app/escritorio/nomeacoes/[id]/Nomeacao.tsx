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
  const [verTexto, setVerTexto] = useState(false);
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

  const conferidos = nomeacao.checklist.filter((item) => item.conferido).length;
  const estado = nomeacao.casoId ? { texto: "Caso aberto", tom: "ok" }
    : nomeacao.estado === "arquivada" ? { texto: "Arquivada", tom: "neutral" }
    : todasConferidas ? { texto: "Pronta para abrir o caso", tom: "ok" }
    : { texto: "Precisa conferência", tom: "warn" };

  return <>
    <div className="hero-case">
      <div className="hero-case-grid">
        <div><div className="eyebrow">Nomeação registrada</div><h1>{ficha.ato ?? "Nomeação a conferir"}</h1><p className="mono">{ficha.processo ? formatarCnj(ficha.processo) : "Processo não identificado no texto"}{ficha.orgao ? ` · ${ficha.orgao}` : ""}</p></div>
        <div className="inline"><span className={`status st-${estado.tom}`}>{estado.texto}</span><Link href="/escritorio/nomeacoes" className="btn btn-secondary">Voltar</Link></div>
      </div>
      <div className="case-meta-grid">
        <div className="meta-box"><label>Origem</label><strong>Intimação colada pelo advogado</strong></div>
        <div className="meta-box"><label>Ato indicado</label><strong>{ficha.ato ?? "Não consta no texto"}</strong></div>
        <div className="meta-box"><label>Prazo</label><strong style={{ color: "var(--risk)" }}>{prazo ? `${prazo} · conferir` : "Não determinado · conferir"}</strong></div>
        <div className="meta-box"><label>Ciência</label><strong>{ficha.dataCiencia ? formatarData(ficha.dataCiencia) : "Não consta no texto"}</strong></div>
      </div>
    </div>

    {erro && <div role="alert" className="notice risk" style={{ marginBottom: 13 }}>{erro}</div>}

    <div className="detail-grid">
      <div className="stack">
        <section className="card">
          <div className="card-head"><h2>Leitura assistida da nomeação</h2><button type="button" className="btn btn-secondary btn-sm" onClick={() => setVerTexto((valor) => !valor)}>{verTexto ? "Ocultar texto original" : "Ver texto original"}</button></div>
          <div className="card-body">
            <div className="assist-note"><div className="assist-icon">i</div><div><strong>O assistente estruturou a intimação. Ele não contou prazo nem tomou decisão processual.</strong><p>Revise cada campo antes de abrir o caso.</p></div></div>
            {verTexto && <pre className="texto-original">{nomeacao.textoOriginal}</pre>}
            <div className="extracted"><label>Processo</label><div className="mono">{ficha.processo ? formatarCnj(ficha.processo) : "Não consta no texto"}</div></div>
            <div className="extracted"><label>Órgão</label><div>{ficha.orgao ?? "Não consta no texto"}</div></div>
            <div className="extracted"><label>Ato sugerido</label><div>{ficha.ato ?? "Não consta no texto"}</div></div>
            <div className="extracted"><label>Resumo</label><div>{ficha.resumo}</div></div>
            <div className="extracted"><label>Prazo</label><div>{prazo
              ? <><span className="status st-warn">Informado no texto</span> <span className="small">{prazo}. Data escrita na intimação, a conferir no processo oficial.</span></>
              : <><span className="status st-risk">Não inferido</span> <span className="small">A intimação não contém data final inequívoca.</span></>}</div></div>
            <div className="extracted"><label>Pontos a verificar</label><div>{ficha.alertas.length ? <ul className="lista-simples">{ficha.alertas.map((item) => <li key={item}>{item}</li>)}</ul> : "Inteiro teor do processo, documentação existente, contato da parte, providência imediata e eventual audiência designada."}</div></div>
            <div className="extracted"><label>Fundamentos a avaliar</label><div>{ficha.fundamentosAAvaliar.length ? <ul className="lista-simples">{ficha.fundamentosAAvaliar.map((item) => <li key={item}>{item}</li>)}</ul> : "Nada sugerido pelo texto."}</div></div>
            <div className="extracted"><label>Documentos a pedir</label><div>{ficha.documentosAPedir.length ? <ul className="lista-simples">{ficha.documentosAPedir.map((item) => <li key={item}>{item}</li>)}</ul> : "Nenhum além do checklist padrão."}</div></div>
            <div className="extracted"><label>Perguntas ao cliente</label><div>{ficha.perguntasAoCliente.length ? <ul className="lista-simples">{ficha.perguntasAoCliente.map((item) => <li key={item}>{item}</li>)}</ul> : "Nenhuma por enquanto."}</div></div>
          </div>
        </section>
      </div>
      <aside className="stack">
        <section className="decision">
          <div className="eyebrow">Antes de abrir o caso</div><h3 style={{ fontSize: 14, marginTop: 5 }}>Checklist mínimo</h3><p>Marque apenas o que você conferiu. O caso só abre depois de todas as confirmações ({conferidos} de {nomeacao.checklist.length}).</p>
          {nomeacao.checklist.map((item) => <label className="task" key={item.id} style={{ cursor: ocupado ? "wait" : "pointer" }}>
            <input type="checkbox" className="sr-only" checked={item.conferido} onChange={() => alternarChecklist(item)} disabled={ocupado !== null} />
            <span className="check" aria-hidden="true">{item.conferido ? "✓" : ""}</span>
            <div><strong>{item.descricao}</strong><span>{item.conferidoEm ? `conferido em ${formatarMomento(item.conferidoEm)}` : "confirmação humana"}</span></div>
          </label>)}
        </section>
        <section className="card"><div className="card-head"><h2>Próximo passo</h2></div><div className="card-body stack">
          {nomeacao.casoId
            ? <Link href={`/escritorio/casos/${nomeacao.casoId}`} className="btn btn-primary btn-block">Abrir workspace do caso</Link>
            : <button type="button" className="btn btn-primary btn-block" onClick={abrirCaso} disabled={ocupado !== null || !todasConferidas || nomeacao.estado !== "aberta"}>
              {ocupado === "abrir" ? "Abrindo…" : "Criar workspace do caso"}
            </button>}
          <Link href="/escritorio/nomeacoes" className="btn btn-secondary btn-block">Salvar para revisar depois</Link>
          <button type="button" className="btn btn-quiet btn-block" onClick={mudarEstado} disabled={ocupado !== null}>
            {ocupado === "estado" ? "Salvando…" : nomeacao.estado === "aberta" ? "Arquivar registro" : "Reabrir registro"}
          </button>
          <p className="tiny muted" style={{ margin: 0 }}>{nomeacao.estado === "arquivada" ? "Reabra a nomeação para abrir um caso." : todasConferidas ? "Todas as conferências foram registradas." : "Conclua todas as conferências para liberar a abertura do caso."}</p>
        </div></section>
        <div className="notice warn">Qualquer aceite, recusa ou manifestação que produza efeito processual deve ser praticado no canal oficial adequado.</div>
      </aside>
    </div>
  </>;
}
