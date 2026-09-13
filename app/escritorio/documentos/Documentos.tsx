"use client";

import Link from "next/link";
import { useState } from "react";
import { chamar, mensagemDeErro } from "../casos/api";

export type DocumentoNaTela = {
  id: string;
  nome: string;
  detalhe: string;
  essencial: boolean;
  recebido: boolean;
  atualizadoEm: string;
  atualizadoOrdem: string;
};

export type GrupoDeDocumentos = {
  casoId: string;
  titulo: string;
  cliente: string | null;
  situacao: string;
  documentos: DocumentoNaTela[];
};

type Resumo = { pendentes: number; essenciaisPendentes: number; recebidos: number; grupos: number };
type Aba = "recentes" | "porCaso" | "pendentes" | "recebidos";

const ABAS: Array<{ chave: Aba; nome: string }> = [
  { chave: "recentes", nome: "Recentes" },
  { chave: "porCaso", nome: "Por caso" },
  { chave: "pendentes", nome: "Pendentes" },
  { chave: "recebidos", nome: "Recebidos" },
];

// Sigla do cartão pelo nome do documento, como o protótipo mostra PDF/IMG/DOC.
function sigla(nome: string) {
  const n = nome.toLowerCase();
  if (/(contrato|proposta|procura|declara|peti|manifesta)/.test(n)) return "DOC";
  if (/(foto|print|imagem)/.test(n)) return "IMG";
  if (/(rg|cnh|identifica|cpf)/.test(n)) return "ID";
  return "PDF";
}

