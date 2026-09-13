"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { Caso, Cliente, DossieDoCaso, Situacao, Triagem } from "@/lib/escritorio";
import { Conversa } from "@/app/escritorio/Conversa";
import { chamar, mensagemDeErro } from "../api";
import { descreverPrazo, formatarCnj, formatarData, formatarTelefone, NOMES_DA_ORIGEM, NOMES_DA_SITUACAO, ORIGENS, SITUACOES } from "../formatos";
import { Documentos, Processo, Registros, Tarefas } from "./Secoes";
import { TriagemDoCaso } from "./Triagem";

export type Atualizar = Dispatch<SetStateAction<DossieDoCaso>>;

export function PaginaDoCaso({ inicial }: { inicial: DossieDoCaso }) {
  const [dados, setDados] = useState<DossieDoCaso>(inicial);
  const { caso, cliente } = dados;

  // Busca o dossiê de novo depois das ações que o servidor complementa
  // sozinho (triagem e consulta ao TJPR criam registros, por exemplo).
  const recarregar = useCallback(async () => {
    const novo = await chamar<DossieDoCaso>(`/api/escritorio/casos/${caso.id}`);
    setDados(novo);
  }, [caso.id]);

  const prazo = descreverPrazo(caso.prazo);
  const concluido = caso.situacao === "concluido";

  return <div className="pdc-caso-pagina">
    <Link href="/escritorio" className="pdc-voltar">← Seus casos</Link>

    <header className="pd-cartao pdc-caso-topo">
      <div className="pdc-caso-titulo">
        <p className="md-eyebrow">{NOMES_DA_ORIGEM[caso.origem]} · aberto em {formatarData(caso.criadoEm.slice(0, 10))}</p>
        <h1>{caso.titulo}</h1>
        <div className="pdc-caso-meta">
          <span><b>Cliente</b>{cliente ? <>{cliente.nome} · {formatarTelefone(cliente.telefone)}</> : <em>sem cliente cadastrado</em>}</span>
          <span><b>Prazo</b>{caso.prazo ? <span className={`pdc-prazo tom-${concluido || !prazo ? "normal" : prazo.tom}`}>{formatarData(caso.prazo)}{prazo && !concluido ? ` · ${prazo.texto}` : ""}</span> : <em>sem prazo definido</em>}</span>
          <span><b>Processo</b>{caso.processo ? formatarCnj(caso.processo) : <em>sem número</em>}</span>
        </div>
        <VincularCliente caso={caso} cliente={cliente} atualizar={setDados} />
      </div>
      <SituacaoDoCaso caso={caso} atualizar={setDados} />
    </header>

    <div className="pdc-caso-grade">
      <div className="pdc-coluna-principal">
        <Ficha caso={caso} atualizar={setDados} />
        <Relato caso={caso} triagens={dados.triagens} atualizar={setDados} recarregar={recarregar} />
        <Documentos casoId={caso.id} documentos={dados.documentos} atualizar={setDados} />
        <Processo caso={caso} processo={dados.processo} atualizar={setDados} recarregar={recarregar} />
      </div>
      <aside className="pdc-coluna-lateral">
        <Tarefas casoId={caso.id} tarefas={dados.tarefas} atualizar={setDados} />
        <section className="pd-cartao pdc-secao" aria-label="Conversa com o cliente">
          <p className="md-eyebrow">Conversa</p>
          <h2>WhatsApp</h2>
          <Conversa contato={cliente?.telefone ?? null} casoId={caso.id} />
        </section>
        <Registros casoId={caso.id} registros={dados.registros} atualizar={setDados} />
      </aside>
    </div>
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

  return <div className={`pdc-caso-situacao pdc-situacao-${caso.situacao}`}>
    <label htmlFor="situacao">Situação</label>
    <select id="situacao" value={caso.situacao} onChange={(evento) => mudar(evento.target.value as Situacao)} disabled={estado === "salvando"}>
      {SITUACOES.map((opcao) => <option key={opcao} value={opcao}>{NOMES_DA_SITUACAO[opcao]}</option>)}
    </select>
    <small aria-live="polite">{estado === "salvando" ? "Salvando…" : estado === "salvo" ? "Salvo" : erro ?? "Muda na hora, sem botão"}</small>
  </div>;
}

