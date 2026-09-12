"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Conversa, formatarDia, formatarHora, formatarTelefone } from "../Conversa";
import "../mensagens.css";

// Caixa de mensagens do advogado: conversas à esquerda, a conversa aberta à
// direita. Tudo o que chega pelo WhatsApp cai aqui; nada sai sem clique.

type ConversaResumo = {
  contato: string;
  nome: string | null;
  ultimaMensagem: string;
  quando: string;
  naoLidas: number;
  casoId: string | null;
  clienteNome: string | null;
};
type CasoResumo = { id: string; titulo: string; situacao?: string };
type EstadoWhatsApp = { configurado: boolean; estado: string };

const INTERVALO_CONVERSAS_MS = 10000;
const INTERVALO_WHATSAPP_MS = 30000;

const NOMES_DA_SITUACAO: Record<string, string> = { novo: "novo", em_andamento: "em andamento", aguardando_cliente: "aguardando cliente", concluido: "concluído" };

function nomeDaConversa(conversa: ConversaResumo) {
  return conversa.clienteNome ?? conversa.nome ?? formatarTelefone(conversa.contato);
}

function quandoResumido(quando: string) {
  const dia = formatarDia(quando);
  return dia === "Hoje" ? formatarHora(quando) : dia;
}

async function lerErro(resposta: Response, padrao: string) {
  const dados = await resposta.json().catch(() => ({})) as { erro?: string };
  return dados.erro || padrao;
}

// `useSearchParams` precisa de Suspense em volta para o build não reclamar.
export default function PaginaDeMensagens() {
  return <Suspense fallback={<p className="pd-conversas-nota">Carregando…</p>}><Mensagens /></Suspense>;
}

