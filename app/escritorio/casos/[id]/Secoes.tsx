"use client";

import { useId, useState, type FormEvent } from "react";
import type { Caso, Documento, Processo as ProcessoDoCaso, Registro, Tarefa } from "@/lib/escritorio";
import { chamar, mensagemDeErro } from "../api";
import { descreverPrazo, formatarCnj, formatarData, formatarMomento, type TomDoPrazo } from "../formatos";
import type { Atualizar } from "./Caso";

// Seções da página do caso que são listas com um formulário embaixo:
// documentos, tarefas e registros; e a consulta do processo no TJPR.
// Tom do prazo nunca é só cor: vai junto o texto do estado.

export const CLASSE_DO_TOM: Record<TomDoPrazo, string> = {
  vencido: "pd-estado-risco",
  hoje: "pd-estado-atencao",
  urgente: "pd-estado-atencao",
  proximo: "pd-estado-info",
  normal: "",
};

// Caixa de marcar de 44 px: o quadrado desenhado é menor, a área de toque não.
function Marcar({ marcado, rotulo, aoClicar, desabilitado }: { marcado: boolean; rotulo: string; aoClicar: () => void; desabilitado: boolean }) {
  return <button type="button" className="pdc-marcar" aria-pressed={marcado} aria-label={rotulo} onClick={aoClicar} disabled={desabilitado}>
    <span aria-hidden="true">{marcado ? "✓" : ""}</span>
  </button>;
}

// ── Documentos ──────────────────────────────────────────────────────────────
export function Documentos({ casoId, documentos, atualizar }: { casoId: string; documentos: Documento[]; atualizar: Atualizar }) {
  const idBase = useId();
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
  return <section className="pd-cartao" aria-label="Documentos do caso">
    <div className="pd-cartao-cabeca">
      <h2>Documentos</h2>
      <span className="pd-auxiliar">{recebidos} de {documentos.length} recebidos</span>
    </div>
    {documentos.length === 0
      ? <div className="pd-cartao-corpo">
        <p className="pd-vazio"><strong>Nenhum documento na lista.</strong>Adicione o que você precisa pedir ao cliente. A triagem também sugere o que pedir.</p>
      </div>
      : <ul className="pd-lista pdc-lista-documentos">
        {documentos.map((documento) => <li key={documento.id} className={`pd-linha ${documento.recebido ? "pdc-recebido" : ""}`}>
          <Marcar
            marcado={documento.recebido}
            rotulo={`${documento.recebido ? "Desmarcar" : "Marcar como recebido"}: ${documento.nome}`}
            aoClicar={() => alternar(documento)}
            desabilitado={ocupado === documento.id}
          />
          <div className="pdc-linha-texto">
            <span className="pd-linha-titulo">{documento.nome}{documento.essencial && <em className="pdc-essencial">essencial</em>}</span>
            {documento.detalhe && <span className="pd-linha-meta">{documento.detalhe}</span>}
          </div>
          <span className={`pd-estado ${documento.recebido ? "pd-estado-ok" : "pd-estado-atencao"}`}>{documento.recebido ? "recebido" : "pendente"}</span>
        </li>)}
      </ul>}
    <form className="pd-cartao-corpo pdc-adicionar" onSubmit={adicionar}>
      <div className="pd-campo">
        <label htmlFor={`${idBase}-documento`}>Pedir outro documento</label>
        <input id={`${idBase}-documento`} className="pd-entrada" value={nome} onChange={(evento) => setNome(evento.target.value)} maxLength={200} placeholder="Nome do documento" required />
      </div>
      <div className="pd-campo">
        <label htmlFor={`${idBase}-detalhe`}>Para que serve</label>
        <input id={`${idBase}-detalhe`} className="pd-entrada" value={detalhe} onChange={(evento) => setDetalhe(evento.target.value)} maxLength={500} placeholder="Opcional" />
      </div>
      <label className="pdc-interruptor" htmlFor={`${idBase}-essencial`}>
        <input id={`${idBase}-essencial`} type="checkbox" checked={essencial} onChange={(evento) => setEssencial(evento.target.checked)} /> essencial
      </label>
      <button type="submit" className="pd-botao pd-botao-secundario" disabled={ocupado === "novo" || !nome.trim()}>{ocupado === "novo" ? "Adicionando…" : "Adicionar"}</button>
    </form>
    {erro && <p role="alert" className="pd-aviso pd-aviso-risco pdc-erro-fora">{erro}</p>}
  </section>;
}

