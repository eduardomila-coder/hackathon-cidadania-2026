import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eventosDoCaso, listarCasosComDetalhes, tarefasDoCaso, type TipoDeEvento } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { descreverPrazo, formatarData, hojeIso } from "../casos/formatos";
import { NovoCompromisso } from "./NovoCompromisso";

export const metadata: Metadata = { title: "Agenda e prazos · Escritório Dativo" };
export const dynamic = "force-dynamic";

type Item = {
  id: string; data: string; linha: Linha; titulo: string; detalhe: string; casoId: string; cor: "red" | "" | "warn";
};
type Linha = "prazos" | "audiencias" | "atendimentos" | "tarefas" | "outros";

const LINHAS: Array<{ chave: Linha; nome: string }> = [
  { chave: "prazos", nome: "Prazos" },
  { chave: "audiencias", nome: "Audiências" },
  { chave: "atendimentos", nome: "Atendimentos" },
  { chave: "tarefas", nome: "Tarefas" },
  { chave: "outros", nome: "Outros" },
];

const LINHA_DO_EVENTO: Record<TipoDeEvento, Linha> = {
  audiencia: "audiencias", atendimento: "atendimentos", tarefa: "tarefas", revisao: "outros", prazo_informado: "prazos", prazo_confirmado: "prazos",
};
const NOME_DO_EVENTO: Record<TipoDeEvento, string> = {
  audiencia: "Audiência", atendimento: "Atendimento", tarefa: "Tarefa", revisao: "Revisão de peça", prazo_informado: "Prazo informado", prazo_confirmado: "Prazo confirmado",
};

