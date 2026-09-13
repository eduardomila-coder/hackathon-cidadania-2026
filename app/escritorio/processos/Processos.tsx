"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { Processo } from "@/lib/escritorio";

// Lista de processos do advogado e a caixa para consultar um número novo.
// A consulta vai para POST /api/escritorio/processos, que pergunta ao DataJud
// e guarda o resultado; depois a lista do servidor é recarregada.

type CasoResumido = { id: string; titulo: string; processo: string | null };
type Props = { processos: Processo[]; casos: CasoResumido[]; configurado: boolean };

// 20 dígitos → 0000000-00.0000.8.16.0000, como aparece na intimação.
export function formatarNumeroCnj(numero: string) {
  const digitos = numero.replace(/\D/g, "");
  if (digitos.length !== 20) return numero;
  return `${digitos.slice(0, 7)}-${digitos.slice(7, 9)}.${digitos.slice(9, 13)}.${digitos.slice(13, 14)}.${digitos.slice(14, 16)}.${digitos.slice(16)}`;
}

function dataCurta(iso: string | null) {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso.slice(0, 10);
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function dataEHora(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function Processos({ processos, casos, configurado }: Props) {
  const router = useRouter();
  const [recarregando, iniciar] = useTransition();
  const [numero, setNumero] = useState("");
  const [casoId, setCasoId] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<Processo | null>(null);

  const casosPorId = new Map(casos.map((caso) => [caso.id, caso]));

  async function consultar(numeroConsultado: string, casoVinculado: string | null, chave: string) {
    setErro(null);
    setOcupado(chave);
    try {
      const resposta = await fetch("/api/escritorio/processos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero: numeroConsultado, casoId: casoVinculado || undefined }),
      });
      const dados = await resposta.json().catch(() => ({})) as { processo?: Processo; erro?: string };
      if (!resposta.ok || !dados.processo) throw new Error(dados.erro || "Não foi possível consultar o processo agora.");
      setUltimo(dados.processo);
      if (chave === "novo") {
        setNumero("");
        setCasoId("");
      }
      iniciar(() => router.refresh());
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : "Não foi possível consultar o processo agora.");
    } finally {
      setOcupado(null);
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void consultar(numero, casoId || null, "novo");
  }

  const digitos = numero.replace(/\D/g, "");

  return <>
    <section className="pd-cartao pd-processos-consulta" aria-labelledby="consultar-titulo">
      <header className="pd-cartao-cabeca">
        <h2 id="consultar-titulo">Consultar um processo</h2>
        <span className="pd-processos-fonte">DataJud público · TJPR</span>
      </header>
      <div className="pd-cartao-corpo">
        {!configurado && <p className="pd-aviso pd-aviso-atencao" role="status">A consulta ao DataJud ainda não está ligada neste servidor. Peça à equipe do Hackathon para configurar a chave; até lá a lista abaixo continua disponível.</p>}
        <form className="pd-processos-form" onSubmit={enviar}>
          <div className="pd-campo">
            <label htmlFor="numero-processo">Número do processo</label>
            <input
              id="numero-processo"
              className="pd-entrada pd-processos-numero-campo"
              name="numero"
              value={numero}
              onChange={(evento) => setNumero(evento.target.value)}
              placeholder="0000000-00.0000.8.16.0000"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              required
            />
            <small className="pd-auxiliar">Os 20 dígitos do padrão CNJ, com ou sem pontos e traços.{digitos.length > 0 && digitos.length < 20 ? ` Faltam ${20 - digitos.length}.` : ""}{digitos.length > 20 ? " Há dígitos a mais." : ""}</small>
          </div>
          <div className="pd-campo">
            <label htmlFor="caso-processo">Vincular a um caso</label>
            <select id="caso-processo" className="pd-selecao" name="casoId" value={casoId} onChange={(evento) => setCasoId(evento.target.value)}>
              <option value="">Sem caso vinculado</option>
              {casos.map((caso) => <option key={caso.id} value={caso.id}>{caso.titulo}{caso.processo ? ` · ${formatarNumeroCnj(caso.processo)}` : ""}</option>)}
            </select>
            <small className="pd-auxiliar">Opcional. Se o caso ainda não tem número, este passa a ser o dele.</small>
          </div>
          <button type="submit" className="pd-botao pd-botao-primario pd-processos-consultar" disabled={ocupado !== null || digitos.length !== 20}>
            {ocupado === "novo" ? "Consultando…" : "Consultar no DataJud"}
          </button>
        </form>
        {erro && <p className="pd-aviso pd-aviso-risco pd-processos-erro" role="alert">{erro}</p>}
        {ultimo && <div className="pd-processos-resultado" role="status">
          <div>
            <p className="pd-eyebrow">Resultado da consulta</p>
            <p className="pd-numero pd-processos-resultado-numero">{formatarNumeroCnj(ultimo.numero)}</p>
            <p className="pd-processos-resultado-classe">{ultimo.classe ?? "Classe não informada"} · {ultimo.orgao ?? "Órgão não informado"}</p>
          </div>
          <div>
            <p className="pd-eyebrow">Último andamento publicado</p>
            <p className="pd-processos-resultado-movimento">{ultimo.ultimoMovimento ?? "Movimentação não informada"}</p>
            <p className="pd-auxiliar">{dataCurta(ultimo.dataMovimento) ? `Em ${dataCurta(ultimo.dataMovimento)}. ` : ""}Consulta pública. Não é intimação nem fonte de prazo.</p>
          </div>
        </div>}
      </div>
    </section>

    <section className="pd-cartao pd-processos-lista" aria-labelledby="lista-titulo">
      <header className="pd-cartao-cabeca">
        <h2 id="lista-titulo">Seus processos</h2>
        <span className="pd-auxiliar">{processos.length === 1 ? "1 processo" : `${processos.length} processos`}{recarregando ? " · atualizando" : ""}</span>
      </header>
      {processos.length === 0
        ? <div className="pd-cartao-corpo">
          <p className="pd-vazio"><strong>Nenhum processo consultado ainda</strong>Digite o número acima para ver o último andamento publicado e guardá-lo aqui.</p>
        </div>
        : <ul className="pd-lista pd-processos-itens">
          {processos.map((processo) => {
            const caso = processo.casoId ? casosPorId.get(processo.casoId) : undefined;
            const consultando = ocupado === processo.id;
            return <li key={processo.id} className="pd-linha pd-processo">
              <div className="pd-processo-numero">
                <span className="pd-linha-titulo pd-numero">{formatarNumeroCnj(processo.numero)}</span>
                <span className="pd-linha-meta">{processo.classe ?? "Classe não informada"} · {processo.orgao ?? "Órgão não informado"}</span>
              </div>
              <div className="pd-processo-andamento">
                <span className="pd-processo-rotulo">Último andamento publicado</span>
                <p>{processo.ultimoMovimento ?? "Movimentação não informada"}</p>
                {dataCurta(processo.dataMovimento) && <span className="pd-linha-meta">Em {dataCurta(processo.dataMovimento)}</span>}
              </div>
              <div className="pd-processo-caso">
                <span className="pd-processo-rotulo">Caso</span>
                {caso
                  ? <Link href={`/escritorio/casos/${caso.id}`}>{caso.titulo}</Link>
                  : <span className="pd-processo-sem-caso">Sem caso vinculado</span>}
                <span className="pd-linha-meta">Consultado em {dataEHora(processo.consultadoEm)}</span>
              </div>
              <div className="pd-processo-acoes">
                <button type="button" className="pd-botao pd-botao-secundario pd-botao-pequeno" disabled={ocupado !== null} onClick={() => void consultar(processo.numero, processo.casoId, processo.id)}>
                  {consultando ? "Consultando…" : "Consultar de novo"}
                </button>
              </div>
            </li>;
          })}
        </ul>}
    </section>
  </>;
}
