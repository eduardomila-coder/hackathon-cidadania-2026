"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState, type Dispatch, type FormEvent, type KeyboardEvent as Tecla, type ReactNode, type SetStateAction } from "react";
import type { Caso, Cliente, DossieDoCaso, Situacao, Triagem } from "@/lib/escritorio";
import { Conversa } from "@/app/escritorio/Conversa";
import { useAdvogado } from "@/app/escritorio/Advogado";
import { chamar, mensagemDeErro } from "../api";
import {
  descreverPrazo, formatarCnj, formatarData, formatarMomento, formatarTelefone,
  NOMES_DA_ORIGEM, NOMES_DA_SITUACAO, ORIGENS, SITUACOES,
} from "../formatos";
import { CLASSE_DO_TOM, Documentos, Processo, Registros, Tarefas } from "./Secoes";
import { AgendaDoCaso } from "./AgendaDoCaso";
import { ForcaDoCaso, TriagemDoCaso } from "./Triagem";

export type Atualizar = Dispatch<SetStateAction<DossieDoCaso>>;

// As abas do caso. Cada uma é uma parte do mesmo dossiê: o cabeçalho do caso
// fica no alto, sempre à vista, e a pessoa troca de aba sem sair da página.
const ABAS = [
  { id: "visao", rotulo: "Visão geral" },
  { id: "tarefas", rotulo: "Tarefas" },
  { id: "processo", rotulo: "Processo" },
  { id: "relato", rotulo: "Relato e triagem" },
  { id: "documentos", rotulo: "Documentos" },
  { id: "conversa", rotulo: "Mensagens" },
  { id: "agenda", rotulo: "Agenda" },
  { id: "registros", rotulo: "Histórico" },
] as const;

type Aba = (typeof ABAS)[number]["id"];