// ── Cliente do caso ─────────────────────────────────────────────────────────
function VincularCliente({ caso, cliente, atualizar }: { caso: Caso; cliente: Cliente | null; atualizar: Atualizar }) {
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

  if (!aberto) return <button type="button" className="md-link-botao pdc-link-pequeno" onClick={() => setAberto(true)}>{cliente ? "Trocar o cliente" : "Cadastrar ou escolher o cliente"}</button>;

  return <form className="pdc-vincular" onSubmit={salvar} aria-label="Cliente do caso">
    {clientes && clientes.length > 0 && <div className="pdc-alternar" role="radiogroup" aria-label="Cliente novo ou já cadastrado">
      <label><input type="radio" name="modo-cliente-caso" checked={modo === "existente"} onChange={() => setModo("existente")} /> Já cadastrado</label>
      <label><input type="radio" name="modo-cliente-caso" checked={modo === "novo"} onChange={() => setModo("novo")} /> Cliente novo</label>
    </div>}
    {modo === "existente" && clientes && clientes.length > 0
      ? <label className="pdc-campo"><span>Quem é o cliente</span><select value={clienteId} onChange={(evento) => setClienteId(evento.target.value)}>{clientes.map((item) => <option key={item.id} value={item.id}>{item.nome} · {formatarTelefone(item.telefone)}</option>)}</select></label>
      : <div className="pdc-grade pdc-grade-interna">
        <label className="pdc-campo"><span>Nome</span><input value={nome} onChange={(evento) => setNome(evento.target.value)} maxLength={200} placeholder="Nome do cliente" required autoFocus /></label>
        <label className="pdc-campo"><span>Telefone <small>WhatsApp, com DDD</small></span><input value={telefone} onChange={(evento) => setTelefone(evento.target.value)} inputMode="tel" placeholder="(41) 99999-9999" required /></label>
      </div>}
    {erro && <p role="alert" className="pdc-erro">{erro}</p>}
    <div className="md-acoes pdc-acoes-compactas">
      <button type="submit" className="md-botao-primario" disabled={salvando}>{salvando ? "Salvando…" : "Salvar cliente"}</button>
      <button type="button" className="md-link-botao" onClick={() => { setAberto(false); setErro(null); }} disabled={salvando}>Cancelar</button>
    </div>
  </form>;
}

