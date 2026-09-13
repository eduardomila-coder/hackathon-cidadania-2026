"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./mensagens.css";

// A conversa do WhatsApp com um contato e a caixa de resposta. Serve à tela
// de Mensagens e à página do caso. A IA só preenche a caixa; quem envia é o
// advogado, no botão "Enviar pelo WhatsApp". Atualiza sozinha a cada 10 s.

export type MensagemDaConversa = {
  id: string;
  contato: string;
  nomeContato: string | null;
  texto: string;
  deMim: boolean;
  quando: string;
  casoId: string | null;
  lida: boolean;
  // Resposta que saiu pelo estagiário virtual, não pela mão do advogado.
  doEstagiario?: boolean;
};

const INTERVALO_MS = 10000;

export function formatarTelefone(numero: string) {
  const partes = (numero ?? "").match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return partes ? `+55 (${partes[1]}) ${partes[2]}-${partes[3]}` : numero;
}

export function formatarHora(quando: string) {
  const data = new Date(quando);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatarDia(quando: string) {
  const data = new Date(quando);
  if (Number.isNaN(data.getTime())) return "";
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mesmoDia(data, hoje)) return "Hoje";
  if (mesmoDia(data, ontem)) return "Ontem";
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: data.getFullYear() === hoje.getFullYear() ? undefined : "numeric" });
}

async function lerErro(resposta: Response, padrao: string) {
  const dados = await resposta.json().catch(() => ({})) as { erro?: string };
  return dados.erro || padrao;
}

// Os emojis do compositor. Lista curta e fixa, sem biblioteca: o painel da
// Mila usa uma biblioteca inteira para isso, e aqui não vale a dependência.
const EMOJIS = ["🙂", "😊", "😉", "👍", "🙏", "👏", "✅", "📄", "📎", "📅", "⏰", "⚖️", "📝", "❤️", "😅", "🤝", "📞", "✍️", "🔎", "💬", "💡", "⚠️", "🎉", "🙌"];

type Props = {
  contato: string | null;
  casoId?: string | null;
  // Chamado depois de enviar ou quando chega mensagem nova, para a tela em
  // volta (lista de conversas, registros do caso) se atualizar também.
  aoAtualizar?: () => void;
  // Resposta que o estagiário virtual preparou e não enviou. Aparece acima da
  // caixa, para o advogado mandar com um clique, editar ou descartar.
  sugestao?: { id: string; texto: string; motivo: string } | null;
  aoEnviarSugestao?: (id: string, texto: string) => void;
  aoDescartarSugestao?: (id: string) => void;
};

// Sem contato não há o que mostrar. Com contato, a `key` faz o React
// recomeçar do zero (caixa limpa, sem mensagens da conversa anterior) toda
// vez que o contato muda.
export function Conversa({ contato, casoId = null, aoAtualizar, sugestao = null, aoEnviarSugestao, aoDescartarSugestao }: Props) {
  if (!contato) {
    return <div className="pd-conversa pd-conversa-vazia"><p>Cadastre o telefone do cliente para ver a conversa aqui.</p></div>;
  }
  return <ConversaDoContato
    key={contato}
    contato={contato}
    casoId={casoId}
    aoAtualizar={aoAtualizar}
    sugestao={sugestao}
    aoEnviarSugestao={aoEnviarSugestao}
    aoDescartarSugestao={aoDescartarSugestao}
  />;
}