// A marcação de recebido grava pela rota do caso (PATCH /api/escritorio/casos/
// [id]/documentos), a mesma que a página do caso usa. Não há envio de arquivo
// nesta demonstração: o cartão diz o que o documento é e se já chegou.
export function Documentos({ grupos, resumo }: { grupos: GrupoDeDocumentos[]; resumo: Resumo }) {
  const [aba, setAba] = useState<Aba>("recentes");
  const [busca, setBusca] = useState("");
  const [mudancas, setMudancas] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const estadoDe = (documento: DocumentoNaTela) => mudancas[documento.id] ?? documento.recebido;

  async function alternar(casoId: string, documento: DocumentoNaTela) {
    const alvo = !estadoDe(documento);
    setSalvando(documento.id);
    setErro(null);
    setRecado(null);
    try {
      await chamar(`/api/escritorio/casos/${casoId}/documentos`, { metodo: "PATCH", corpo: { id: documento.id, recebido: alvo } });
      setMudancas((atual) => ({ ...atual, [documento.id]: alvo }));
      setRecado(alvo ? `"${documento.nome}" marcado como recebido.` : `"${documento.nome}" voltou para pendente.`);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(null);
    }
  }

  const termo = busca.trim().toLowerCase();
  const todos = grupos.flatMap((grupo) => grupo.documentos.map((documento) => ({ grupo, documento })));
  const filtrados = todos.filter(({ grupo, documento }) => (!termo || documento.nome.toLowerCase().includes(termo) || grupo.titulo.toLowerCase().includes(termo) || (grupo.cliente ?? "").toLowerCase().includes(termo))
    && (aba === "pendentes" ? !estadoDe(documento) : aba === "recebidos" ? estadoDe(documento) : true));
  const recentes = [...filtrados].sort((a, b) => b.documento.atualizadoOrdem.localeCompare(a.documento.atualizadoOrdem));

  function Cartao({ grupo, documento }: { grupo: GrupoDeDocumentos; documento: DocumentoNaTela }) {
    const recebido = estadoDe(documento);
    return <div className="doc-card">
      <div className="doc-icon">{sigla(documento.nome)}</div>
      <div style={{ minWidth: 0 }}>
        <strong>{documento.nome}</strong>
        <p>{grupo.cliente ?? grupo.titulo} · {recebido ? `recebido ${documento.atualizadoEm}` : documento.detalhe || "a pedir"}</p>
        <button type="button" className="btn btn-quiet btn-sm doc-acao" onClick={() => alternar(grupo.casoId, documento)} disabled={salvando === documento.id}>
          {salvando === documento.id ? "Salvando…" : recebido ? "Desmarcar" : "Marcar recebido"}
        </button>
      </div>
      {recebido
        ? <span className="status st-ok">Cliente</span>
        : documento.essencial ? <span className="status st-risk">Essencial</span> : <span className="status st-warn">Pendente</span>}
    </div>;
  }

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Arquivos</div><h1>Documentos</h1><p>Documentos recebidos e a receber em cada caso. O envio de arquivo não está ligado nesta demonstração: o que o cliente manda pela conversa, você marca aqui como recebido.</p></div>
      <div className="inline"><Link href="/escritorio/casos" className="btn btn-secondary">Abrir casos</Link></div>
    </div>
    <section className="metrics" style={{ marginBottom: 16 }}>
      <div className="metric"><label>Pendentes</label><strong>{resumo.pendentes}</strong><small>ainda não recebidos</small></div>
      <div className="metric"><label>Essenciais pendentes</label><strong>{resumo.essenciaisPendentes}</strong><small>travam o andamento</small></div>
      <div className="metric"><label>Recebidos</label><strong>{resumo.recebidos}</strong><small>conferidos e marcados</small></div>
      <div className="metric"><label>Casos com checklist</label><strong>{resumo.grupos}</strong><small>com documentos a pedir</small></div>
    </section>
    <div className="toolbar">
      <div className="tabs" role="tablist">
        {ABAS.map(({ chave, nome }) => <button key={chave} type="button" role="tab" aria-selected={aba === chave} className={`tab${aba === chave ? " active" : ""}`} onClick={() => setAba(chave)}>{nome}</button>)}
      </div>
      <input className="input" style={{ width: 230 }} placeholder="Buscar documento" value={busca} onChange={(evento) => setBusca(evento.target.value)} aria-label="Buscar documento" />
    </div>
    <p className="small" role="status" aria-live="polite" style={{ minHeight: 18, margin: "0 0 10px", color: erro ? "var(--risk)" : "var(--ink-3)" }}>{erro ?? recado}</p>

    {todos.length === 0 && <div className="card"><div className="vazio"><strong>Nenhum checklist ainda.</strong>O checklist de documentos nasce junto com o caso: abra um caso ou registre uma nomeação.</div></div>}

    {aba === "porCaso"
      ? grupos.map((grupo) => {
        const itens = filtrados.filter((item) => item.grupo.casoId === grupo.casoId);
        if (itens.length === 0) return null;
        const pendentes = itens.filter(({ documento }) => !estadoDe(documento)).length;
        return <section key={grupo.casoId} style={{ marginBottom: 18 }}>
          <div className="inline" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <div><strong className="small">{grupo.cliente ?? grupo.titulo}</strong><span className="tiny muted"> · {grupo.titulo} · {grupo.situacao}</span></div>
            <div className="inline">{pendentes > 0 ? <span className="status st-warn">{pendentes} {pendentes === 1 ? "pendente" : "pendentes"}</span> : <span className="status st-ok">Completo</span>}<Link href={`/escritorio/casos/${grupo.casoId}`} className="btn btn-quiet btn-sm">Abrir caso</Link></div>
          </div>
          <div className="doc-grid">{itens.map(({ documento }) => <Cartao key={documento.id} grupo={grupo} documento={documento} />)}</div>
        </section>;
      })
      : <div className="doc-grid">
        {recentes.map(({ grupo, documento }) => <Cartao key={documento.id} grupo={grupo} documento={documento} />)}
        {todos.length > 0 && recentes.length === 0 && <div className="vazio" style={{ gridColumn: "1 / -1" }}><strong>Nada aqui.</strong>Troque de aba ou limpe a busca.</div>}
      </div>}
  </>;
}