// ── Ficha (leitura e edição inline) ─────────────────────────────────────────
function Ficha({ caso, atualizar }: { caso: Caso; atualizar: Atualizar }) {
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

  if (editando) return <form className="pd-cartao pdc-secao" onSubmit={salvar} aria-label="Editar ficha">
    <div className="md-titulo-linha"><div><p className="md-eyebrow">Ficha</p><h2>Editar a ficha</h2></div></div>
    <div className="pdc-grade">
      <label className="pdc-campo pdc-campo-largo"><span>Título do caso</span><input value={campos.titulo} onChange={mudar("titulo")} maxLength={200} required /></label>
      <label className="pdc-campo"><span>Origem</span><select value={campos.origem} onChange={mudar("origem")}>{ORIGENS.map((opcao) => <option key={opcao} value={opcao}>{NOMES_DA_ORIGEM[opcao]}</option>)}</select></label>
      <label className="pdc-campo"><span>Prazo</span><input type="date" value={campos.prazo} onChange={mudar("prazo")} /></label>
      <label className="pdc-campo"><span>Processo <small>número CNJ</small></span><input value={campos.processo} onChange={mudar("processo")} inputMode="numeric" placeholder="0000000-00.0000.8.16.0000" /></label>
      <label className="pdc-campo"><span>Órgão</span><input value={campos.orgao} onChange={mudar("orgao")} maxLength={300} placeholder="Vara, juizado ou comarca" /></label>
      <label className="pdc-campo pdc-campo-largo"><span>Ato</span><input value={campos.ato} onChange={mudar("ato")} maxLength={300} placeholder="Para que você foi nomeado ou o que precisa fazer" /></label>
      <label className="pdc-campo pdc-campo-largo"><span>Resumo</span><textarea value={campos.resumo} onChange={mudar("resumo")} maxLength={3000} rows={4} placeholder="O caso em duas ou três frases" /></label>
      <label className="pdc-campo pdc-campo-largo"><span>Fundamentos a avaliar <small>um por linha</small></span><textarea value={campos.fundamentos} onChange={mudar("fundamentos")} rows={4} placeholder="Pontos a examinar, não conclusões" /></label>
    </div>
    {erro && <p role="alert" className="pdc-erro">{erro}</p>}
    <div className="md-acoes">
      <button type="submit" className="md-botao-primario" disabled={salvando || !campos.titulo.trim()}>{salvando ? "Salvando…" : "Salvar ficha"}</button>
      <button type="button" className="md-botao-secundario" onClick={() => setEditando(false)} disabled={salvando}>Cancelar</button>
    </div>
  </form>;

  const prazo = descreverPrazo(caso.prazo);
  return <section className="pd-cartao pdc-secao" aria-label="Ficha do caso">
    <div className="md-titulo-linha">
      <div><p className="md-eyebrow">Ficha</p><h2>Ficha do caso</h2></div>
      <button type="button" className="md-botao-secundario pdc-botao-pequeno" onClick={abrirEdicao}>Editar</button>
    </div>
    <dl className="pdc-dados">
      <div><dt>Processo</dt><dd>{caso.processo ? formatarCnj(caso.processo) : <em>sem número</em>}</dd></div>
      <div><dt>Órgão</dt><dd>{caso.orgao ?? <em>não informado</em>}</dd></div>
      <div><dt>Ato</dt><dd>{caso.ato ?? <em>não informado</em>}</dd></div>
      <div><dt>Prazo</dt><dd>{caso.prazo ? <span className={`pdc-prazo tom-${caso.situacao === "concluido" || !prazo ? "normal" : prazo.tom}`}>{formatarData(caso.prazo)}{prazo && caso.situacao !== "concluido" ? ` · ${prazo.texto}` : ""}</span> : <em>conferir no ato</em>}</dd></div>
    </dl>
    <h3>Resumo</h3>
    {caso.resumo ? <p className="pdc-texto">{caso.resumo}</p> : <p className="pdc-vazio">Sem resumo ainda. Escreva em <b>Editar</b> ou deixe a triagem preencher a leitura do caso.</p>}
    <h3>Fundamentos a avaliar</h3>
    {caso.fundamentos.length > 0
      ? <ul className="pdc-marcadores">{caso.fundamentos.map((item) => <li key={item}>{item}</li>)}</ul>
      : <p className="pdc-vazio">Nenhum ponto anotado. São ideias para examinar, não teses prontas.</p>}
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
  return <section className="pd-cartao pdc-secao pdc-relato" aria-label="Relato do cliente">
    <div className="md-titulo-linha">
      <div><p className="md-eyebrow">Relato</p><h2>Relato do cliente</h2></div>
      {triagens.length > 0 && <span className="md-contador">{triagens.length === 1 ? "1 triagem" : `${triagens.length} triagens`}</span>}
    </div>
    <label className="pdc-campo">
      <span className="sr-only">Relato do cliente</span>
      <textarea value={relato} onChange={(evento) => setRelato(evento.target.value)} maxLength={20000} rows={7} placeholder="Escreva ou cole o que o cliente contou, com as palavras dele. É este texto que a triagem lê." disabled={ocupado} />
    </label>
    <details className="pdc-notas" open={Boolean(notas)}>
      <summary>Suas anotações <small>entram na triagem como informação complementar</small></summary>
      <textarea value={notas} onChange={(evento) => setNotas(evento.target.value)} maxLength={20000} rows={4} placeholder="O que você já sabe ou observou: andamento, contexto, o que o cliente trouxe." disabled={ocupado} />
    </details>
    <div className="md-acoes">
      <button type="button" className="md-botao-secundario" onClick={salvar} disabled={ocupado || !alterado}>{salvando ? "Salvando…" : alterado ? "Salvar" : "Salvo"}</button>
      <button type="button" className="md-botao-primario" onClick={triar} disabled={ocupado || relato.trim().length < 10}>{triando ? "Trabalhando…" : "Triar com fontes"} {!triando && <span>→</span>}</button>
      {triando && <span className="pdc-trabalhando">Lendo o relato, buscando os trechos da lei e conferindo cada afirmação. Leva alguns instantes; nada é enviado ao cliente.</span>}
    </div>
    {aviso && !erro && <p className="pdc-aviso" aria-live="polite">{aviso}</p>}
    {erro && <p role="alert" className="pdc-erro">{erro}</p>}

    {triagens.length > 0
      ? <TriagemDoCaso triagem={triagens[0]} />
      : <div className="pdc-vazio-grande pdc-vazio-triagem">
        <strong>Nenhuma triagem ainda.</strong>
        <p>Com o relato salvo, <b>Triar com fontes</b> organiza o caso: força (requisitos comprovados sobre os que se aplicam), se cabe no Juizado Especial, documentos a pedir e perguntas ao cliente, cada ponto com o trecho da lei que o sustenta. A decisão continua sua.</p>
      </div>}
  </section>;
}