function Mensagens() {
  // Contato pedido na URL (?contato=), por exemplo vindo da página do caso.
  const parametros = useSearchParams();
  const [conversas, setConversas] = useState<ConversaResumo[] | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(() => parametros.get("contato")?.replace(/\D/g, "") || null);
  const [whatsApp, setWhatsApp] = useState<EstadoWhatsApp | null>(null);
  const [casos, setCasos] = useState<CasoResumo[]>([]);
  const [casoEscolhido, setCasoEscolhido] = useState("");
  const [tituloNovo, setTituloNovo] = useState("");
  const [vinculando, setVinculando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const carregarConversas = useCallback(async () => {
    try {
      const resposta = await fetch("/api/escritorio/mensagens", { cache: "no-store" });
      if (!resposta.ok) throw new Error(await lerErro(resposta, "Não foi possível carregar as conversas."));
      const dados = await resposta.json() as ConversaResumo[];
      setConversas(Array.isArray(dados) ? dados : []);
    } catch (e) {
      setConversas((atual) => atual ?? []);
      setAviso({ tipo: "erro", texto: e instanceof Error && e.message ? e.message : "Não foi possível carregar as conversas." });
    }
  }, []);

  const carregarWhatsApp = useCallback(async () => {
    try {
      const resposta = await fetch("/api/whatsapp/conexao", { cache: "no-store" });
      const dados = await resposta.json() as EstadoWhatsApp & { erro?: string };
      if (!resposta.ok) throw new Error(dados.erro);
      setWhatsApp({ configurado: Boolean(dados.configurado), estado: dados.estado ?? "desconhecido" });
    } catch {
      setWhatsApp({ configurado: false, estado: "indisponivel" });
    }
  }, []);

  // A lista de casos vem do módulo de casos; se a rota ainda não existir, o
  // select fica vazio e o advogado ainda pode abrir um caso novo daqui.
  const carregarCasos = useCallback(async () => {
    try {
      const resposta = await fetch("/api/escritorio/casos", { cache: "no-store" });
      if (!resposta.ok) throw new Error();
      const dados = await resposta.json() as CasoResumo[] | { casos?: CasoResumo[] };
      const lista = Array.isArray(dados) ? dados : dados.casos ?? [];
      setCasos(lista.filter((caso) => caso && typeof caso.id === "string" && typeof caso.titulo === "string"));
    } catch {
      setCasos([]);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    const consultar = () => { if (ativo) void carregarConversas(); };
    consultar();
    const intervalo = setInterval(consultar, INTERVALO_CONVERSAS_MS);
    return () => { ativo = false; clearInterval(intervalo); };
  }, [carregarConversas]);

  useEffect(() => {
    let ativo = true;
    const consultar = () => { if (ativo) void carregarWhatsApp(); };
    consultar();
    const intervalo = setInterval(consultar, INTERVALO_WHATSAPP_MS);
    return () => { ativo = false; clearInterval(intervalo); };
  }, [carregarWhatsApp]);

  useEffect(() => {
    let ativo = true;
    const consultar = () => { if (ativo) void carregarCasos(); };
    consultar();
    return () => { ativo = false; };
  }, [carregarCasos]);

  const conversaAberta = conversas?.find((conversa) => conversa.contato === selecionado) ?? null;
  const casoDaConversa = conversaAberta?.casoId ? casos.find((caso) => caso.id === conversaAberta.casoId) ?? null : null;
  const semConexao = whatsApp && whatsApp.estado !== "open";

  function abrir(contato: string) {
    setSelecionado(contato);
    setCasoEscolhido("");
    setTituloNovo("");
    setAviso(null);
    const url = new URL(window.location.href);
    url.searchParams.set("contato", contato);
    window.history.replaceState(null, "", url.toString());
  }

  async function vincular(corpo: { casoId: string } | { novoCaso: { titulo: string } }) {
    if (!selecionado) return;
    setVinculando(true);
    setAviso(null);
    try {
      const resposta = await fetch("/api/escritorio/mensagens/vincular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contato: selecionado, ...corpo }),
      });
      if (!resposta.ok) throw new Error(await lerErro(resposta, "Não foi possível vincular agora."));
      const dados = await resposta.json() as { caso: CasoResumo; vinculadas: number };
      setAviso({ tipo: "ok", texto: `Conversa vinculada ao caso "${dados.caso.titulo}".` });
      setCasoEscolhido("");
      setTituloNovo("");
      await Promise.all([carregarConversas(), carregarCasos()]);
    } catch (e) {
      setAviso({ tipo: "erro", texto: e instanceof Error && e.message ? e.message : "Não foi possível vincular agora." });
    } finally { setVinculando(false); }
  }

  return <section className={`pd-mensagens ${selecionado ? "pd-mensagens-aberta" : ""}`}>
    <header className="pd-mensagens-cabecalho">
      <div>
        <p className="md-eyebrow">Mensagens</p>
        <h1>Conversas do WhatsApp</h1>
        <p>O que os clientes mandam para o seu número chega aqui. O assistente sugere a resposta; quem envia é você.</p>
      </div>
    </header>

    {whatsApp && !whatsApp.configurado && <p className="pd-aviso-conexao" role="status">
      O servidor ainda não tem a integração do WhatsApp configurada. As conversas aparecem aqui quando ela estiver ativa.
    </p>}
    {whatsApp?.configurado && semConexao && <p className="pd-aviso-conexao" role="status">
      {whatsApp.estado === "sem_numero" ? "Você ainda não cadastrou o seu WhatsApp." : "O seu WhatsApp não está conectado agora."}{" "}
      <Link href="/escritorio/whatsapp">{whatsApp.estado === "sem_numero" ? "Cadastrar e conectar" : "Conectar de novo"}</Link>. Enquanto isso, nada chega nem sai por aqui.
    </p>}

    <div className="pd-mensagens-colunas">
      <aside className="pd-conversas" aria-label="Conversas">
        {conversas === null && <p className="pd-conversas-nota">Carregando…</p>}
        {conversas && conversas.length === 0 && <p className="pd-conversas-nota">
          Nenhuma conversa ainda. Quando alguém escrever para o seu WhatsApp conectado, a conversa aparece aqui.
        </p>}
        {conversas && conversas.length > 0 && <ul>
          {conversas.map((conversa) => <li key={conversa.contato}>
            <button type="button" className={conversa.contato === selecionado ? "pd-conversa-item pd-conversa-ativa" : "pd-conversa-item"} onClick={() => abrir(conversa.contato)} aria-current={conversa.contato === selecionado ? "true" : undefined}>
              <span className="pd-conversa-topo">
                <strong>{nomeDaConversa(conversa)}</strong>
                <time dateTime={conversa.quando}>{quandoResumido(conversa.quando)}</time>
              </span>
              <span className="pd-conversa-previa">{conversa.ultimaMensagem || "[sem texto]"}</span>
              <span className="pd-conversa-rodape">
                {conversa.casoId ? <em>caso vinculado</em> : <em className="pd-sem-caso">sem caso</em>}
                {conversa.naoLidas > 0 && <b aria-label={`${conversa.naoLidas} não lidas`}>{conversa.naoLidas}</b>}
              </span>
            </button>
          </li>)}
        </ul>}
      </aside>

      <div className="pd-painel">
        {!selecionado && <div className="pd-painel-vazio">
          <p className="md-eyebrow">Conversa</p>
          <h2>Escolha uma conversa ao lado.</h2>
          <p>As mensagens ficam guardadas na sua conta e podem ser ligadas a um caso para aparecerem na página dele.</p>
        </div>}

        {selecionado && <>
          <div className="pd-painel-cabecalho">
            <button type="button" className="pd-voltar" onClick={() => setSelecionado(null)}>← Conversas</button>
            <div>
              <strong>{conversaAberta ? nomeDaConversa(conversaAberta) : formatarTelefone(selecionado)}</strong>
              <small>{formatarTelefone(selecionado)}{conversaAberta?.nome && conversaAberta.clienteNome && conversaAberta.nome !== conversaAberta.clienteNome ? ` · no WhatsApp: ${conversaAberta.nome}` : ""}</small>
            </div>
            {conversaAberta?.casoId
              ? <Link className="pd-caso-ligado" href={`/escritorio/casos/${conversaAberta.casoId}`}>{casoDaConversa ? casoDaConversa.titulo : "Abrir o caso"} →</Link>
              : <span className="pd-caso-ligado pd-caso-nenhum">Sem caso vinculado</span>}
          </div>

          {!conversaAberta?.casoId && <div className="pd-vincular">
            <form className="pd-vincular-forma" onSubmit={(evento) => { evento.preventDefault(); if (casoEscolhido) void vincular({ casoId: casoEscolhido }); }}>
              <label htmlFor="vincular-caso">Vincular a um caso</label>
              <div>
                <select id="vincular-caso" value={casoEscolhido} onChange={(evento) => setCasoEscolhido(evento.target.value)} disabled={vinculando}>
                  <option value="">{casos.length ? "Escolha o caso…" : "Nenhum caso aberto ainda"}</option>
                  {casos.map((caso) => <option key={caso.id} value={caso.id}>{caso.titulo}{caso.situacao ? ` (${NOMES_DA_SITUACAO[caso.situacao] ?? caso.situacao})` : ""}</option>)}
                </select>
                <button type="submit" className="md-botao-secundario" disabled={vinculando || !casoEscolhido}>{vinculando ? "Vinculando…" : "Vincular"}</button>
              </div>
            </form>
            <form className="pd-vincular-forma" onSubmit={(evento) => { evento.preventDefault(); if (tituloNovo.trim()) void vincular({ novoCaso: { titulo: tituloNovo.trim() } }); }}>
              <label htmlFor="novo-caso">Abrir caso com esta conversa</label>
              <div>
                <input id="novo-caso" value={tituloNovo} onChange={(evento) => setTituloNovo(evento.target.value)} maxLength={200} placeholder={`Ex.: Atendimento de ${conversaAberta ? nomeDaConversa(conversaAberta) : "cliente"}`} disabled={vinculando} />
                <button type="submit" className="md-botao-primario" disabled={vinculando || !tituloNovo.trim()}>{vinculando ? "Abrindo…" : "Abrir caso"}</button>
              </div>
            </form>
          </div>}

          {aviso && <p className={`pd-resposta-aviso pd-aviso-${aviso.tipo}`} role={aviso.tipo === "erro" ? "alert" : "status"}>{aviso.texto}</p>}

          <Conversa contato={selecionado} casoId={conversaAberta?.casoId ?? null} aoAtualizar={() => { void carregarConversas(); }} />
        </>}
      </div>
    </div>
  </section>;
}
