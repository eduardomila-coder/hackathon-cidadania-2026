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
      <h2 id="consultar-titulo">Consultar um processo</h2>
      {!configurado && <p className="md-status" role="status">A consulta ao DataJud ainda não está ligada neste servidor. Peça à equipe do Hackathon para configurar a chave; até lá a lista abaixo continua disponível.</p>}
      <form className="pd-processos-form" onSubmit={enviar}>
        <div className="pd-processos-campo">
          <label htmlFor="numero-processo">Número do processo</label>
          <input
            id="numero-processo"
            name="numero"
            value={numero}
            onChange={(evento) => setNumero(evento.target.value)}
            placeholder="0000000-00.0000.8.16.0000"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            required
          />
          <small>Os 20 dígitos do padrão CNJ, com ou sem pontos e traços.{digitos.length > 0 && digitos.length < 20 ? ` Faltam ${20 - digitos.length}.` : ""}{digitos.length > 20 ? " Há dígitos a mais." : ""}</small>
        </div>
        <div className="pd-processos-campo">
          <label htmlFor="caso-processo">Vincular a um caso</label>
          <select id="caso-processo" name="casoId" value={casoId} onChange={(evento) => setCasoId(evento.target.value)}>
            <option value="">Sem caso vinculado</option>
            {casos.map((caso) => <option key={caso.id} value={caso.id}>{caso.titulo}{caso.processo ? ` · ${formatarNumeroCnj(caso.processo)}` : ""}</option>)}
          </select>
          <small>Opcional. Se o caso ainda não tem número, este passa a ser o dele.</small>
        </div>
        <button type="submit" className="md-botao-primario" disabled={ocupado !== null || digitos.length !== 20}>
          {ocupado === "novo" ? "Consultando…" : "Consultar no DataJud"}
        </button>
      </form>
      {erro && <p className="pd-processos-erro" role="alert">{erro}</p>}
      {ultimo && <div className="md-retorno-processo" role="status">
        <strong>{formatarNumeroCnj(ultimo.numero)}</strong>
        <span>{ultimo.classe ?? "Classe não informada"} · {ultimo.orgao ?? "Órgão não informado"}</span>
        <b>Último andamento</b>
        <p>{ultimo.ultimoMovimento ?? "Movimentação não informada"}</p>
        <small>{dataCurta(ultimo.dataMovimento) ? `Em ${dataCurta(ultimo.dataMovimento)}. ` : ""}Consulta pública, sem valor de intimação.</small>
      </div>}
    </section>

    <section className="pd-cartao pd-processos-lista" aria-labelledby="lista-titulo">
      <div className="pd-processos-lista-cabeca">
        <h2 id="lista-titulo">Seus processos</h2>
        <span className="pd-processos-contagem">{processos.length === 1 ? "1 processo" : `${processos.length} processos`}{recarregando ? " · atualizando…" : ""}</span>
      </div>
      {processos.length === 0
        ? <p className="pd-processos-vazio">Nenhum processo consultado ainda. Digite o número acima para ver o último andamento público e guardá-lo aqui.</p>
        : <ul className="pd-processos-itens">
          {processos.map((processo) => {
            const caso = processo.casoId ? casosPorId.get(processo.casoId) : undefined;
            const consultando = ocupado === processo.id;
            return <li key={processo.id} className="pd-processo">
              <div className="pd-processo-numero">
                <strong>{formatarNumeroCnj(processo.numero)}</strong>
                <span>{processo.classe ?? "Classe não informada"} · {processo.orgao ?? "Órgão não informado"}</span>
              </div>
              <div className="pd-processo-andamento">
                <b>Último andamento</b>
                <p>{processo.ultimoMovimento ?? "Movimentação não informada"}</p>
                {dataCurta(processo.dataMovimento) && <small>Em {dataCurta(processo.dataMovimento)}</small>}
              </div>
              <div className="pd-processo-caso">
                <b>Caso</b>
                {caso
                  ? <Link href={`/escritorio/casos/${caso.id}`}>{caso.titulo}</Link>
                  : <span>Sem caso vinculado</span>}
                <small>Consultado em {dataEHora(processo.consultadoEm)}</small>
              </div>
              <div className="pd-processo-acoes">
                <button type="button" className="md-botao-secundario" disabled={ocupado !== null} onClick={() => void consultar(processo.numero, processo.casoId, processo.id)}>
                  {consultando ? "Consultando…" : "Consultar de novo"}
                </button>
              </div>
            </li>;
          })}
        </ul>}
    </section>
  </>;
}
