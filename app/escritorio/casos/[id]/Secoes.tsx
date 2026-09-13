"use client";

import { useState, type FormEvent } from "react";
import type { Caso, Documento, Processo as ProcessoDoCaso, Registro, Tarefa } from "@/lib/escritorio";
import { chamar, mensagemDeErro } from "../api";
import { descreverPrazo, formatarCnj, formatarData, formatarMomento } from "../formatos";
import type { Atualizar } from "./Caso";

// Seções da página do caso que são listas com um formulário embaixo:
// documentos, tarefas, registros; e a consulta do processo no TJPR.

// ── Documentos ──────────────────────────────────────────────────────────────
export function Documentos({ casoId, documentos, atualizar }: { casoId: string; documentos: Documento[]; atualizar: Atualizar }) {
  const [nome, setNome] = useState("");
  const [detalhe, setDetalhe] = useState("");
  const [essencial, setEssencial] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const url = `/api/escritorio/casos/${casoId}/documentos`;

  async function alternar(documento: Documento) {
    setErro(null);
    setOcupado(documento.id);
    try {
      const atualizado = await chamar<Documento>(url, { metodo: "PATCH", corpo: { id: documento.id, recebido: !documento.recebido } });
      atualizar((dados) => ({ ...dados, documentos: dados.documentos.map((item) => item.id === atualizado.id ? atualizado : item) }));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(null);
    }
  }

  async function adicionar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setOcupado("novo");
    try {
      const documento = await chamar<Documento>(url, { metodo: "POST", corpo: { nome, detalhe, essencial } });
      atualizar((dados) => ({ ...dados, documentos: [...dados.documentos, documento] }));
      setNome(""); setDetalhe(""); setEssencial(false);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(null);
    }
  }

  const recebidos = documentos.filter((documento) => documento.recebido).length;
  return <section className="pd-cartao pdc-secao" aria-label="Documentos">
    <div className="md-titulo-linha">
      <div><p className="md-eyebrow">Documentos</p><h2>Checklist</h2></div>
      <span className="md-contador">{recebidos} de {documentos.length} recebidos</span>
    </div>
    {documentos.length === 0 ? <p className="pdc-vazio">Nenhum documento na lista. Adicione o que você precisa pedir ao cliente.</p> : <ul className="md-checklist pdc-checklist">{documentos.map((documento) => <li key={documento.id} className={documento.recebido ? "pdc-recebido" : ""}>
      <button type="button" aria-pressed={documento.recebido} aria-label={`${documento.recebido ? "Desmarcar" : "Marcar como recebido"}: ${documento.nome}`} onClick={() => alternar(documento)} disabled={ocupado === documento.id}>{documento.recebido ? "✓" : ""}</button>
      <div><strong>{documento.nome}{documento.essencial && <em>essencial</em>}</strong>{documento.detalhe && <small>{documento.detalhe}</small>}</div>
      <b>{documento.recebido ? "recebido" : "pendente"}</b>
    </li>)}</ul>}
    <form className="md-adicionar pdc-adicionar" onSubmit={adicionar}>
      <label htmlFor="novo-documento">Pedir outro documento</label>
      <div>
        <input id="novo-documento" value={nome} onChange={(evento) => setNome(evento.target.value)} maxLength={200} placeholder="Nome do documento" required />
        <input value={detalhe} onChange={(evento) => setDetalhe(evento.target.value)} maxLength={500} placeholder="Para que serve (opcional)" />
        <label className="pdc-marcar"><input type="checkbox" checked={essencial} onChange={(evento) => setEssencial(evento.target.checked)} /> essencial</label>
        <button type="submit" disabled={ocupado === "novo" || !nome.trim()}>{ocupado === "novo" ? "Adicionando…" : "Adicionar"}</button>
      </div>
    </form>
    {erro && <p role="alert" className="pdc-erro">{erro}</p>}
  </section>;
}

