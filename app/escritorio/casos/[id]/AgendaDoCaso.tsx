"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import type { EventoDoCaso, TipoDeEvento } from "@/lib/escritorio";
import { chamar, ErroDaApi, mensagemDeErro } from "../api";
import { formatarData } from "../formatos";

type CamposDoFormulario = {
  tipo: TipoDeEvento;
  titulo: string;
  descricao: string;
  data: string;
  prazoInformado: string;
};

const TIPOS_DE_EVENTO: Array<{ valor: TipoDeEvento; rotulo: string }> = [
  { valor: "audiencia", rotulo: "Audiência" },
  { valor: "atendimento", rotulo: "Atendimento" },
  { valor: "tarefa", rotulo: "Tarefa" },
  { valor: "revisao", rotulo: "Revisão" },
  { valor: "prazo_informado", rotulo: "Prazo informado" },
  { valor: "prazo_confirmado", rotulo: "Prazo confirmado" },
];

const NOMES_DE_EVENTO: Record<TipoDeEvento, string> = Object.fromEntries(
  TIPOS_DE_EVENTO.map(({ valor, rotulo }) => [valor, rotulo]),
) as Record<TipoDeEvento, string>;

function camposIniciais(): CamposDoFormulario {
  return { tipo: "audiencia", titulo: "", descricao: "", data: "", prazoInformado: "" };
}

function camposDoEvento(evento: EventoDoCaso): CamposDoFormulario {
  return {
    tipo: evento.tipo,
    titulo: evento.titulo,
    descricao: evento.descricao,
    data: evento.data ?? "",
    prazoInformado: evento.prazoInformado ?? "",
  };
}

function corpoDoEvento(campos: CamposDoFormulario) {
  return {
    ...campos,
    titulo: campos.titulo.trim(),
    descricao: campos.descricao.trim(),
    data: campos.data || null,
    prazoInformado: campos.prazoInformado.trim() || null,
  };
}

// O helper compartilhado ainda não tipa DELETE; a rota de eventos já o aceita.
async function removerEventoDaApi(casoId: string, eventoId: string) {
  let resposta: Response;
  try {
    resposta = await fetch(`/api/escritorio/casos/${casoId}/eventos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: eventoId }),
      cache: "no-store",
    });
  } catch {
    throw new ErroDaApi("Sem conexão com o servidor. Tente de novo.", 0);
  }
  const dados = await resposta.json().catch(() => null) as { erro?: unknown } | null;
  if (resposta.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/entrar?voltar=${encodeURIComponent(window.location.pathname)}`);
    throw new ErroDaApi("Sua sessão venceu. Entre de novo.", 401);
  }
  if (!resposta.ok) {
    const mensagem = dados && typeof dados.erro === "string" && dados.erro ? dados.erro : "Não foi possível concluir agora. Tente de novo.";
    throw new ErroDaApi(mensagem, resposta.status);
  }
}

