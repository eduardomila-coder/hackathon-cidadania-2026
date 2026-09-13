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

// Estagiário virtual da conversa: o mesmo desenho do robô da Mila, com as
// travas de confiança mínima e de envio automático ou só sugestão.
type ConfigDoEstagiario = {
  ativo: boolean;
  autoEnviar: boolean;
  confiancaMinima: number;
  instrucao: string;
  avisarQueEDeMaquina: boolean;
  atualizadoEm: string;
  atualizadoPor: string;
};
type SugestaoDoEstagiario = { id: string; texto: string; motivo: string };
type EstadoDoEstagiario = {
  config: ConfigDoEstagiario;
  sugestao: SugestaoDoEstagiario | null;
  confiancas: Array<{ valor: number; nome: string; explicacao: string }>;
  whatsapp: string;
};

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

// Iniciais para o avatar redondo da lista e do cabeçalho, como no painel da
// Mila (lá o avatar também é só as iniciais, dentro do círculo da marca).
function iniciais(nome: string) {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

async function lerErro(resposta: Response, padrao: string) {
  const dados = await resposta.json().catch(() => ({})) as { erro?: string };
  return dados.erro || padrao;
}

// `useSearchParams` precisa de Suspense em volta para o build não reclamar.
export default function PaginaDeMensagens() {
  return <Suspense fallback={<p className="pd-conversas-nota">Carregando…</p>}><Mensagens /></Suspense>;
}

// Estado da conexão em uma frase, para o selo do cabeçalho. A cor nunca
// aparece sozinha: o selo sempre traz o texto do estado.
function estadoDaConexao(whatsApp: EstadoWhatsApp | null) {
  if (!whatsApp || !whatsApp.configurado) return null;
  if (whatsApp.estado === "open") return { classe: "pd-estado-ok", texto: "WhatsApp conectado" };
  if (whatsApp.estado === "connecting") return { classe: "pd-estado-info", texto: "Aguardando leitura do QR" };
  if (whatsApp.estado === "sem_numero") return { classe: "pd-estado-atencao", texto: "Sem número cadastrado" };
  return { classe: "pd-estado-atencao", texto: "WhatsApp desconectado" };
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
  const [busca, setBusca] = useState("");
  // Coluna da direita com o caso e o vínculo. Abre sozinha em tela larga, como
  // a terceira coluna do painel da Mila; nas demais fica no botão do cabeçalho.
  const [contextoAberto, setContextoAberto] = useState(false);
  const [estagiario, setEstagiario] = useState<EstadoDoEstagiario | null>(null);
  const [instrucao, setInstrucao] = useState("");
  const [salvandoEstagiario, setSalvandoEstagiario] = useState(false);
  const [testando, setTestando] = useState(false);
  const [recadoEstagiario, setRecadoEstagiario] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    const larga = window.matchMedia("(min-width: 1600px)");
    const ajustar = () => setContextoAberto(larga.matches);
    ajustar();
    larga.addEventListener("change", ajustar);
    return () => larga.removeEventListener("change", ajustar);
  }, []);

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

  async function salvarEstagiario(campos: Partial<Pick<ConfigDoEstagiario, "ativo" | "autoEnviar" | "confiancaMinima" | "instrucao" | "avisarQueEDeMaquina">>) {
    if (!selecionado) return;
    setSalvandoEstagiario(true);
    setRecadoEstagiario(null);
    try {
      const resposta = await fetch("/api/escritorio/estagiario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contato: selecionado, ...campos }),
      });
      if (!resposta.ok) throw new Error(await lerErro(resposta, "Não foi possível salvar o ajuste."));
      const dados = await resposta.json() as EstadoDoEstagiario;
      setEstagiario(dados);
      setInstrucao(dados.config.instrucao);
      setRecadoEstagiario({
        tipo: "ok",
        texto: campos.ativo === true
          ? "Estagiário ligado nesta conversa. Ele responde o que for seguro e cala no resto."
          : campos.ativo === false
            ? "Estagiário desligado nesta conversa."
            : "Ajuste salvo.",
      });
    } catch (e) {
      setRecadoEstagiario({ tipo: "erro", texto: e instanceof Error && e.message ? e.message : "Não foi possível salvar o ajuste." });
    } finally { setSalvandoEstagiario(false); }
  }

  async function testarEstagiario() {
    if (!selecionado) return;
    setTestando(true);
    setRecadoEstagiario(null);
    try {
      const resposta = await fetch("/api/escritorio/estagiario/atender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contato: selecionado }),
      });
      if (!resposta.ok) throw new Error(await lerErro(resposta, "O estagiário não conseguiu atender agora."));
      const dados = await resposta.json() as { resultado: { acao: string; motivo?: string }; sugestao: SugestaoDoEstagiario | null };
      const acao = dados.resultado.acao;
      setRecadoEstagiario({
        tipo: acao === "erro" ? "erro" : "ok",
        texto: acao === "sugerida"
          ? `Simulação pronta: ele preparou a resposta e mostrou o motivo (${dados.resultado.motivo ?? ""}).`
          : acao === "calado"
            ? `Nesta conversa ele preferiria não responder: ${dados.resultado.motivo ?? ""}`
            : acao === "sem_mensagem_do_cliente"
              ? "Não há mensagem do cliente para responder nesta conversa."
              : `Resultado da simulação: ${acao}.`,
      });
      setEstagiario((atual) => (atual ? { ...atual, sugestao: dados.sugestao } : atual));
    } catch (e) {
      setRecadoEstagiario({ tipo: "erro", texto: e instanceof Error && e.message ? e.message : "O estagiário não conseguiu atender agora." });
    } finally { setTestando(false); }
  }

  async function resolverSugestao(id: string, acao: "enviar" | "descartar", texto?: string) {
    try {
      const resposta = await fetch("/api/escritorio/estagiario/sugestao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, acao, texto }),
      });
      if (!resposta.ok) throw new Error(await lerErro(resposta, "Não foi possível concluir agora."));
      const dados = await resposta.json() as { sugestaoPendente?: SugestaoDoEstagiario | null };
      setEstagiario((atual) => (atual ? { ...atual, sugestao: dados.sugestaoPendente ?? null } : atual));
      setRecadoEstagiario({ tipo: "ok", texto: acao === "enviar" ? "Mensagem do estagiário enviada pelo seu WhatsApp." : "Sugestão descartada." });
      void carregarConversas();
    } catch (e) {
      setRecadoEstagiario({ tipo: "erro", texto: e instanceof Error && e.message ? e.message : "Não foi possível concluir agora." });
    }
  }

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

  // O estagiário virtual é por conversa: ao abrir cada uma, lê o estado
  // daquela conversa. Tudo o que muda o estado acontece depois do fetch, como
  // o lint de efeitos do React pede.
  useEffect(() => {
    let ativo = true;
    const contato = selecionado;
    void (async () => {
      if (!contato) {
        if (ativo) setEstagiario(null);
        return;
      }
      try {
        const resposta = await fetch(`/api/escritorio/estagiario?contato=${encodeURIComponent(contato)}`, { cache: "no-store" });
        if (!resposta.ok) throw new Error(await lerErro(resposta, "Não foi possível ler o estagiário."));
        const dados = await resposta.json() as EstadoDoEstagiario;
        if (!ativo) return;
        setEstagiario(dados);
        setInstrucao(dados.config.instrucao);
      } catch (e) {
        if (!ativo) return;
        setEstagiario(null);
        setRecadoEstagiario({ tipo: "erro", texto: e instanceof Error && e.message ? e.message : "Não foi possível ler o estagiário." });
      }
    })();
    return () => { ativo = false; };
  }, [selecionado]);

  function abrir(contato: string) {
    setSelecionado(contato);
    setCasoEscolhido("");
    setTituloNovo("");
    setAviso(null);
    setRecadoEstagiario(null);
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

  const buscaLimpa = busca.trim().toLowerCase();
  const visiveis = (conversas ?? []).filter((conversa) => !buscaLimpa
    || nomeDaConversa(conversa).toLowerCase().includes(buscaLimpa)
    || (conversa.ultimaMensagem ?? "").toLowerCase().includes(buscaLimpa)
    || conversa.contato.includes(buscaLimpa.replace(/\D/g, "")));

  const seloConexao = estadoDaConexao(whatsApp);

  return <section className={`pd-mensagens ${selecionado ? "pd-mensagens-aberta" : ""}`}>
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">Atendimento</p>
        <h1>Mensagens</h1>
        <p className="pd-auxiliar">O que os clientes mandam para o seu número chega aqui. O assistente escreve o rascunho; quem envia é você, salvo nas conversas em que você liga o estagiário virtual.</p>
      </div>
      <div className="pd-pagina-acoes">
        {seloConexao && <span className={`pd-estado ${seloConexao.classe}`}>{seloConexao.texto}</span>}
      </div>
    </div>

    {whatsApp && !whatsApp.configurado && <p className="pd-aviso pd-aviso-atencao" role="status">
      A integração do WhatsApp ainda não está ligada neste servidor. As conversas aparecem aqui quando ela estiver ativa.
    </p>}
    {whatsApp?.configurado && semConexao && <p className="pd-aviso pd-aviso-atencao" role="status">
      {whatsApp.estado === "sem_numero" ? "Você ainda não cadastrou o seu WhatsApp." : "O seu WhatsApp não está conectado agora."}{" "}
      <Link className="pd-aviso-link" href="/escritorio/whatsapp">{whatsApp.estado === "sem_numero" ? "Cadastrar e conectar" : "Conectar de novo"}</Link>. Enquanto isso, nada novo chega nem sai por aqui; o que já chegou continua guardado abaixo.
    </p>}

    <div className={`pd-caixa${contextoAberto ? " pd-caixa-larga" : ""}`}>
      <div className="pd-caixa-grade">
        <aside className="pd-conversas" aria-label="Conversas">
          <div className="pd-conversas-cabeca">
            <div>
              <h2>Conversas</h2>
              <p>{conversas === null ? "carregando…" : `${visiveis.length} ${visiveis.length === 1 ? "conversa" : "conversas"}`}</p>
            </div>
            <button type="button" className="pd-conversas-atualizar" onClick={() => { void carregarConversas(); }} disabled={conversas === null} title="Atualizar lista" aria-label="Atualizar lista">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
            </button>
          </div>

          <div className="pd-conversas-busca">
            <div className="pd-conversas-busca-campo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar conversa" aria-label="Buscar conversa" />
            </div>
          </div>

          <div className="pd-conversas-rolagem">
            {conversas === null && <p className="pd-conversas-nota">Carregando…</p>}
            {conversas && conversas.length === 0 && <p className="pd-conversas-nota">
              Nenhuma conversa ainda. Quando alguém escrever para o seu WhatsApp conectado, a conversa aparece aqui.
            </p>}
            {conversas && conversas.length > 0 && visiveis.length === 0 && <p className="pd-conversas-nota">
              Nenhuma conversa com “{busca}”.
            </p>}
            {visiveis.map((conversa) => <button
              key={conversa.contato}
              type="button"
              className={`pd-conversa-item${conversa.contato === selecionado ? " pd-conversa-ativa" : ""}`}
              onClick={() => abrir(conversa.contato)}
              aria-current={conversa.contato === selecionado ? "true" : undefined}
            >
              <span className="pd-avatar" aria-hidden="true">{iniciais(nomeDaConversa(conversa))}</span>
              <span className="pd-conversa-meio">
                <span className="pd-conversa-linha">
                  <strong>{nomeDaConversa(conversa)}</strong>
                  <time dateTime={conversa.quando}>{quandoResumido(conversa.quando)}</time>
                </span>
                <span className="pd-conversa-previa">{conversa.ultimaMensagem || "[sem texto]"}</span>
                <span className="pd-conversa-rodape">
                  {conversa.casoId ? <em>caso vinculado</em> : <em className="pd-sem-caso">sem caso</em>}
                  {conversa.naoLidas > 0 && <b aria-label={`${conversa.naoLidas} não lidas`}>{conversa.naoLidas}</b>}
                </span>
              </span>
            </button>)}
          </div>

          <p className="pd-conversas-rodape">As conversas ficam guardadas na sua conta. Nada sai para o cliente sem o seu clique, salvo nas conversas com o estagiário virtual ligado.</p>
        </aside>

        <div className="pd-chat">
          {!selecionado && <div className="pd-chat-vazio">
            <p className="pd-eyebrow">Conversa</p>
            <h2>Escolha uma conversa ao lado.</h2>
            <p>As mensagens ficam guardadas na sua conta e podem ser ligadas a um caso para aparecerem na página dele.</p>
          </div>}

          {selecionado && <>
            <header className="pd-chat-cabeca">
              <button type="button" className="pd-voltar pd-acao-icone" onClick={() => setSelecionado(null)} aria-label="Voltar para a lista de conversas">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span className="pd-avatar pd-avatar-grande" aria-hidden="true">{iniciais(conversaAberta ? nomeDaConversa(conversaAberta) : formatarTelefone(selecionado))}</span>
              <div className="pd-chat-cabeca-nome">
                <strong>{conversaAberta ? nomeDaConversa(conversaAberta) : formatarTelefone(selecionado)}</strong>
                <small>{formatarTelefone(selecionado)}{conversaAberta?.nome && conversaAberta.clienteNome && conversaAberta.nome !== conversaAberta.clienteNome ? ` · no WhatsApp: ${conversaAberta.nome}` : ""}</small>
              </div>
              {conversaAberta?.casoId
                ? <Link className="pd-chip-caso" href={`/escritorio/casos/${conversaAberta.casoId}`} title="Abrir o caso">{casoDaConversa ? casoDaConversa.titulo : "Abrir o caso"} →</Link>
                : <span className="pd-chip-caso pd-chip-sem-caso">Sem caso vinculado</span>}
              <button type="button" className="pd-acao-icone" onClick={() => setContextoAberto((aberto) => !aberto)} aria-expanded={contextoAberto} title="Mostrar o caso e o vínculo" aria-label="Mostrar o caso e o vínculo">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /><circle cx="9" cy="10" r="2" /><path d="M6.5 16c.7-1.6 4.3-1.6 5 0" /></svg>
              </button>
            </header>

            <Conversa
              contato={selecionado}
              casoId={conversaAberta?.casoId ?? null}
              aoAtualizar={() => { void carregarConversas(); }}
              sugestao={estagiario?.sugestao ?? null}
              aoEnviarSugestao={(id, texto) => { void resolverSugestao(id, "enviar", texto); }}
              aoDescartarSugestao={(id) => { void resolverSugestao(id, "descartar"); }}
            />
          </>}
        </div>

        {selecionado && contextoAberto && <aside className="pd-contexto" aria-label="Caso, vínculo e estagiário da conversa">
          <h3>Conversa</h3>
          <div className="pd-contexto-caixa">
            <dl>
              <div><dt>Contato</dt><dd>{formatarTelefone(selecionado)}</dd></div>
              <div><dt>Caso</dt><dd>{conversaAberta?.casoId ? (casoDaConversa?.titulo ?? "vinculado") : "sem vínculo"}</dd></div>
              <div><dt>Situação</dt><dd>{conversaAberta?.naoLidas ? `${conversaAberta.naoLidas} não lida(s)` : "em dia"}</dd></div>
            </dl>
          </div>
          {conversaAberta?.casoId && casoDaConversa && <Link className="pd-chip-caso" href={`/escritorio/casos/${casoDaConversa.id}`}>Abrir a página do caso →</Link>}

          <div className="pd-contexto-caixa">
            <h3>Estagiário virtual</h3>
            <div className="pd-estagiario">
              <p className="pd-estagiario-estado">
                <span className={`pd-lampada${estagiario?.config.ativo ? " ligada" : ""}`} aria-hidden="true" />
                {estagiario === null
                  ? "Lendo o estagiário desta conversa…"
                  : estagiario.config.ativo
                    ? estagiario.whatsapp === "open"
                      ? "Ligado nesta conversa e com WhatsApp conectado: ele responde sozinho o que for seguro."
                      : "Ligado nesta conversa. Sem WhatsApp conectado, ele prepara a resposta e você envia."
                    : "Desligado nesta conversa: ele não fala com o cliente."}
              </p>
              <button
                type="button"
                className="pd-alavanca"
                onClick={() => { void salvarEstagiario({ ativo: !(estagiario?.config.ativo ?? false) }); }}
                disabled={salvandoEstagiario || estagiario === null}
                aria-pressed={estagiario?.config.ativo ?? false}
              >
                <span>
                  <strong>Atender o cliente sozinho</strong>
                  <small>Quem decide ligar é o advogado, conversa por conversa, como no robô da Mila.</small>
                </span>
                <span className="pd-interruptor" aria-hidden="true" />
              </button>

              {estagiario?.config.ativo && <>
                <button
                  type="button"
                  className="pd-alavanca"
                  onClick={() => { void salvarEstagiario({ autoEnviar: !estagiario.config.autoEnviar }); }}
                  disabled={salvandoEstagiario}
                  aria-pressed={estagiario.config.autoEnviar}
                >
                  <span>
                    <strong>Responder sem me consultar</strong>
                    <small>Desligado, ele prepara a resposta e espera o seu clique. É o mesmo interruptor do robô da Mila.</small>
                  </span>
                  <span className="pd-interruptor" aria-hidden="true" />
                </button>

                <label className="pd-estagiario-campo">
                  <span>Confiança mínima para responder</span>
                  <select
                    value={String(estagiario.config.confiancaMinima)}
                    onChange={(evento) => { void salvarEstagiario({ confiancaMinima: Number(evento.target.value) }); }}
                    disabled={salvandoEstagiario}
                  >
                    {estagiario.confiancas.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.nome} ({opcao.valor.toFixed(2)}) · {opcao.explicacao}</option>)}
                  </select>
                </label>

                <button
                  type="button"
                  className="pd-alavanca"
                  onClick={() => { void salvarEstagiario({ avisarQueEDeMaquina: !estagiario.config.avisarQueEDeMaquina }); }}
                  disabled={salvandoEstagiario}
                  aria-pressed={estagiario.config.avisarQueEDeMaquina}
                >
                  <span>
                    <strong>Dizer que o atendimento é automático</strong>
                    <small>Por padrão ele escreve como a equipe, igual ao robô da Mila. Ligado, avisa o cliente que é automático.</small>
                  </span>
                  <span className="pd-interruptor" aria-hidden="true" />
                </button>

                <label className="pd-estagiario-campo">
                  <span>Instrução do escritório (tom, tratamento, o que evitar)</span>
                  <textarea
                    value={instrucao}
                    onChange={(evento) => setInstrucao(evento.target.value)}
                    maxLength={600}
                    placeholder="Ex.: trate por senhor(a), sem emoji, e nunca fale de valores."
                    disabled={salvandoEstagiario}
                  />
                </label>

                <div className="pd-estagiario-botoes">
                  <button type="button" className="pd-botao pd-botao-secundario pd-botao-pequeno" onClick={() => { void salvarEstagiario({ instrucao }); }} disabled={salvandoEstagiario}>Salvar instrução</button>
                  <button type="button" className="pd-botao pd-botao-primario pd-botao-pequeno" onClick={() => { void testarEstagiario(); }} disabled={testando || salvandoEstagiario}>{testando ? "Atendendo…" : "Testar agora"}</button>
                </div>
                <p className="pd-estagiario-motivo">
                  O teste não envia nada: mostra a resposta que ele daria e por que.
                  {estagiario.config.atualizadoEm ? ` Ajustado por ${estagiario.config.atualizadoPor} em ${new Date(estagiario.config.atualizadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}.` : ""}
                </p>
              </>}

              {recadoEstagiario && <p className={`pd-estagiario-recado${recadoEstagiario.tipo === "erro" ? " erro" : ""}`} role={recadoEstagiario.tipo === "erro" ? "alert" : "status"}>{recadoEstagiario.texto}</p>}
            </div>
          </div>

          {!conversaAberta?.casoId && <div className="pd-contexto-caixa pd-vincular">
            <h3>Vincular a um caso</h3>
            <form className="pd-vincular-forma" onSubmit={(evento) => { evento.preventDefault(); if (casoEscolhido) void vincular({ casoId: casoEscolhido }); }}>
              <label htmlFor="vincular-caso">Escolher um caso aberto</label>
              <div>
                <select id="vincular-caso" value={casoEscolhido} onChange={(evento) => setCasoEscolhido(evento.target.value)} disabled={vinculando}>
                  <option value="">{casos.length ? "Escolha o caso" : "Nenhum caso aberto ainda"}</option>
                  {casos.map((caso) => <option key={caso.id} value={caso.id}>{caso.titulo}{caso.situacao ? ` (${NOMES_DA_SITUACAO[caso.situacao] ?? caso.situacao})` : ""}</option>)}
                </select>
                <button type="submit" className="pd-botao pd-botao-primario pd-botao-pequeno" disabled={vinculando || !casoEscolhido}>{vinculando ? "Vinculando…" : "Vincular"}</button>
              </div>
            </form>
            <form className="pd-vincular-forma" onSubmit={(evento) => { evento.preventDefault(); if (tituloNovo.trim()) void vincular({ novoCaso: { titulo: tituloNovo.trim() } }); }}>
              <label htmlFor="novo-caso">Ou abrir um caso com esta conversa</label>
              <div>
                <input id="novo-caso" value={tituloNovo} onChange={(evento) => setTituloNovo(evento.target.value)} maxLength={200} placeholder={`Ex.: Atendimento de ${conversaAberta ? nomeDaConversa(conversaAberta) : "cliente"}`} disabled={vinculando} />
                <button type="submit" className="pd-botao pd-botao-primario pd-botao-pequeno" disabled={vinculando || !tituloNovo.trim()}>{vinculando ? "Abrindo…" : "Abrir caso"}</button>
              </div>
            </form>
          </div>}

          {aviso && <p className={`pd-resposta-aviso ${aviso.tipo}`} role={aviso.tipo === "erro" ? "alert" : "status"}>{aviso.texto}</p>}
        </aside>}
      </div>
    </div>
  </section>;
}