// ── Prazos e tarefas ────────────────────────────────────────────────────────
export function Tarefas({ casoId, tarefas, atualizar }: { casoId: string; tarefas: Tarefa[]; atualizar: Atualizar }) {
  const [titulo, setTitulo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const url = `/api/escritorio/casos/${casoId}/tarefas`;

  function ordenar(lista: Tarefa[]) {
    return [...lista].sort((a, b) => {
      if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
      return (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999") || a.criadoEm.localeCompare(b.criadoEm);
    });
  }

  async function alternar(tarefa: Tarefa) {
    setErro(null);
    setOcupado(tarefa.id);
    try {
      const atualizada = await chamar<Tarefa>(url, { metodo: "PATCH", corpo: { id: tarefa.id, concluida: !tarefa.concluida } });
      atualizar((dados) => ({ ...dados, tarefas: ordenar(dados.tarefas.map((item) => item.id === atualizada.id ? atualizada : item)) }));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(null);
    }
  }

  async function adicionar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setOcupado("nova");
    try {
      const tarefa = await chamar<Tarefa>(url, { metodo: "POST", corpo: { titulo, prazo: prazo || null } });
      atualizar((dados) => ({ ...dados, tarefas: ordenar([...dados.tarefas, tarefa]) }));
      setTitulo(""); setPrazo("");
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(null);
    }
  }

  const pendentes = tarefas.filter((tarefa) => !tarefa.concluida).length;
  return <section className="pd-cartao pdc-secao" aria-label="Prazos e tarefas">
    <div className="md-titulo-linha">
      <div><p className="md-eyebrow">Prazos e tarefas</p><h2>O que fazer</h2></div>
      <span className="md-contador">{pendentes === 0 ? "tudo feito" : pendentes === 1 ? "1 pendente" : `${pendentes} pendentes`}</span>
    </div>
    {tarefas.length === 0 ? <p className="pdc-vazio">Nenhuma tarefa. Anote o que precisa ser feito e a data, e o prazo aparece no painel.</p> : <ul className="pdc-tarefas">{tarefas.map((tarefa) => {
      const descricao = tarefa.prazo && !tarefa.concluida ? descreverPrazo(tarefa.prazo) : null;
      return <li key={tarefa.id} className={tarefa.concluida ? "pdc-concluida" : ""}>
        <button type="button" aria-pressed={tarefa.concluida} aria-label={`${tarefa.concluida ? "Reabrir" : "Concluir"}: ${tarefa.titulo}`} onClick={() => alternar(tarefa)} disabled={ocupado === tarefa.id}>{tarefa.concluida ? "✓" : ""}</button>
        <div>
          <strong>{tarefa.titulo}</strong>
          <small className={descricao ? `pdc-prazo tom-${descricao.tom}` : ""}>{tarefa.prazo ? <>{formatarData(tarefa.prazo)}{descricao ? ` · ${descricao.texto}` : ""}</> : "sem data"}</small>
        </div>
      </li>;
    })}</ul>}
    <form className="md-adicionar pdc-adicionar" onSubmit={adicionar}>
      <label htmlFor="nova-tarefa">Nova tarefa</label>
      <div>
        <input id="nova-tarefa" value={titulo} onChange={(evento) => setTitulo(evento.target.value)} maxLength={200} placeholder="O que precisa ser feito" required />
        <input type="date" value={prazo} onChange={(evento) => setPrazo(evento.target.value)} aria-label="Data da tarefa" />
        <button type="submit" disabled={ocupado === "nova" || !titulo.trim()}>{ocupado === "nova" ? "Adicionando…" : "Adicionar"}</button>
      </div>
    </form>
    {erro && <p role="alert" className="pdc-erro">{erro}</p>}
  </section>;
}

// ── Processo (consulta pública no TJPR) ─────────────────────────────────────
export function Processo({ caso, processo, atualizar, recarregar }: { caso: Caso; processo: ProcessoDoCaso | null; atualizar: Atualizar; recarregar: () => Promise<void> }) {
  const [consultando, setConsultando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function consultar() {
    setErro(null);
    setConsultando(true);
    try {
      const novo = await chamar<ProcessoDoCaso>(`/api/escritorio/casos/${caso.id}/processo`, { metodo: "POST" });
      atualizar((dados) => ({ ...dados, processo: novo }));
      await recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setConsultando(false);
    }
  }

  return <section className="pd-cartao pdc-secao" aria-label="Processo">
    <div className="md-titulo-linha">
      <div><p className="md-eyebrow">Processo</p><h2>Andamento no TJPR</h2></div>
      <button type="button" className="md-botao-secundario pdc-botao-pequeno" onClick={consultar} disabled={consultando || !caso.processo}>{consultando ? "Consultando…" : "Consultar no TJPR"}</button>
    </div>
    {caso.processo
      ? <p className="pdc-numero">{formatarCnj(caso.processo)}</p>
      : <p className="pdc-vazio">Sem número de processo. Coloque o número CNJ na ficha para consultar o andamento público.</p>}
    {erro && <p role="alert" className="pdc-erro">{erro}</p>}
    {processo ? <>
      <dl className="pdc-dados">
        <div><dt>Classe</dt><dd>{processo.classe ?? <em>não informada</em>}</dd></div>
        <div><dt>Órgão julgador</dt><dd>{processo.orgao ?? <em>não informado</em>}</dd></div>
        <div className="pdc-dado-largo"><dt>Último andamento</dt><dd>{processo.ultimoMovimento ?? <em>sem movimentação informada</em>}{processo.dataMovimento && <small> · {formatarMomento(processo.dataMovimento)}</small>}</dd></div>
      </dl>
      <p className="md-texto-auxiliar">Consultado em {formatarMomento(processo.consultadoEm)} na base pública do DataJud. É consulta pontual: não vale como intimação e não conta prazo.</p>
    </> : caso.processo && <p className="md-texto-auxiliar">A consulta busca a classe, o órgão e o último andamento na base pública do DataJud. Não vale como intimação e não conta prazo.</p>}
  </section>;
}

// ── Registros (linha do tempo) ──────────────────────────────────────────────
const NOME_DO_TIPO: Record<Registro["tipo"], string> = { registro: "Sistema", assistente: "Assistente", humano: "Você", whatsapp: "WhatsApp" };
const CLASSE_DO_TIPO: Record<Registro["tipo"], string> = { registro: "", assistente: "md-evento-mila", humano: "md-evento-humano", whatsapp: "pdc-evento-whatsapp" };

export function Registros({ casoId, registros, atualizar }: { casoId: string; registros: Registro[]; atualizar: Atualizar }) {
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function anotar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const registro = await chamar<Registro>(`/api/escritorio/casos/${casoId}/registros`, { metodo: "POST", corpo: { texto, tipo: "humano" } });
      atualizar((dados) => ({ ...dados, registros: [registro, ...dados.registros] }));
      setTexto("");
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return <section className="pd-cartao pdc-secao" aria-label="Registros do caso">
    <div className="md-titulo-linha">
      <div><p className="md-eyebrow">Registros</p><h2>Linha do tempo</h2></div>
      <span className="md-contador">{registros.length === 1 ? "1 registro" : `${registros.length} registros`}</span>
    </div>
    <form className="md-campo pdc-anotar" onSubmit={anotar}>
      <label htmlFor="nova-nota">Anotar</label>
      <textarea id="nova-nota" value={texto} onChange={(evento) => setTexto(evento.target.value)} maxLength={5000} rows={3} placeholder="O que aconteceu, o que combinou com o cliente, o que falta." />
      <button type="submit" disabled={salvando || !texto.trim()}>{salvando ? "Anotando…" : "Anotar"}</button>
    </form>
    {erro && <p role="alert" className="pdc-erro">{erro}</p>}
    <ul className="md-linha-tempo pdc-linha-tempo">{registros.map((registro) => <li key={registro.id} className={CLASSE_DO_TIPO[registro.tipo]}>
      <i aria-hidden="true" />
      <div><strong>{registro.texto}</strong><small>{NOME_DO_TIPO[registro.tipo]} · {formatarMomento(registro.quando)}</small></div>
    </li>)}</ul>
  </section>;
}
