"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Bloco } from "@/lib/tarefas";
import type { ArquivoDrive } from "@/lib/drive";

// Quadro de tarefas clicável. Cada caixinha grava em docs/TAREFAS.md pela API
// e publica em main; a tarefa com `drive:` fica concluída sozinha quando o
// arquivo aparece na pasta da equipe.

type Props = { blocos: Bloco[]; pessoas: Record<string, { nome: string; cor: string }>; drive: Record<number, ArquivoDrive> };

export function Tarefas({ blocos, pessoas, drive }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [otimista, setOtimista] = useState<Record<number, boolean>>({});
  const [ocupada, setOcupada] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar(linha: number, texto: string, feita: boolean) {
    setErro(null);
    setOcupada(linha);
    setOtimista((o) => ({ ...o, [linha]: feita }));
    const resposta = await fetch("/api/tarefas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linha, texto, feita }),
    });
    setOcupada(null);
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      setErro(corpo.erro ?? "Não consegui salvar.");
      setOtimista((o) => ({ ...o, [linha]: !feita }));
    }
    iniciar(() => router.refresh());
  }

  return (
    <>
      {erro && <p className="cfp-erro" role="alert">{erro}</p>}
      <div className="cfp-blocos">
        {blocos.filter((b) => b.tarefas.length > 0).map((b, i) => {
          const itens = b.tarefas.map((t) => {
            const noDrive = drive[t.linha];
            const feita = otimista[t.linha] ?? (t.feita || Boolean(noDrive));
            return { ...t, feita, noDrive };
          });
          const ok = itens.filter((t) => t.feita).length;
          return (
            <article key={i} className="cfp-cartao cfp-bloco">
              <div className="cfp-bloco-cabeca">
                <div>
                  <span className="cfp-eyebrow">{b.dia}</span>
                  <h3>{b.titulo || "Geral"}</h3>
                </div>
                <span className="cfp-badge">{ok}/{itens.length}</span>
              </div>
              <div className="cfp-prog" aria-hidden><i style={{ width: `${(100 * ok) / itens.length}%` }} /></div>
              <ul className="cfp-itens">
                {itens.map((t) => (
                  <li key={t.linha} className={t.feita ? "feita" : ""}>
                    <button
                      type="button"
                      className="cfp-check"
                      aria-pressed={t.feita}
                      aria-label={`${t.feita ? "Reabrir" : "Concluir"}: ${t.texto}`}
                      disabled={ocupada === t.linha || pendente}
                      onClick={() => alternar(t.linha, t.texto, !t.feita)}
                    >
                      {t.feita ? "✓" : ""}
                    </button>
                    <span className="cfp-item-texto">
                      <span className="cfp-item-nome">{t.texto}</span>
                      {t.noDrive && (
                        <a className="cfp-drive" href={t.noDrive.url} target="_blank" rel="noreferrer" title={`No Drive: ${t.noDrive.nome}`}>
                          no Drive: {t.noDrive.nome} ↗
                        </a>
                      )}
                    </span>
                    <span className="cfp-avs">
                      {t.responsaveis.map((r) => {
                        const p = pessoas[r];
                        return p ? <span key={r} className={`cfp-av ${p.cor}`} title={p.nome}>{p.nome[0]}<span className="sr-only">{p.nome}</span></span> : null;
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </>
  );
}