export function PaginaDoCaso({ inicial, abaInicial }: { inicial: DossieDoCaso; abaInicial?: string }) {
  const [dados, setDados] = useState<DossieDoCaso>(inicial);
  const [aba, setAba] = useState<Aba>(ABAS.some((item) => item.id === abaInicial) ? abaInicial as Aba : "visao");
  const { caso, cliente } = dados;

  // Busca o dossiê de novo depois das ações que o servidor complementa
  // sozinho (triagem e consulta ao TJPR criam registros, por exemplo).
  const recarregar = useCallback(async () => {
    const novo = await chamar<DossieDoCaso>(`/api/escritorio/casos/${caso.id}`);
    setDados(novo);
  }, [caso.id]);

  const pendentes = {
    tarefas: dados.tarefas.filter((tarefa) => !tarefa.concluida).length,
    documentos: dados.documentos.filter((documento) => !documento.recebido).length,
  };

  // No alto, o prazo informado aparece sempre com o aviso de conferência. O
  // tom vem com texto junto: cor sozinha nunca diz o estado.
  const descricaoDoPrazo = descreverPrazo(caso.prazo);
  const prazoDoTopo = caso.situacao === "concluido"
    ? { tom: "normal", texto: "caso concluído", aviso: "" }
    : descricaoDoPrazo
      ? { tom: descricaoDoPrazo.tom, texto: descricaoDoPrazo.texto, aviso: "a conferir no processo oficial" }
      : { tom: "normal", texto: "", aviso: "sem prazo informado, a conferir no ato" };

  // Setas e Home/End movem o foco entre as abas, como manda o padrão de abas.
  function aoTeclar(evento: Tecla<HTMLElement>) {
    const atual = ABAS.findIndex((item) => item.id === aba);
    const passo = evento.key === "ArrowRight" ? 1 : evento.key === "ArrowLeft" ? -1 : 0;
    let destino = -1;
    if (passo !== 0) destino = (atual + passo + ABAS.length) % ABAS.length;
    else if (evento.key === "Home") destino = 0;
    else if (evento.key === "End") destino = ABAS.length - 1;
    if (destino < 0) return;
    evento.preventDefault();
    const proxima = ABAS[destino].id;
    setAba(proxima);
    document.getElementById(`aba-${proxima}`)?.focus();
  }

  return <div className="pdc-pagina">
    <div className="case-top">
      <div>
        <div className="eyebrow" style={{ color: "#8BCDF0" }}>{caso.situacao === "concluido" ? "Caso concluído" : "Caso ativo"} · {NOMES_DA_ORIGEM[caso.origem]}</div>
        <h1>{cliente ? cliente.nome : caso.titulo}</h1>
        <p className="mono">{caso.processo ? formatarCnj(caso.processo) : "sem número de processo"}{caso.orgao ? ` · ${caso.orgao}` : ""}{cliente ? ` · ${caso.titulo}` : ""}</p>
        <div className="case-top-cliente"><VincularCliente caso={caso} cliente={cliente} atualizar={setDados} /></div>
      </div>
      <div className="inline">
        <div className={`case-deadline-plain tom-${prazoDoTopo.tom}`}>
          <small>Prazo informado</small>
          <strong>{caso.prazo ? formatarData(caso.prazo) : "Sem data"}</strong>
          <span>{[prazoDoTopo.texto, prazoDoTopo.aviso].filter(Boolean).join(" · ")}</span>
        </div>
        <SituacaoDoCaso caso={caso} atualizar={setDados} />
      </div>
    </div>

    <nav className="case-tabs" role="tablist" aria-label="Seções do caso" onKeyDown={aoTeclar}>
      {ABAS.map((item) => {
        const contagem = pendentes[item.id as "tarefas" | "documentos"];
        return <button
          key={item.id}
          type="button"
          role="tab"
          id={`aba-${item.id}`}
          className={`case-tab${aba === item.id ? " active" : ""}`}
          aria-selected={aba === item.id}
          aria-controls={`painel-${item.id}`}
          tabIndex={aba === item.id ? 0 : -1}
          onClick={() => setAba(item.id)}
        >
          {item.rotulo}
          {contagem ? <span className="pdc-aba-contagem">{contagem}</span> : null}
        </button>;
      })}
    </nav>

    <Painel id="visao" aba={aba}><VisaoGeral dados={dados} atualizar={setDados} irPara={setAba} /></Painel>

    <Painel id="relato" aba={aba}>
      <Relato caso={caso} triagens={dados.triagens} atualizar={setDados} recarregar={recarregar} />
    </Painel>

    <Painel id="tarefas" aba={aba}>
      <Tarefas casoId={caso.id} tarefas={dados.tarefas} atualizar={setDados} />
    </Painel>

    <Painel id="documentos" aba={aba}>
      <Documentos casoId={caso.id} documentos={dados.documentos} atualizar={setDados} />
    </Painel>

    <Painel id="agenda" aba={aba}>
      <AgendaDoCaso casoId={caso.id} />
    </Painel>

    <Painel id="processo" aba={aba}>
      <Processo caso={caso} processo={dados.processo} atualizar={setDados} recarregar={recarregar} />
    </Painel>

    <Painel id="conversa" aba={aba}>
      <section className="pd-cartao" aria-label="Conversa com o cliente">
        <div className="pd-cartao-cabeca">
          <h2>Conversa</h2>
          <span className="pd-auxiliar">{cliente ? formatarTelefone(cliente.telefone) : "sem telefone cadastrado"}</span>
        </div>
        <div className="pdc-conversa-caixa">
          <Conversa contato={cliente?.telefone ?? null} casoId={caso.id} />
        </div>
      </section>
    </Painel>

    <Painel id="registros" aba={aba}>
      <Registros casoId={caso.id} registros={dados.registros} atualizar={setDados} />
    </Painel>
  </div>;
}

// ── Abas ────────────────────────────────────────────────────────────────────
// Os painéis ficam todos montados e só o ativo aparece: trocar de aba não
// perde o que estava sendo escrito no relato.
function Painel({ id, aba, children }: { id: Aba; aba: Aba; children: ReactNode }) {
  return <div
    className="pdc-aba-painel"
    id={`painel-${id}`}
    role="tabpanel"
    aria-labelledby={`aba-${id}`}
    hidden={aba !== id}
  >{children}</div>;
}