function ConversaDoContato({ contato, casoId, aoAtualizar, sugestao, aoEnviarSugestao, aoDescartarSugestao }: {
  contato: string;
  casoId: string | null;
  aoAtualizar?: () => void;
  sugestao: { id: string; texto: string; motivo: string } | null;
  aoEnviarSugestao?: (id: string, texto: string) => void;
  aoDescartarSugestao?: (id: string) => void;
}) {
  const [mensagens, setMensagens] = useState<MensagemDaConversa[] | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [motivo, setMotivo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [sugerindo, setSugerindo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // Painel de emoji do compositor (o mesmo gesto do painel da Mila).
  const [emojiAberto, setEmojiAberto] = useState(false);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const quantidadeAnterior = useRef(0);
  const aoAtualizarRef = useRef(aoAtualizar);
  useEffect(() => { aoAtualizarRef.current = aoAtualizar; }, [aoAtualizar]);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/escritorio/mensagens?contato=${encodeURIComponent(contato)}`, { cache: "no-store" });
      if (!resposta.ok) throw new Error(await lerErro(resposta, "Não foi possível carregar a conversa."));
      const dados = await resposta.json() as MensagemDaConversa[];
      setMensagens(Array.isArray(dados) ? dados : []);
      setErroCarga(null);
    } catch (e) {
      setErroCarga(e instanceof Error && e.message ? e.message : "Não foi possível carregar a conversa.");
    }
  }, [contato]);

  // Carrega ao abrir e depois um pulso a cada 10 s.
  useEffect(() => {
    let ativo = true;
    const consultar = () => { if (ativo) void carregar(); };
    consultar();
    const intervalo = setInterval(consultar, INTERVALO_MS);
    return () => { ativo = false; clearInterval(intervalo); };
  }, [carregar]);

  // Mensagem nova: rola para o fim e avisa a tela em volta.
  useEffect(() => {
    if (!mensagens) return;
    if (mensagens.length !== quantidadeAnterior.current) {
      const chegouAlgo = quantidadeAnterior.current > 0;
      quantidadeAnterior.current = mensagens.length;
      listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight });
      if (chegouAlgo) aoAtualizarRef.current?.();
    }
  }, [mensagens]);

  async function sugerir() {
    setSugerindo(true);
    setAviso(null);
    try {
      const resposta = await fetch("/api/escritorio/mensagens/sugerir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contato, casoId: casoId ?? undefined }),
      });
      if (!resposta.ok) throw new Error(await lerErro(resposta, "O assistente não conseguiu redigir agora."));
      const dados = await resposta.json() as { texto: string; motivo?: string };
      setTexto(dados.texto ?? "");
      setMotivo(dados.motivo ?? null);
      setAviso({ tipo: "ok", texto: "Rascunho pronto. Leia, ajuste o que quiser e só então envie." });
    } catch (e) {
      setAviso({ tipo: "erro", texto: e instanceof Error && e.message ? e.message : "O assistente não conseguiu redigir agora." });
    } finally { setSugerindo(false); }
  }

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    setAviso(null);
    try {
      const resposta = await fetch("/api/escritorio/mensagens/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contato, texto, casoId: casoId ?? undefined }),
      });
      if (!resposta.ok) throw new Error(await lerErro(resposta, "Não foi possível enviar agora."));
      setTexto("");
      setMotivo(null);
      setAviso({ tipo: "ok", texto: "Mensagem enviada pelo seu WhatsApp." });
      await carregar();
      aoAtualizarRef.current?.();
    } catch (e) {
      setAviso({ tipo: "erro", texto: e instanceof Error && e.message ? e.message : "Não foi possível enviar agora." });
    } finally { setEnviando(false); }
  }

  // Emoji entra na posição do cursor, como no compositor da Mila.
  function inserirEmoji(emoji: string) {
    const campo = campoRef.current;
    if (!campo) { setTexto((atual) => atual + emoji); return; }
    const inicio = campo.selectionStart ?? texto.length;
    const fim = campo.selectionEnd ?? texto.length;
    setTexto(texto.slice(0, inicio) + emoji + texto.slice(fim));
    setEmojiAberto(false);
    requestAnimationFrame(() => {
      campo.focus();
      const posicao = inicio + emoji.length;
      campo.setSelectionRange(posicao, posicao);
    });
  }

  let diaAnterior = "";

  return <div className="pd-conversa">
    <div className="wa-chat-bg" ref={listaRef} aria-live="polite" aria-label="Mensagens da conversa">
      {erroCarga && <p className="wa-nota wa-erro" role="alert">{erroCarga}</p>}
      {mensagens === null && !erroCarga && <p className="wa-nota">Carregando a conversa…</p>}
      {mensagens && mensagens.length === 0 && <p className="wa-nota">Nenhuma mensagem com {formatarTelefone(contato)} ainda. Escreva abaixo para começar.</p>}
      {mensagens?.map((mensagem, indice) => {
        const dia = formatarDia(mensagem.quando);
        const mostraDia = dia !== diaAnterior;
        diaAnterior = dia;
        // Sequência: mesma direção e mesmo dia da mensagem anterior. A partir
        // da segunda, o balão perde o rabicho e arredonda o canto, como no
        // WhatsApp Web e no painel da Mila.
        const anterior = mensagens[indice - 1];
        const agrupada = Boolean(anterior) && anterior.deMim === mensagem.deMim && formatarDia(anterior.quando) === dia;
        return <div key={mensagem.id}>
          {mostraDia && <div className="wa-dia"><span>{dia}</span></div>}
          <div className={`wa-linha ${mensagem.deMim ? "out" : "in"}`}>
            <div className={`wa-bubble ${mensagem.deMim ? "out" : "in"}${agrupada ? " grouped" : ""}`}>
              {mensagem.doEstagiario && <p className="wa-nome-estagiaria">Estagiária virtual</p>}
              <p className="wa-message-text">{mensagem.texto}</p>
              <span className="wa-meta">
                {mensagem.doEstagiario && <span className="wa-selo-estagiario" title="Resposta enviada pelo estagiário virtual">estagiário</span>}
                <time dateTime={mensagem.quando}>{formatarHora(mensagem.quando)}</time>
                {mensagem.deMim && <svg width="14" height="11" viewBox="0 0 16 11" fill="none" aria-hidden="true"><title>enviada por você</title><path d="M1 5.5 4.5 9 11 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 5.5 9.5 9 16 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </span>
            </div>
          </div>
        </div>;
      })}
    </div>

    <form className="pd-resposta" onSubmit={(evento) => { evento.preventDefault(); void enviar(); }}>
      {sugestao && <div className="pd-estagiario-sugestao">
        <div className="pd-estagiario-cabeca">
          <div className="pd-estagiario-identidade">
            <p className="pd-estagiario-etiqueta">Estagiária virtual <span>· rascunho</span></p>
          </div>
          <span className="pd-estagiario-nao-enviado">não enviado</span>
        </div>
        <p className="pd-estagiario-texto">{sugestao.texto}</p>
        <p className="pd-estagiario-motivo">{sugestao.motivo}</p>
        <div className="pd-estagiario-acoes">
          <button type="button" className="pd-botao pd-botao-primario wa-botao-sugerir" disabled={enviando} onClick={() => aoEnviarSugestao?.(sugestao.id, sugestao.texto)}>Enviar pelo WhatsApp</button>
          <button type="button" className="pd-botao pd-botao-secundario pd-botao-pequeno" disabled={enviando} onClick={() => { setTexto(sugestao.texto); setMotivo(sugestao.motivo); aoDescartarSugestao?.(sugestao.id); }}>Editar na caixa</button>
          <button type="button" className="pd-botao pd-botao-quieto pd-botao-pequeno pd-estagiario-descartar" disabled={enviando} onClick={() => aoDescartarSugestao?.(sugestao.id)}>Descartar</button>
        </div>
      </div>}
      {motivo && <p className="pd-motivo"><b>O que o assistente fez</b>{motivo}</p>}
      <div className="wa-composer">
        <button
          type="button"
          className="wa-botao-emoji"
          onClick={() => setEmojiAberto((aberto) => !aberto)}
          aria-expanded={emojiAberto}
          aria-label="Emoji"
          title="Emoji"
          disabled={enviando}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c1.8 2 5.2 2 7 0" /><path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </button>
        {emojiAberto && <div className="wa-emoji" role="group" aria-label="Escolher emoji">
          {EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => inserirEmoji(emoji)} aria-label={`Inserir ${emoji}`}>{emoji}</button>)}
        </div>}
        <textarea
          ref={campoRef}
          id={`resposta-${contato}`}
          className="wa-composer-campo"
          value={texto}
          onChange={(evento) => { setTexto(evento.target.value); if (motivo) setMotivo(null); }}
          placeholder="Escreva aqui ou peça uma sugestão ao assistente"
          maxLength={4000}
          rows={1}
          disabled={enviando}
          aria-label={`Resposta para ${formatarTelefone(contato)}`}
        />
        <button type="button" className="pd-botao pd-botao-secundario wa-botao-sugerir" onClick={sugerir} disabled={sugerindo || enviando}>{sugerindo ? "Trabalhando…" : "Sugerir resposta"}</button>
        <button type="submit" className="pd-botao pd-botao-primario wa-botao-enviar" disabled={enviando || sugerindo || !texto.trim()} title="Enviar pelo WhatsApp" aria-label="Enviar pelo WhatsApp">
          {enviando
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" strokeDasharray="40 20" /></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2z" /></svg>}
          <span>{enviando ? "Enviando…" : "Enviar pelo WhatsApp"}</span>
        </button>
      </div>
      <p className="pd-resposta-dica"><b>O envio é seu.</b> A sugestão é um rascunho: só vai ao cliente quando você clicar em Enviar pelo WhatsApp.</p>
      {aviso && <p className={`pd-resposta-aviso ${aviso.tipo}`} role={aviso.tipo === "erro" ? "alert" : "status"}>{aviso.texto}</p>}
    </form>
  </div>;
}