// ── Prazos e tarefas ────────────────────────────────────────────────────────
export function Tarefas({ casoId, tarefas, atualizar }: { casoId: string; tarefas: Tarefa[]; atualizar: Atualizar }) {
  const idBase = useId();
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

  const lista = ordenar(tarefas);
  const pendentes = lista.filter((tarefa) => !tarefa.concluida).length;
  return <section className="pd-cartao" aria-label="Prazos e tarefas">
    <div className="pd-cartao-cabeca">
      <h2>Prazos e tarefas</h2>
      <span className="pd-auxiliar">{pendentes === 0 ? "tudo feito" : pendentes === 1 ? "1 pendente" : `${pendentes} pendentes`}</span>
    </div>
    {lista.length === 0
      ? <div className="pd-cartao-corpo">
        <p className="pd-vazio"><strong>Nenhuma tarefa.</strong>Anote o que precisa ser feito e a data; o prazo aparece aqui e no painel do escritório.</p>
      </div>
      : <ul className="pd-lista pdc-lista-tarefas">
        {lista.map((tarefa) => {
          const quando = tarefa.prazo && !tarefa.concluida ? descreverPrazo(tarefa.prazo) : null;
          return <li key={tarefa.id} className={`pd-linha ${tarefa.concluida ? "pdc-concluida" : ""}`}>
            <Marcar
              marcado={tarefa.concluida}
              rotulo={`${tarefa.concluida ? "Reabrir" : "Concluir"}: ${tarefa.titulo}`}
              aoClicar={() => alternar(tarefa)}
              desabilitado={ocupado === tarefa.id}
            />
            <div className="pdc-linha-texto">
              <span className="pd-linha-titulo">{tarefa.titulo}</span>
              <span className="pd-linha-meta">{tarefa.prazo ? formatarData(tarefa.prazo) : "sem data"}</span>
            </div>
            {tarefa.concluida
              ? <span className="pd-estado pd-estado-ok">concluída</span>
              : quando
                ? <span className={`pd-estado ${CLASSE_DO_TOM[quando.tom]}`}>{quando.texto}</span>
                : <span className="pd-estado">aberta</span>}
          </li>;
        })}
      </ul>}
    <form className="pd-cartao-corpo pdc-adicionar" onSubmit={adicionar}>
      <div className="pd-campo">
        <label htmlFor={`${idBase}-tarefa`}>Nova tarefa</label>
        <input id={`${idBase}-tarefa`} className="pd-entrada" value={titulo} onChange={(evento) => setTitulo(evento.target.value)} maxLength={200} placeholder="O que precisa ser feito" required />
      </div>
      <div className="pd-campo">
        <label htmlFor={`${idBase}-data`}>Data da tarefa</label>
        <input id={`${idBase}-data`} className="pd-entrada" type="date" value={prazo} onChange={(evento) => setPrazo(evento.target.value)} />
      </div>
      <button type="submit" className="pd-botao pd-botao-secundario" disabled={ocupado === "nova" || !titulo.trim()}>{ocupado === "nova" ? "Adicionando…" : "Adicionar"}</button>
    </form>
    {erro && <p role="alert" className="pd-aviso pd-aviso-risco pdc-erro-fora">{erro}</p>}
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

  return <section className="pd-cartao" aria-label="Processo">
    <div className="pd-cartao-cabeca">
      <h2>Andamento no TJPR</h2>
      <button type="button" className="pd-botao pd-botao-secundario pd-botao-pequeno" onClick={consultar} disabled={consultando || !caso.processo}>
        {consultando ? "Consultando…" : "Consultar no TJPR"}
      </button>
    </div>
    <div className="pd-cartao-corpo">
      {caso.processo
        ? <p className="pdc-numero-cnj">{formatarCnj(caso.processo)}</p>
        : <p className="pd-vazio"><strong>Sem número de processo.</strong>Coloque o número CNJ na ficha do caso para consultar o andamento público.</p>}

      {processo
        ? <>
          <dl className="pdc-chaves">
            <div><dt>Classe</dt><dd>{processo.classe ?? <em>não informada</em>}</dd></div>
            <div><dt>Órgão julgador</dt><dd>{processo.orgao ?? <em>não informado</em>}</dd></div>
            <div>
              <dt>Último andamento</dt>
              <dd>{processo.ultimoMovimento ?? <em>sem movimentação informada</em>}{processo.dataMovimento && <small> · {formatarMomento(processo.dataMovimento)}</small>}</dd>
            </div>
          </dl>
          <p className="pd-aviso">Consultado em {formatarMomento(processo.consultadoEm)} na base pública do DataJud. É consulta pontual: não vale como intimação e não conta prazo. Confira sempre no processo oficial.</p>
        </>
        : caso.processo && <p className="pd-aviso">A consulta busca a classe, o órgão e o último andamento na base pública do DataJud. Não vale como intimação e não conta prazo.</p>}
      {erro && <p role="alert" className="pd-aviso pd-aviso-risco">{erro}</p>}
    </div>
  </section>;
}