// ── Visão geral ─────────────────────────────────────────────────────────────
function VisaoGeral({ dados, atualizar, irPara }: { dados: DossieDoCaso; atualizar: Atualizar; irPara: (aba: Aba) => void }) {
  const { caso, cliente, documentos, tarefas, registros, triagens, processo } = dados;
  const advogado = useAdvogado();
  const triagem = triagens[0] ?? null;

  const abertas = [...tarefas].filter((tarefa) => !tarefa.concluida)
    .sort((a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"));
  const proxima = abertas[0] ?? null;
  const prazo = descreverPrazo(caso.prazo);
  const semDocumento = documentos.filter((documento) => !documento.recebido);
  const recentes = registros.slice(0, 4);

  const honorarios = dados.honorarios;
  const etapasFeitas = honorarios ? honorarios.etapas.filter((etapa) => etapa.concluida).length : 0;

  return <div className="workspace">
    <div className="stack">
      <div className="overview-grid">
        <section className="overview-card"><div className="eyebrow">Providência</div><h3 style={{ fontSize: 13, margin: "5px 0 9px" }}>{proxima ? proxima.titulo : "Nenhuma tarefa aberta"}</h3>
          <div className="key-value"><label>Prazo informado</label><strong style={{ color: caso.prazo ? "var(--risk)" : undefined }}>{caso.prazo ? `${formatarData(caso.prazo)} · ${prazo?.texto ? `${prazo.texto}, ` : ""}conferir no processo oficial` : "sem prazo definido, a conferir no ato"}</strong></div>
          <div className="key-value"><label>Responsável</label><strong>{advogado.nome}</strong></div>
          <div className="key-value"><label>Situação</label><strong>{NOMES_DA_SITUACAO[caso.situacao]}</strong></div>
        </section>
        <section className="overview-card"><div className="eyebrow">Processo</div><h3 style={{ fontSize: 13, margin: "5px 0 9px" }}>{processo ? "Último andamento consultado" : "Sem andamento consultado"}</h3>
          {processo
            ? <>
              <div className="key-value"><label>Data</label><strong>{processo.dataMovimento ? formatarMomento(processo.dataMovimento) : "não informada"}</strong></div>
              <div className="key-value"><label>Andamento</label><strong>{processo.ultimoMovimento ?? "sem movimentação informada"}</strong></div>
              <div className="key-value"><label>Fonte</label><strong>Consulta pública DataJud · não vale como intimação</strong></div>
            </>
            : <p className="small muted" style={{ margin: 0 }}>Abra a aba Processo para buscar classe, órgão e último andamento na base pública. É consulta pontual: não vale como intimação e não conta prazo.</p>}
          <button type="button" className="btn btn-quiet btn-sm" style={{ marginTop: 8, paddingLeft: 0 }} onClick={() => irPara("processo")}>Abrir processo →</button>
        </section>
      </div>

      <section className="card"><div className="card-head"><h2>Plano de trabalho</h2><button type="button" className="btn btn-secondary btn-sm" onClick={() => irPara("tarefas")}>{abertas.length > 0 ? `${abertas.length} ${abertas.length === 1 ? "aberta" : "abertas"}` : "Nova tarefa"}</button></div><div className="card-body">
        {abertas.length === 0
          ? <div className="vazio"><strong>Nada pendente.</strong>Anote o que precisa ser feito e a data na aba Tarefas.</div>
          : abertas.slice(0, 5).map((tarefa) => {
            const quando = tarefa.prazo ? descreverPrazo(tarefa.prazo) : null;
            const tom = quando ? (quando.tom === "vencido" || quando.tom === "hoje" ? "risk" : quando.tom === "urgente" || quando.tom === "proximo" ? "warn" : "neutral") : "neutral";
            return <div className="task" key={tarefa.id}><span className="check" aria-hidden="true" /><div><strong>{tarefa.titulo}</strong><span>{tarefa.prazo ? formatarData(tarefa.prazo) : "sem data"}</span></div><span className={`status st-${tom}`}>{quando ? quando.texto : "Sem data"}</span></div>;
          })}
      </div></section>

      <section className="card"><div className="card-head"><h2>Resumo técnico do caso</h2><button type="button" className="btn btn-secondary btn-sm" onClick={() => irPara("relato")}>{triagem ? "Ver a triagem" : "Triar com fontes"}</button></div><div className="card-body">
        {caso.resumo
          ? <p className="small" style={{ lineHeight: 1.65 }}>{caso.resumo}</p>
          : <p className="small muted">Sem resumo ainda. Escreva o relato na aba Relato e triagem, ou edite a ficha abaixo.</p>}
        {caso.fundamentos.length > 0 && <div className="notice"><strong>Hipóteses para avaliar:</strong> {caso.fundamentos.join("; ")}. O sistema não transforma isso em conclusão jurídica automática.</div>}
        {triagem && <div style={{ marginTop: 14 }}><ForcaDoCaso triagem={triagem} /></div>}
      </div></section>

      <Ficha caso={caso} atualizar={atualizar} />

      <section className="card"><div className="card-head"><h2>Atividade recente</h2><button type="button" className="btn btn-quiet btn-sm" onClick={() => irPara("registros")}>Ver histórico completo</button></div><div className="card-body activity">
        {recentes.length === 0
          ? <div className="vazio"><strong>Nenhum registro.</strong>O histórico guarda o que aconteceu no caso e o que foi combinado com o cliente.</div>
          : recentes.map((registro) => <div className="act" key={registro.id}><strong>{registro.texto}</strong><span>{formatarMomento(registro.quando)} · {NOME_DO_TIPO[registro.tipo]}</span></div>)}
      </div></section>
    </div>

    <aside className="stack">
      <section className="card"><div className="card-head"><h2>Assistida</h2>{cliente ? <span className="status st-ok">Contato vinculado</span> : <span className="status st-warn">Sem contato</span>}</div><div className="card-body">
        <div className="client-card">
          <strong>{cliente ? cliente.nome : "Sem cliente cadastrado"}</strong>
          <p>{cliente ? `${formatarTelefone(cliente.telefone)} · contato preferencial: WhatsApp` : "Cadastre o contato no alto da página para abrir a conversa."}</p>
          <div className="inline"><button type="button" className="btn btn-secondary btn-sm" onClick={() => irPara("conversa")}>Abrir conversa</button><button type="button" className="btn btn-quiet btn-sm" onClick={() => irPara("relato")}>Ver o relato</button></div>
        </div>
      </div></section>

      <section className="request-box"><div className="eyebrow">Coleta dirigida</div><h3 style={{ margin: "5px 0" }}>Pedir informações sem formulário público</h3><p>Você escolhe o que precisa e pede pela conversa do caso; o que chegar fica marcado no checklist.</p><button type="button" className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={() => irPara("conversa")}>Pedir pela conversa</button></section>

      <section className="card"><div className="card-head"><h2>Documentos</h2>{semDocumento.length > 0 ? <span className="status st-warn">{semDocumento.length} {semDocumento.length === 1 ? "pendente" : "pendentes"}</span> : <span className="status st-ok">Em dia</span>}</div><div className="card-body">
        {documentos.slice(0, 5).map((documento) => <div className="task" key={documento.id}><span className="check" aria-hidden="true">{documento.recebido ? "✓" : ""}</span><div><strong>{documento.nome}</strong><span>{documento.recebido ? "recebido" : documento.essencial ? "pendente · essencial" : "pendente"}</span></div></div>)}
        {documentos.length === 0 && <p className="small muted" style={{ margin: 0 }}>Nenhum documento na lista do caso.</p>}
        <button type="button" className="btn btn-secondary btn-sm btn-block" style={{ marginTop: 9 }} onClick={() => irPara("documentos")}>Ver documentos</button>
      </div></section>

      <section className="card"><div className="card-head"><h2>Honorários</h2></div><div className="card-body">
        <div className="small"><strong>{honorarios ? `${etapasFeitas} de ${honorarios.etapas.length} etapas concluídas` : "Fluxo ainda não iniciado"}</strong></div>
        <p className="tiny muted" style={{ margin: "3px 0 9px" }}>{honorarios ? "Acompanhamento aberto no módulo de honorários." : "Será aberto quando houver arbitramento ou certidão pertinente."}</p>
        <Link href={`/escritorio/honorarios?caso=${caso.id}`} className="btn btn-secondary btn-sm btn-block">Abrir módulo</Link>
      </div></section>
    </aside>
  </div>;
}

// ── Situação (select que salva na hora) ─────────────────────────────────────
function SituacaoDoCaso({ caso, atualizar }: { caso: Caso; atualizar: Atualizar }) {
  const [estado, setEstado] = useState<"parado" | "salvando" | "salvo" | "erro">("parado");
  const [erro, setErro] = useState<string | null>(null);

  async function mudar(situacao: Situacao) {
    setEstado("salvando");
    setErro(null);
    try {
      const atualizado = await chamar<Caso>(`/api/escritorio/casos/${caso.id}`, { metodo: "PATCH", corpo: { situacao } });
      atualizar((dados) => ({ ...dados, caso: atualizado }));
      setEstado("salvo");
    } catch (e) {
      setErro(mensagemDeErro(e));
      setEstado("erro");
    }
  }

  return <div className="case-situacao">
    <label htmlFor="situacao">Situação do caso</label>
    <select id="situacao" className="select" value={caso.situacao} onChange={(evento) => mudar(evento.target.value as Situacao)} disabled={estado === "salvando"}>
      {SITUACOES.map((opcao) => <option key={opcao} value={opcao}>{NOMES_DA_SITUACAO[opcao]}</option>)}
    </select>
    <small aria-live="polite">{estado === "salvando" ? "Salvando…" : estado === "salvo" ? "Salvo" : erro ?? "Salva na hora, sem botão"}</small>
  </div>;
}

// ── Cliente do caso ─────────────────────────────────────────────────────────
function VincularCliente({ caso, cliente, atualizar }: { caso: Caso; cliente: Cliente | null; atualizar: Atualizar }) {
  const idBase = useId();
  const [aberto, setAberto] = useState(false);
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [modo, setModo] = useState<"existente" | "novo">("novo");
  const [clienteId, setClienteId] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto || clientes) return;
    chamar<Cliente[]>("/api/escritorio/clientes")
      .then((lista) => {
        const outros = lista.filter((item) => item.id !== caso.clienteId);
        setClientes(outros);
        if (outros.length > 0) { setModo("existente"); setClienteId(outros[0].id); }
      })
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [aberto, clientes, caso.clienteId]);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      let escolhido: Cliente;
      if (modo === "existente") {
        const achado = clientes?.find((item) => item.id === clienteId);
        if (!achado) throw new Error("Escolha um cliente da lista.");
        escolhido = achado;
      } else {
        escolhido = await chamar<Cliente>("/api/escritorio/clientes", { metodo: "POST", corpo: { nome, telefone } });
      }
      const atualizado = await chamar<Caso>(`/api/escritorio/casos/${caso.id}`, { metodo: "PATCH", corpo: { clienteId: escolhido.id } });
      atualizar((dados) => ({ ...dados, caso: atualizado, cliente: escolhido }));
      setAberto(false);
      setClientes(null);
      setNome("");
      setTelefone("");
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) return <button type="button" className="case-top-vincular" onClick={() => setAberto(true)}>
    {cliente ? "Trocar o cliente" : "Cadastrar ou escolher o cliente"}
  </button>;

  return <form className="pdc-vincular" onSubmit={salvar} aria-label="Cliente do caso">
    {clientes && clientes.length > 0 && <div className="pdc-alternar" role="radiogroup" aria-label="Cliente novo ou já cadastrado">
      <label><input type="radio" name={`modo-cliente-${idBase}`} checked={modo === "existente"} onChange={() => setModo("existente")} /> Já cadastrado</label>
      <label><input type="radio" name={`modo-cliente-${idBase}`} checked={modo === "novo"} onChange={() => setModo("novo")} /> Cliente novo</label>
    </div>}
    {modo === "existente" && clientes && clientes.length > 0
      ? <div className="pd-campo">
        <label htmlFor={`${idBase}-existente`}>Quem é o cliente</label>
        <select id={`${idBase}-existente`} className="pd-selecao" value={clienteId} onChange={(evento) => setClienteId(evento.target.value)}>
          {clientes.map((item) => <option key={item.id} value={item.id}>{item.nome} · {formatarTelefone(item.telefone)}</option>)}
        </select>
      </div>
      : <div className="pdc-vincular-campos">
        <div className="pd-campo">
          <label htmlFor={`${idBase}-nome`}>Nome</label>
          <input id={`${idBase}-nome`} className="pd-entrada" value={nome} onChange={(evento) => setNome(evento.target.value)} maxLength={200} placeholder="Nome do cliente" required autoFocus />
        </div>
        <div className="pd-campo">
          <label htmlFor={`${idBase}-telefone`}>Telefone no WhatsApp, com DDD</label>
          <input id={`${idBase}-telefone`} className="pd-entrada" value={telefone} onChange={(evento) => setTelefone(evento.target.value)} inputMode="tel" placeholder="(41) 99999-9999" required />
        </div>
      </div>}
    {erro && <p role="alert" className="pd-aviso pd-aviso-risco pdc-erro">{erro}</p>}
    <div className="pd-linha-campos pdc-vincular-acoes">
      <button type="submit" className="pd-botao pd-botao-primario" disabled={salvando}>{salvando ? "Salvando…" : "Salvar cliente"}</button>
      <button type="button" className="pd-botao pd-botao-quieto" onClick={() => { setAberto(false); setErro(null); }} disabled={salvando}>Cancelar</button>
    </div>
  </form>;
}