function somarDias(iso: string, dias: number) {
  const data = new Date(`${iso}T12:00:00`);
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

// Segunda-feira da semana que contém a data.
function segundaDe(iso: string) {
  const data = new Date(`${iso}T12:00:00`);
  const desloca = (data.getDay() + 6) % 7;
  return somarDias(iso, -desloca);
}

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function tituloDaSemana(segunda: string) {
  const fim = somarDias(segunda, 4);
  const [a1, m1, d1] = segunda.split("-").map(Number);
  const [, m2, d2] = fim.split("-").map(Number);
  return m1 === m2 ? `${d1} a ${d2} de ${MESES[m1 - 1]} de ${a1}` : `${d1} de ${MESES[m1 - 1]} a ${d2} de ${MESES[m2 - 1]} de ${a1}`;
}

function diaDaSemana(iso: string) {
  return DIAS[(new Date(`${iso}T12:00:00`).getDay() + 6) % 7];
}

export default async function PaginaDaAgenda({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/agenda");

  const { semana } = await searchParams;
  const hoje = hojeIso();
  // No fim de semana a agenda já mostra a semana que vem, como no protótipo.
  const diaDeHoje = new Date(`${hoje}T12:00:00`).getDay();
  const padrao = diaDeHoje === 0 || diaDeHoje === 6 ? somarDias(hoje, diaDeHoje === 0 ? 1 : 2) : hoje;
  const segunda = segundaDe(/^\d{4}-\d{2}-\d{2}$/.test(semana ?? "") ? semana! : padrao);
  const dias = [0, 1, 2, 3, 4].map((n) => somarDias(segunda, n));
  const fimDeSemana = [5, 6].map((n) => somarDias(segunda, n));

  const casos = listarCasosComDetalhes(advogado.id);
  const itens: Item[] = [];
  const semData: Array<{ id: string; titulo: string; caso: string; casoId: string }> = [];

  for (const caso of casos) {
    if (caso.situacao === "concluido") continue;
    const quem = caso.cliente?.nome ?? caso.titulo;
    if (caso.prazo) itens.push({ id: `prazo-${caso.id}`, data: caso.prazo, linha: "prazos", titulo: "Prazo informado", detalhe: `${quem} · conferir oficial`, casoId: caso.id, cor: "red" });
    for (const tarefa of tarefasDoCaso(advogado.id, caso.id)) {
      if (tarefa.concluida) continue;
      if (!tarefa.prazo) { semData.push({ id: tarefa.id, titulo: tarefa.titulo, caso: quem, casoId: caso.id }); continue; }
      itens.push({ id: tarefa.id, data: tarefa.prazo, linha: "tarefas", titulo: tarefa.titulo, detalhe: quem, casoId: caso.id, cor: "" });
    }
    for (const evento of eventosDoCaso(advogado.id, caso.id)) {
      if (!evento.data) continue;
      const linha = LINHA_DO_EVENTO[evento.tipo];
      itens.push({ id: evento.id, data: evento.data, linha, titulo: evento.tipo === "audiencia" || evento.tipo === "atendimento" ? `${NOME_DO_EVENTO[evento.tipo]}${evento.titulo ? ` · ${evento.titulo}` : ""}` : evento.titulo, detalhe: evento.descricao || quem, casoId: caso.id, cor: linha === "prazos" ? "red" : "" });
    }
  }
  itens.sort((a, b) => a.data.localeCompare(b.data));

  const naSemana = (data: string) => dias.includes(data);
  const noFimDeSemana = itens.filter((item) => fimDeSemana.includes(item.data));
  const proximos = itens.filter((item) => item.data >= hoje).slice(0, 6);
  const linhasComItem = LINHAS.filter(({ chave }) => itens.some((item) => item.linha === chave && naSemana(item.data)));
  const linhas = linhasComItem.length >= 3 ? linhasComItem : LINHAS.slice(0, Math.max(3, linhasComItem.length));

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Organização profissional</div><h1>Agenda e prazos</h1><p>Audiências, tarefas, compromissos e datas informadas nos casos. Prazos processuais permanecem sujeitos à conferência oficial.</p></div>
      <div className="inline"><Link href="/escritorio/agenda" className="btn btn-secondary">Hoje</Link><NovoCompromisso casos={casos.filter((caso) => caso.situacao !== "concluido").map((caso) => ({ id: caso.id, nome: caso.cliente?.nome ?? caso.titulo }))} /></div>
    </div>
    <div className="calendar-layout">
      <section className="calendar">
        <div className="inline" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <strong className="small">{tituloDaSemana(segunda)}</strong>
          <div className="inline"><Link className="icon-btn" href={`/escritorio/agenda?semana=${somarDias(segunda, -7)}`} aria-label="Semana anterior">‹</Link><Link className="icon-btn" href={`/escritorio/agenda?semana=${somarDias(segunda, 7)}`} aria-label="Semana seguinte">›</Link></div>
        </div>
        <div className="week-head"><div>Tipo</div>{dias.map((dia) => <div key={dia} className={dia === hoje ? "hoje" : undefined}>{diaDaSemana(dia)} {Number(dia.slice(8))}</div>)}</div>
        <div className="week-grid">
          {linhas.map(({ chave, nome }) => <div key={chave} style={{ display: "contents" }}>
            <div className="time">{nome}</div>
            {dias.map((dia) => <div key={dia} className={`slot${dia === hoje ? " hoje" : ""}`}>
              {itens.filter((item) => item.linha === chave && item.data === dia).map((item) => <Link key={item.id} href={`/escritorio/casos/${item.casoId}`} className={`event ${item.cor}`.trim()}><strong>{item.titulo}</strong>{item.detalhe}</Link>)}
            </div>)}
          </div>)}
        </div>
        {noFimDeSemana.length > 0 && <p className="tiny muted" style={{ marginTop: 10 }}>No fim de semana: {noFimDeSemana.map((item) => `${item.titulo} (${formatarData(item.data)})`).join("; ")}.</p>}
      </section>
      <aside className="stack">
        <section className="card"><div className="card-head"><h2>Próximos</h2></div><div className="card-body">
          {proximos.length === 0 && <p className="small muted" style={{ margin: 0 }}>Nada com data marcada daqui para a frente.</p>}
          {proximos.map((item) => {
            const quando = descreverPrazo(item.data);
            return <div className="att-item" key={item.id}><span className="att-dot" style={{ background: item.cor === "red" ? "var(--risk)" : item.linha === "audiencias" ? "var(--oab)" : "var(--warn)" }} /><div><strong>{item.titulo} · {item.detalhe.split(" · ")[0]}</strong><span>{diaDaSemana(item.data)}, {formatarData(item.data)}{quando ? ` · ${quando.texto}` : ""}{item.cor === "red" ? " · conferir no processo oficial" : ""}</span></div></div>;
          })}
        </div></section>
        {semData.length > 0 && <section className="card"><div className="card-head"><h2>Sem data</h2><span className="status st-warn">{semData.length}</span></div><div className="card-body">
          {semData.slice(0, 6).map((tarefa) => <div className="att-item" key={tarefa.id}><span className="att-dot" style={{ background: "var(--line-dark)" }} /><div><strong>{tarefa.titulo}</strong><span>{tarefa.caso} · combine uma data no caso</span></div></div>)}
        </div></section>}
        <div className="notice warn"><strong>Regra de segurança:</strong> uma data importada de intimação nunca se converte automaticamente em prazo fatal. O advogado precisa confirmá-la.</div>
      </aside>
    </div>
  </>;
}