export function AgendaDoCaso({ casoId }: { casoId: string }) {
  const idBase = useId();
  const [eventos, setEventos] = useState<EventoDoCaso[] | null>(null);
  const [campos, setCampos] = useState<CamposDoFormulario>(camposIniciais);
  const [camposDaEdicao, setCamposDaEdicao] = useState<CamposDoFormulario>(camposIniciais);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [confirmandoRemocaoId, setConfirmandoRemocaoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let ativa = true;

    async function carregar() {
      setEventos(null);
      setErro(null);
      try {
        const lista = await chamar<EventoDoCaso[]>(`/api/escritorio/casos/${casoId}/eventos`);
        if (ativa) setEventos(lista);
      } catch (e) {
        if (ativa) setErro(mensagemDeErro(e));
      }
    }

    void carregar();
    return () => { ativa = false; };
  }, [casoId]);

  const mudar = (destino: "novo" | "edicao", campo: keyof CamposDoFormulario) => (evento: { target: { value: string } }) => {
    const atualizar = destino === "novo" ? setCampos : setCamposDaEdicao;
    atualizar((atual) => ({ ...atual, [campo]: evento.target.value }));
  };

  async function adicionar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      const criado = await chamar<EventoDoCaso>(`/api/escritorio/casos/${casoId}/eventos`, { metodo: "POST", corpo: corpoDoEvento(campos) });
      setEventos((atuais) => atuais ? [criado, ...atuais] : [criado]);
      setCampos(camposIniciais());
      setAviso("Evento adicionado à agenda.");
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  function abrirEdicao(evento: EventoDoCaso) {
    setEditandoId(evento.id);
    setCamposDaEdicao(camposDoEvento(evento));
    setConfirmandoRemocaoId(null);
    setErro(null);
  }

  async function salvarEdicao(evento: FormEvent<HTMLFormElement>, eventoId: string) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      const atualizado = await chamar<EventoDoCaso>(`/api/escritorio/casos/${casoId}/eventos`, {
        metodo: "PATCH",
        corpo: { id: eventoId, ...corpoDoEvento(camposDaEdicao) },
      });
      setEventos((atuais) => atuais?.map((item) => item.id === atualizado.id ? atualizado : item) ?? null);
      setEditandoId(null);
      setAviso("Evento atualizado.");
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function remover(eventoId: string) {
    setRemovendoId(eventoId);
    setErro(null);
    setAviso(null);
    try {
      await removerEventoDaApi(casoId, eventoId);
      setEventos((atuais) => atuais?.filter((item) => item.id !== eventoId) ?? null);
      setConfirmandoRemocaoId(null);
      setAviso("Evento removido da agenda.");
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setRemovendoId(null);
    }
  }

  return <section className="pd-cartao" aria-labelledby="agenda-do-caso">
    <div className="pd-cartao-cabeca">
      <div>
        <h2 id="agenda-do-caso">Agenda do caso</h2>
        <p className="pd-auxiliar">Audiências, atendimentos, tarefas, revisões e prazos anotados neste caso.</p>
      </div>
      {eventos && <span className="pd-auxiliar">{eventos.length === 1 ? "1 evento" : `${eventos.length} eventos`}</span>}
    </div>
    <div className="pd-cartao-corpo">
      <p className="pd-aviso pd-aviso-atencao pdc-agenda-aviso">
        <strong>Prazo informado e prazo confirmado são anotações humanas.</strong> Esta agenda não calcula nem confirma prazo processual. Confira sempre no processo oficial.
      </p>

      <form className="pdc-agenda-form" onSubmit={adicionar} aria-label="Adicionar evento à agenda">
        <div className="pd-campo">
          <label htmlFor={`${idBase}-tipo`}>Tipo de evento</label>
          <select id={`${idBase}-tipo`} className="pd-selecao" value={campos.tipo} onChange={mudar("novo", "tipo")} disabled={salvando}>
            {TIPOS_DE_EVENTO.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</option>)}
          </select>
        </div>
        <div className="pd-campo pdc-agenda-campo-largo">
          <label htmlFor={`${idBase}-titulo`}>Título</label>
          <input id={`${idBase}-titulo`} className="pd-entrada" value={campos.titulo} onChange={mudar("novo", "titulo")} maxLength={200} required disabled={salvando} placeholder="Ex.: audiência de conciliação" />
        </div>
        <div className="pd-campo">
          <label htmlFor={`${idBase}-data`}>Data, se houver</label>
          <input id={`${idBase}-data`} className="pd-entrada" type="date" value={campos.data} onChange={mudar("novo", "data")} disabled={salvando} />
        </div>
        <div className="pd-campo">
          <label htmlFor={`${idBase}-prazo`}>Texto de prazo informado, se houver</label>
          <input id={`${idBase}-prazo`} className="pd-entrada" value={campos.prazoInformado} onChange={mudar("novo", "prazoInformado")} maxLength={500} disabled={salvando} placeholder="Ex.: 15 dias conforme intimação" />
        </div>
        <div className="pd-campo pdc-agenda-campo-largo">
          <label htmlFor={`${idBase}-descricao`}>Detalhes, se houver</label>
          <textarea id={`${idBase}-descricao`} className="pd-area-texto" value={campos.descricao} onChange={mudar("novo", "descricao")} maxLength={3000} rows={3} disabled={salvando} />
        </div>
        <div className="pdc-agenda-acoes">
          <button type="submit" className="pd-botao pd-botao-primario" disabled={salvando || !campos.titulo.trim()}>{salvando ? "Salvando…" : "Adicionar evento"}</button>
        </div>
      </form>

      {aviso && <p className="pd-aviso pdc-agenda-mensagem" aria-live="polite">{aviso}</p>}
      {erro && <p className="pd-aviso pd-aviso-risco pdc-agenda-mensagem" role="alert">{erro}</p>}

      {eventos === null
        ? <p className="pd-auxiliar pdc-agenda-carregando" aria-live="polite">Carregando eventos…</p>
        : eventos.length === 0
          ? <p className="pd-vazio pdc-agenda-vazio"><strong>Nenhum evento anotado.</strong>Use o formulário para registrar o que precisa acompanhar neste caso.</p>
          : <ol className="pdc-eventos-lista">
            {eventos.map((evento) => <li key={evento.id} className="pdc-evento">
              {editandoId === evento.id
                ? <form className="pdc-agenda-form pdc-agenda-form-edicao" onSubmit={(acao) => salvarEdicao(acao, evento.id)} aria-label={`Editar ${evento.titulo}`}>
                  <div className="pd-campo">
                    <label htmlFor={`${idBase}-${evento.id}-tipo`}>Tipo de evento</label>
                    <select id={`${idBase}-${evento.id}-tipo`} className="pd-selecao" value={camposDaEdicao.tipo} onChange={mudar("edicao", "tipo")} disabled={salvando}>
                      {TIPOS_DE_EVENTO.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</option>)}
                    </select>
                  </div>
                  <div className="pd-campo pdc-agenda-campo-largo">
                    <label htmlFor={`${idBase}-${evento.id}-titulo`}>Título</label>
                    <input id={`${idBase}-${evento.id}-titulo`} className="pd-entrada" value={camposDaEdicao.titulo} onChange={mudar("edicao", "titulo")} maxLength={200} required disabled={salvando} />
                  </div>
                  <div className="pd-campo">
                    <label htmlFor={`${idBase}-${evento.id}-data`}>Data, se houver</label>
                    <input id={`${idBase}-${evento.id}-data`} className="pd-entrada" type="date" value={camposDaEdicao.data} onChange={mudar("edicao", "data")} disabled={salvando} />
                  </div>
                  <div className="pd-campo">
                    <label htmlFor={`${idBase}-${evento.id}-prazo`}>Texto de prazo informado, se houver</label>
                    <input id={`${idBase}-${evento.id}-prazo`} className="pd-entrada" value={camposDaEdicao.prazoInformado} onChange={mudar("edicao", "prazoInformado")} maxLength={500} disabled={salvando} />
                  </div>
                  <div className="pd-campo pdc-agenda-campo-largo">
                    <label htmlFor={`${idBase}-${evento.id}-descricao`}>Detalhes, se houver</label>
                    <textarea id={`${idBase}-${evento.id}-descricao`} className="pd-area-texto" value={camposDaEdicao.descricao} onChange={mudar("edicao", "descricao")} maxLength={3000} rows={3} disabled={salvando} />
                  </div>
                  <div className="pdc-agenda-acoes">
                    <button type="submit" className="pd-botao pd-botao-primario" disabled={salvando || !camposDaEdicao.titulo.trim()}>{salvando ? "Salvando…" : "Salvar evento"}</button>
                    <button type="button" className="pd-botao pd-botao-quieto" onClick={() => setEditandoId(null)} disabled={salvando}>Cancelar</button>
                  </div>
                </form>
                : <>
                  <div className="pdc-evento-conteudo">
                    <div>
                      <span className={`pd-estado${evento.tipo === "prazo_confirmado" ? " pd-estado-ok" : evento.tipo === "prazo_informado" ? " pd-estado-atencao" : ""}`}>{NOMES_DE_EVENTO[evento.tipo]}</span>
                      <h3>{evento.titulo}</h3>
                    </div>
                    <dl className="pdc-evento-detalhes">
                      <div><dt>Data</dt><dd>{evento.data ? <time dateTime={evento.data}>{formatarData(evento.data)}</time> : "sem data registrada"}</dd></div>
                      {evento.prazoInformado && <div><dt>Prazo informado</dt><dd>{evento.prazoInformado}</dd></div>}
                    </dl>
                    {evento.descricao && <p className="pdc-evento-descricao">{evento.descricao}</p>}
                  </div>
                  <div className="pdc-evento-acoes">
                    <button type="button" className="pd-botao pd-botao-quieto pd-botao-pequeno" onClick={() => abrirEdicao(evento)} disabled={removendoId === evento.id}>Editar</button>
                    {confirmandoRemocaoId === evento.id
                      ? <span className="pdc-evento-confirmar" role="group" aria-label={`Confirmar remoção de ${evento.titulo}`}>
                        <span>Remover este evento?</span>
                        <button type="button" className="pd-botao pdc-botao-risco pd-botao-pequeno" onClick={() => remover(evento.id)} disabled={removendoId === evento.id}>{removendoId === evento.id ? "Removendo…" : "Remover"}</button>
                        <button type="button" className="pd-botao pd-botao-quieto pd-botao-pequeno" onClick={() => setConfirmandoRemocaoId(null)} disabled={removendoId === evento.id}>Cancelar</button>
                      </span>
                      : <button type="button" className="pd-botao pd-botao-quieto pd-botao-pequeno" onClick={() => { setConfirmandoRemocaoId(evento.id); setEditandoId(null); }} disabled={removendoId === evento.id}>Remover</button>}
                  </div>
                </>}
            </li>)}
          </ol>}
    </div>
  </section>;
}