// ── Ficha (leitura e edição inline) ─────────────────────────────────────────
function Ficha({ caso, atualizar }: { caso: Caso; atualizar: Atualizar }) {
  const idBase = useId();
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState(() => camposDaFicha(caso));

  function abrirEdicao() {
    setCampos(camposDaFicha(caso));
    setErro(null);
    setEditando(true);
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const atualizado = await chamar<Caso>(`/api/escritorio/casos/${caso.id}`, {
        metodo: "PATCH",
        corpo: {
          titulo: campos.titulo.trim(),
          origem: campos.origem,
          processo: campos.processo.trim() || null,
          orgao: campos.orgao.trim() || null,
          ato: campos.ato.trim() || null,
          prazo: campos.prazo || null,
          resumo: campos.resumo.trim(),
          fundamentos: campos.fundamentos.split("\n").map((linha) => linha.trim()).filter(Boolean),
        },
      });
      atualizar((dados) => ({ ...dados, caso: atualizado }));
      setEditando(false);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const mudar = (campo: keyof typeof campos) => (evento: { target: { value: string } }) => setCampos((atual) => ({ ...atual, [campo]: evento.target.value }));

  if (editando) return <section className="pd-cartao" aria-label="Editar a ficha">
    <div className="pd-cartao-cabeca"><h2>Editar a ficha</h2></div>
    <form className="pd-cartao-corpo pdc-ficha-form" onSubmit={salvar}>
      <div className="pd-campo pdc-campo-largo">
        <label htmlFor={`${idBase}-titulo`}>Título do caso</label>
        <input id={`${idBase}-titulo`} className="pd-entrada" value={campos.titulo} onChange={mudar("titulo")} maxLength={200} required />
      </div>
      <div className="pd-campo">
        <label htmlFor={`${idBase}-origem`}>Origem</label>
        <select id={`${idBase}-origem`} className="pd-selecao" value={campos.origem} onChange={mudar("origem")}>
          {ORIGENS.map((opcao) => <option key={opcao} value={opcao}>{NOMES_DA_ORIGEM[opcao]}</option>)}
        </select>
      </div>
      <div className="pd-campo">
        <label htmlFor={`${idBase}-prazo`}>Prazo informado</label>
        <input id={`${idBase}-prazo`} className="pd-entrada" type="date" value={campos.prazo} onChange={mudar("prazo")} />
      </div>
      <div className="pd-campo">
        <label htmlFor={`${idBase}-processo`}>Processo, número CNJ</label>
        <input id={`${idBase}-processo`} className="pd-entrada" value={campos.processo} onChange={mudar("processo")} inputMode="numeric" placeholder="0000000-00.0000.8.16.0000" />
      </div>
      <div className="pd-campo">
        <label htmlFor={`${idBase}-orgao`}>Órgão</label>
        <input id={`${idBase}-orgao`} className="pd-entrada" value={campos.orgao} onChange={mudar("orgao")} maxLength={300} placeholder="Vara, juizado ou comarca" />
      </div>
      <div className="pd-campo pdc-campo-largo">
        <label htmlFor={`${idBase}-ato`}>Ato</label>
        <input id={`${idBase}-ato`} className="pd-entrada" value={campos.ato} onChange={mudar("ato")} maxLength={300} placeholder="Para que você foi nomeado ou o que precisa fazer" />
      </div>
      <div className="pd-campo pdc-campo-largo">
        <label htmlFor={`${idBase}-resumo`}>Resumo</label>
        <textarea id={`${idBase}-resumo`} className="pd-area-texto" value={campos.resumo} onChange={mudar("resumo")} maxLength={3000} rows={4} placeholder="O caso em duas ou três frases" />
      </div>
      <div className="pd-campo pdc-campo-largo">
        <label htmlFor={`${idBase}-fundamentos`}>Fundamentos a avaliar, um por linha</label>
        <textarea id={`${idBase}-fundamentos`} className="pd-area-texto" value={campos.fundamentos} onChange={mudar("fundamentos")} rows={4} placeholder="Pontos a examinar, não conclusões" />
      </div>
      {erro && <p role="alert" className="pd-aviso pd-aviso-risco">{erro}</p>}
      <div className="pd-linha-campos">
        <button type="submit" className="pd-botao pd-botao-primario" disabled={salvando || !campos.titulo.trim()}>{salvando ? "Salvando…" : "Salvar ficha"}</button>
        <button type="button" className="pd-botao pd-botao-secundario" onClick={() => setEditando(false)} disabled={salvando}>Cancelar</button>
      </div>
    </form>
  </section>;

  const prazo = descreverPrazo(caso.prazo);
  return <section className="pd-cartao" aria-label="Ficha do caso">
    <div className="pd-cartao-cabeca">
      <h2>Leitura do caso</h2>
      <button type="button" className="pd-botao pd-botao-secundario pd-botao-pequeno" onClick={abrirEdicao}>Editar a ficha</button>
    </div>
    <div className="pd-cartao-corpo">
      <dl className="pdc-chaves">
        <div><dt>Processo</dt><dd>{caso.processo ? <span className="pd-numero">{formatarCnj(caso.processo)}</span> : <em>sem número</em>}</dd></div>
        <div><dt>Órgão</dt><dd>{caso.orgao ?? <em>não informado</em>}</dd></div>
        <div><dt>Ato</dt><dd>{caso.ato ?? <em>não informado</em>}</dd></div>
        <div>
          <dt>Prazo informado</dt>
          <dd>{caso.prazo
            ? <>{formatarData(caso.prazo)}<span className="pdc-chave-nota">{caso.situacao === "concluido" ? "caso concluído" : `${prazo?.texto ?? ""}, a conferir no processo oficial`}</span></>
            : <em>sem prazo definido, a conferir no ato</em>}</dd>
        </div>
      </dl>
      <h3>Resumo</h3>
      {caso.resumo
        ? <p className="pdc-texto">{caso.resumo}</p>
        : <p className="pd-vazio"><strong>Sem resumo ainda.</strong>Escreva em <b>Editar a ficha</b> ou deixe a triagem preencher a leitura do caso.</p>}
      <h3>Fundamentos a avaliar</h3>
      {caso.fundamentos.length > 0
        ? <ul className="pdc-topicos">{caso.fundamentos.map((item) => <li key={item}>{item}</li>)}</ul>
        : <p className="pd-vazio"><strong>Nenhum ponto anotado.</strong>São ideias para examinar, não teses prontas.</p>}
    </div>
  </section>;
}

function camposDaFicha(caso: Caso) {
  return {
    titulo: caso.titulo,
    origem: caso.origem as string,
    processo: formatarCnj(caso.processo),
    orgao: caso.orgao ?? "",
    ato: caso.ato ?? "",
    prazo: caso.prazo ?? "",
    resumo: caso.resumo,
    fundamentos: caso.fundamentos.join("\n"),
  };
}

// ── Relato e triagem ────────────────────────────────────────────────────────
function Relato({ caso, triagens, atualizar, recarregar }: { caso: Caso; triagens: Triagem[]; atualizar: Atualizar; recarregar: () => Promise<void> }) {
  const idBase = useId();
  const [relato, setRelato] = useState(caso.relato);
  const [notas, setNotas] = useState(caso.notas);
  const [salvando, setSalvando] = useState(false);
  const [triando, setTriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const alterado = relato !== caso.relato || notas !== caso.notas;

  async function salvar(): Promise<boolean> {
    if (!alterado) return true;
    setSalvando(true);
    setErro(null);
    try {
      const atualizado = await chamar<Caso>(`/api/escritorio/casos/${caso.id}`, { metodo: "PATCH", corpo: { relato, notas } });
      atualizar((dados) => ({ ...dados, caso: atualizado }));
      setAviso("Relato salvo.");
      return true;
    } catch (e) {
      setErro(mensagemDeErro(e));
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function triar() {
    setErro(null);
    setAviso(null);
    if (!(await salvar())) return;
    setTriando(true);
    try {
      await chamar<Triagem>(`/api/escritorio/casos/${caso.id}/triagem`, { metodo: "POST" });
      await recarregar();
      setAviso("Triagem concluída. Confira cada ponto antes de usar.");
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setTriando(false);
    }
  }

  const ocupado = salvando || triando;
  return <div className="pdc-relato-grade">
    <section className="pd-cartao" aria-label="Relato do cliente">
      <div className="pd-cartao-cabeca">
        <h2>Relato do cliente</h2>
        {triagens.length > 0 && <span className="pd-auxiliar">{triagens.length === 1 ? "1 triagem" : `${triagens.length} triagens`}</span>}
      </div>
      <div className="pd-cartao-corpo">
        <div className="pd-campo">
          <label htmlFor={`${idBase}-relato`}>O que o cliente contou</label>
          <textarea
            id={`${idBase}-relato`}
            className="pd-area-texto pdc-relato-texto"
            value={relato}
            onChange={(evento) => setRelato(evento.target.value)}
            maxLength={20000}
            rows={9}
            placeholder="Escreva ou cole o que o cliente contou, com as palavras dele. É este texto que a triagem lê."
            disabled={ocupado}
          />
        </div>
        <details className="pdc-notas" open={Boolean(notas)}>
          <summary>Suas anotações <span className="pd-auxiliar">entram na triagem como informação complementar</span></summary>
          <div className="pd-campo">
            <label htmlFor={`${idBase}-notas`}>Anotações do advogado</label>
            <textarea id={`${idBase}-notas`} className="pd-area-texto" value={notas} onChange={(evento) => setNotas(evento.target.value)} maxLength={20000} rows={4} placeholder="O que você já sabe ou observou: andamento, contexto, o que o cliente trouxe." disabled={ocupado} />
          </div>
        </details>
        <div className="pd-linha-campos pdc-relato-acoes">
          <button type="button" className="pd-botao pd-botao-primario" onClick={triar} disabled={ocupado || relato.trim().length < 10}>
            {triando ? "Trabalhando…" : "Triar com fontes"}
          </button>
          <button type="button" className="pd-botao pd-botao-secundario" onClick={salvar} disabled={ocupado || !alterado}>{salvando ? "Salvando…" : alterado ? "Salvar relato" : "Relato salvo"}</button>
        </div>
        {triando && <p className="pd-aviso">Lendo o relato, buscando os trechos da lei e conferindo cada afirmação. Leva alguns instantes; nada é enviado ao cliente.</p>}
        {aviso && !erro && <p className="pd-aviso" aria-live="polite">{aviso}</p>}
        {erro && <p role="alert" className="pd-aviso pd-aviso-risco">{erro}</p>}
      </div>
    </section>

    {triagens.length > 0
      ? <TriagemDoCaso triagem={triagens[0]} />
      : <section className="pd-cartao" aria-label="Triagem">
        <div className="pd-cartao-cabeca"><h2>Triagem com fontes</h2></div>
        <div className="pd-cartao-corpo">
          <p className="pd-vazio">
            <strong>Nenhuma triagem ainda.</strong>
            Com o relato salvo, <b>Triar com fontes</b> organiza o caso: força (requisitos comprovados sobre os que se aplicam), se cabe no Juizado Especial, documentos a pedir e perguntas ao cliente, cada ponto com o trecho da lei que o sustenta. A decisão continua sua.
          </p>
        </div>
      </section>}
  </div>;
}

// Rótulos dos registros.
const NOME_DO_TIPO: Record<string, string> = { registro: "Sistema", assistente: "Assistente", humano: "Você", whatsapp: "WhatsApp" };
