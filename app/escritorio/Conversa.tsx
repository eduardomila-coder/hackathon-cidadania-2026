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

type Props = {
  contato: string | null;
  casoId?: string | null;
  // Chamado depois de enviar ou quando chega mensagem nova, para a tela em
  // volta (lista de conversas, registros do caso) se atualizar também.
  aoAtualizar?: () => void;
};

// Sem contato não há o que mostrar. Com contato, a `key` faz o React
// recomeçar do zero (caixa limpa, sem mensagens da conversa anterior) toda
// vez que o contato muda.
export function Conversa({ contato, casoId = null, aoAtualizar }: Props) {
  if (!contato) {
    return <div className="pd-conversa pd-conversa-vazia"><p>Cadastre o telefone do cliente para ver a conversa aqui.</p></div>;
  }
  return <ConversaDoContato key={contato} contato={contato} casoId={casoId} aoAtualizar={aoAtualizar} />;
}

function ConversaDoContato({ contato, casoId, aoAtualizar }: { contato: string; casoId: string | null; aoAtualizar?: () => void }) {
  const [mensagens, setMensagens] = useState<MensagemDaConversa[] | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [motivo, setMotivo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [sugerindo, setSugerindo] = useState(false);
  const [enviando, setEnviando] = useState(false);
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

  let diaAnterior = "";

  return <div className="pd-conversa">
    <div className="pd-baloes" ref={listaRef} aria-live="polite" aria-label="Mensagens da conversa">
      {erroCarga && <p className="pd-conversa-erro" role="alert">{erroCarga}</p>}
      {mensagens === null && !erroCarga && <p className="pd-conversa-nota">Carregando a conversa…</p>}
      {mensagens && mensagens.length === 0 && <p className="pd-conversa-nota">Nenhuma mensagem com {formatarTelefone(contato)} ainda. Escreva abaixo para começar.</p>}
      {mensagens?.map((mensagem) => {
        const dia = formatarDia(mensagem.quando);
        const mostraDia = dia !== diaAnterior;
        diaAnterior = dia;
        return <div key={mensagem.id}>
          {mostraDia && <p className="pd-dia"><span>{dia}</span></p>}
          <div className={`pd-balao ${mensagem.deMim ? "pd-balao-meu" : "pd-balao-dele"}`}>
            <p>{mensagem.texto}</p>
            <time dateTime={mensagem.quando}>{formatarHora(mensagem.quando)}</time>
          </div>
        </div>;
      })}
    </div>

    <form className="pd-resposta" onSubmit={(evento) => { evento.preventDefault(); void enviar(); }}>
      <label htmlFor={`resposta-${contato}`}>Sua resposta</label>
      <textarea
        id={`resposta-${contato}`}
        value={texto}
        onChange={(evento) => { setTexto(evento.target.value); if (motivo) setMotivo(null); }}
        placeholder="Escreva aqui ou peça uma sugestão ao assistente. Nada sai sem o seu clique."
        maxLength={4000}
        rows={4}
        disabled={enviando}
      />
      {motivo && <p className="pd-motivo"><b>O que o assistente fez</b>{motivo}</p>}
      <div className="pd-resposta-acoes">
        <button type="button" className="md-botao-secundario" onClick={sugerir} disabled={sugerindo || enviando}>{sugerindo ? "Trabalhando…" : "Sugerir resposta"}</button>
        <button type="submit" className="md-botao-primario" disabled={enviando || sugerindo || !texto.trim()}>{enviando ? "Enviando…" : "Enviar pelo WhatsApp"}</button>
        <small>A sugestão é um rascunho. Só vai ao cliente quando você clicar em enviar.</small>
      </div>
      {aviso && <p className={`pd-resposta-aviso pd-aviso-${aviso.tipo}`} role={aviso.tipo === "erro" ? "alert" : "status"}>{aviso.texto}</p>}
    </form>
  </div>;
}