// ── Registros (linha do tempo) ──────────────────────────────────────────────
const NOME_DO_TIPO: Record<Registro["tipo"], string> = { registro: "Sistema", assistente: "Assistente", humano: "Você", whatsapp: "WhatsApp" };
const CLASSE_DO_TIPO: Record<Registro["tipo"], string> = { registro: "", assistente: "pdc-tempo-assistente", humano: "pdc-tempo-humano", whatsapp: "pdc-tempo-whatsapp" };

export function Registros({ casoId, registros, atualizar }: { casoId: string; registros: Registro[]; atualizar: Atualizar }) {
  const idCampo = useId();
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

  return <section className="pd-cartao" aria-label="Registros do caso">
    <div className="pd-cartao-cabeca">
      <h2>Registros</h2>
      <span className="pd-auxiliar">{registros.length === 1 ? "1 registro" : `${registros.length} registros`}</span>
    </div>
    <div className="pd-cartao-corpo">
      <form className="pdc-anotar" onSubmit={anotar}>
        <div className="pd-campo">
          <label htmlFor={`${idCampo}-nota`}>Anotar no caso</label>
          <textarea id={`${idCampo}-nota`} className="pd-area-texto" value={texto} onChange={(evento) => setTexto(evento.target.value)} maxLength={5000} rows={3} placeholder="O que aconteceu, o que combinou com o cliente, o que falta." />
        </div>
        <button type="submit" className="pd-botao pd-botao-secundario" disabled={salvando || !texto.trim()}>{salvando ? "Anotando…" : "Anotar"}</button>
      </form>
      {erro && <p role="alert" className="pd-aviso pd-aviso-risco">{erro}</p>}
      {registros.length === 0
        ? <p className="pd-vazio"><strong>Nenhum registro.</strong>A triagem, a consulta ao TJPR e o WhatsApp escrevem aqui sozinhos. Você também pode anotar o que combinou com o cliente.</p>
        : <ol className="pd-tempo pdc-linha-tempo">{registros.map((registro) => <li key={registro.id} className={CLASSE_DO_TIPO[registro.tipo]}>
          <strong>{registro.texto}</strong>
          <time>{NOME_DO_TIPO[registro.tipo]} · {formatarMomento(registro.quando)}</time>
        </li>)}</ol>}
    </div>
  </section>;
}
