"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { chamar, mensagemDeErro } from "../casos/api";
import { ETAPAS_PADRAO } from "./etapas";

type Caso = { id: string; titulo: string };
type Etapa = { id: string; titulo: string; concluida: boolean };
type Pendencia = { id: string; descricao: string; resolvida: boolean };
type Registro = { id: string; texto: string; quando: string };
type Dados = { id: string; casoId: string; etapas: Etapa[]; pendencias: Pendencia[]; registros: Registro[] };
type Resposta = { honorarios: Dados | null };
type Campo = "etapas" | "pendencias" | "registros";

// As cinco etapas entram quando o acompanhamento é iniciado; o advogado edita,
// remove ou acrescenta. A lista mora em ./etapas para servir também à página,
// que é componente de servidor.
export { ETAPAS_PADRAO } from "./etapas";

function idTemporario() {
  return `novo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function Honorarios({ casos, casoInicial }: { casos: Caso[]; casoInicial?: string }) {
  const idBase = useId();
  const router = useRouter();
  const [casoId, setCasoId] = useState(casoInicial || casos[0]?.id || "");
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(Boolean(casoId));
  const [salvando, setSalvando] = useState<Campo | "criar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [novaEtapa, setNovaEtapa] = useState("");
  const [novaPendencia, setNovaPendencia] = useState("");
  const [novoRegistro, setNovoRegistro] = useState("");
  const [quandoDoNovoRegistro, setQuandoDoNovoRegistro] = useState("");
  const url = casoId ? `/api/escritorio/casos/${casoId}/honorarios` : "";

  useEffect(() => {
    if (!url) return;
    let ativo = true;
    chamar<Resposta>(url)
      .then((resposta) => { if (ativo) setDados(resposta.honorarios); })
      .catch((e: unknown) => { if (ativo) setErro(mensagemDeErro(e)); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [url]);

  async function criar() {
    setSalvando("criar");
    setErro(null);
    setRecado(null);
    try {
      const criado = await chamar<Dados>(url, { metodo: "POST", corpo: { etapas: ETAPAS_PADRAO.map((titulo) => ({ titulo, concluida: false })) } });
      setDados(criado);
      setRecado("Acompanhamento iniciado com as cinco etapas do fluxo.");
      router.refresh();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(null);
    }
  }

  async function salvar(evento: FormEvent<HTMLFormElement>, campo: Campo) {
    evento.preventDefault();
    if (!dados) return;
    setSalvando(campo);
    setErro(null);
    setRecado(null);
    try {
      const atualizado = await chamar<Dados>(url, { metodo: "PATCH", corpo: { [campo]: dados[campo] } });
      setDados(atualizado);
      setRecado("Alterações salvas neste caso.");
      router.refresh();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(null);
    }
  }

  function atualizarEtapas(etapas: Etapa[]) { setDados((atual) => atual ? { ...atual, etapas } : atual); }
  function atualizarPendencias(pendencias: Pendencia[]) { setDados((atual) => atual ? { ...atual, pendencias } : atual); }
  function atualizarRegistros(registros: Registro[]) { setDados((atual) => atual ? { ...atual, registros } : atual); }
  function mudarCaso(id: string) {
    setCasoId(id);
    setCarregando(true);
    setDados(null);
    setErro(null);
    setRecado(null);
  }

  if (casos.length === 0) return <div className="card"><div className="vazio"><strong>Nenhum caso cadastrado.</strong>Abra <Link href="/escritorio/casos">um caso</Link> para iniciar o acompanhamento administrativo.</div></div>;

  return <div className="pd-honorarios card">
    <div className="card-head">
      <h2>Acompanhamento por caso</h2>
      <div className="inline">
        <select id={`${idBase}-caso`} className="select" style={{ width: 320 }} aria-label="Caso" value={casoId} onChange={(evento) => mudarCaso(evento.target.value)}>
          {casos.map((caso) => <option key={caso.id} value={caso.id}>{caso.titulo}</option>)}
        </select>
        <Link className="btn btn-secondary btn-sm" href={`/escritorio/casos/${casoId}`}>Abrir caso</Link>
      </div>
    </div>

    <p className="pd-honorarios-recado" role="status" aria-live="polite">{erro ? <span className="pd-honorarios-erro">{erro}</span> : recado}</p>

    {carregando
      ? <div className="pd-vazio"><strong>Carregando o acompanhamento...</strong></div>
      : !dados
        ? <section className="pd-cartao">
          <div className="pd-cartao-cabeca"><h2>Sem acompanhamento iniciado</h2><span className="pd-estado">Sem registros</span></div>
          <div className="pd-cartao-corpo"><p className="pd-vazio"><strong>Nenhuma etapa, pendência ou registro foi salvo neste caso.</strong>Inicie o acompanhamento para anotar apenas o andamento administrativo que você informar.</p><button type="button" className="btn btn-primary" onClick={criar} disabled={salvando === "criar"}>{salvando === "criar" ? "Iniciando..." : "Iniciar acompanhamento"}</button></div>
        </section>
        : <div className="pd-honorarios-paineis">
          <form className="pd-cartao" onSubmit={(evento) => salvar(evento, "etapas")}>
            <div className="pd-cartao-cabeca"><h2>Etapas</h2><span className="pd-auxiliar">{dados.etapas.filter((etapa) => etapa.concluida).length} de {dados.etapas.length} concluídas</span></div>
            <div className="pd-cartao-corpo pd-honorarios-corpo">
              {dados.etapas.map((etapa, indice) => <div className="pd-honorarios-item" key={etapa.id}>
                <label className="pd-honorarios-marca"><input type="checkbox" checked={etapa.concluida} onChange={(evento) => atualizarEtapas(dados.etapas.map((item, i) => i === indice ? { ...item, concluida: evento.target.checked } : item))} /><span>{etapa.concluida ? "Concluída" : "Pendente"}</span></label>
                <input className="pd-entrada" aria-label="Título da etapa" value={etapa.titulo} maxLength={300} onChange={(evento) => atualizarEtapas(dados.etapas.map((item, i) => i === indice ? { ...item, titulo: evento.target.value } : item))} />
                <button type="button" className="pd-botao pd-botao-pequeno pd-botao-quieto" onClick={() => atualizarEtapas(dados.etapas.filter((_, i) => i !== indice))}>Remover</button>
              </div>)}
              <div className="pd-honorarios-adicionar"><input className="pd-entrada" value={novaEtapa} onChange={(evento) => setNovaEtapa(evento.target.value)} maxLength={300} placeholder="Nova etapa" aria-label="Nova etapa" /><button type="button" className="pd-botao pd-botao-secundario" disabled={!novaEtapa.trim()} onClick={() => { atualizarEtapas([...dados.etapas, { id: idTemporario(), titulo: novaEtapa.trim(), concluida: false }]); setNovaEtapa(""); }}>Adicionar</button></div>
              <button type="submit" className="pd-botao" disabled={salvando === "etapas" || dados.etapas.some((etapa) => !etapa.titulo.trim())}>{salvando === "etapas" ? "Salvando..." : "Salvar etapas"}</button>
            </div>
          </form>

          <form className="pd-cartao" onSubmit={(evento) => salvar(evento, "pendencias")}>
            <div className="pd-cartao-cabeca"><h2>Pendências</h2><span className="pd-auxiliar">{dados.pendencias.filter((pendencia) => !pendencia.resolvida).length} em aberto</span></div>
            <div className="pd-cartao-corpo pd-honorarios-corpo">
              {dados.pendencias.map((pendencia, indice) => <div className="pd-honorarios-item" key={pendencia.id}>
                <label className="pd-honorarios-marca"><input type="checkbox" checked={pendencia.resolvida} onChange={(evento) => atualizarPendencias(dados.pendencias.map((item, i) => i === indice ? { ...item, resolvida: evento.target.checked } : item))} /><span>{pendencia.resolvida ? "Resolvida" : "Em aberto"}</span></label>
                <input className="pd-entrada" aria-label="Descrição da pendência" value={pendencia.descricao} maxLength={1000} onChange={(evento) => atualizarPendencias(dados.pendencias.map((item, i) => i === indice ? { ...item, descricao: evento.target.value } : item))} />
                <button type="button" className="pd-botao pd-botao-pequeno pd-botao-quieto" onClick={() => atualizarPendencias(dados.pendencias.filter((_, i) => i !== indice))}>Remover</button>
              </div>)}
              <div className="pd-honorarios-adicionar"><input className="pd-entrada" value={novaPendencia} onChange={(evento) => setNovaPendencia(evento.target.value)} maxLength={1000} placeholder="Nova pendência" aria-label="Nova pendência" /><button type="button" className="pd-botao pd-botao-secundario" disabled={!novaPendencia.trim()} onClick={() => { atualizarPendencias([...dados.pendencias, { id: idTemporario(), descricao: novaPendencia.trim(), resolvida: false }]); setNovaPendencia(""); }}>Adicionar</button></div>
              <button type="submit" className="pd-botao" disabled={salvando === "pendencias" || dados.pendencias.some((pendencia) => !pendencia.descricao.trim())}>{salvando === "pendencias" ? "Salvando..." : "Salvar pendências"}</button>
            </div>
          </form>

          <form className="pd-cartao pd-honorarios-registros" onSubmit={(evento) => salvar(evento, "registros")}>
            <div className="pd-cartao-cabeca"><h2>Registros</h2><span className="pd-auxiliar">{dados.registros.length === 1 ? "1 anotação" : `${dados.registros.length} anotações`}</span></div>
            <div className="pd-cartao-corpo pd-honorarios-corpo">
              {dados.registros.map((registro, indice) => <div className="pd-honorarios-registro" key={registro.id}>
                <textarea className="pd-area-texto" aria-label="Texto do registro" value={registro.texto} maxLength={3000} rows={3} onChange={(evento) => atualizarRegistros(dados.registros.map((item, i) => i === indice ? { ...item, texto: evento.target.value } : item))} />
                <input className="pd-entrada" aria-label="Data e hora do registro" value={registro.quando} maxLength={40} onChange={(evento) => atualizarRegistros(dados.registros.map((item, i) => i === indice ? { ...item, quando: evento.target.value } : item))} />
                <button type="button" className="pd-botao pd-botao-pequeno pd-botao-quieto" onClick={() => atualizarRegistros(dados.registros.filter((_, i) => i !== indice))}>Remover</button>
              </div>)}
              <div className="pd-honorarios-novo-registro"><textarea className="pd-area-texto" value={novoRegistro} maxLength={3000} rows={3} placeholder="Nova anotação administrativa" aria-label="Nova anotação administrativa" onChange={(evento) => setNovoRegistro(evento.target.value)} /><input className="pd-entrada" value={quandoDoNovoRegistro} maxLength={40} placeholder="Data e hora (opcional)" aria-label="Data e hora do novo registro" onChange={(evento) => setQuandoDoNovoRegistro(evento.target.value)} /><button type="button" className="pd-botao pd-botao-secundario" disabled={!novoRegistro.trim()} onClick={() => { atualizarRegistros([...dados.registros, { id: idTemporario(), texto: novoRegistro.trim(), quando: quandoDoNovoRegistro.trim() }]); setNovoRegistro(""); setQuandoDoNovoRegistro(""); }}>Adicionar registro</button></div>
              <p className="pd-auxiliar">Se a data e hora da nova anotação ficar vazia, o servidor registra o momento em que ela for salva.</p>
              <button type="submit" className="pd-botao" disabled={salvando === "registros" || dados.registros.some((registro) => !registro.texto.trim())}>{salvando === "registros" ? "Salvando..." : "Salvar registros"}</button>
            </div>
          </form>
        </div>}
  </div>;
}
