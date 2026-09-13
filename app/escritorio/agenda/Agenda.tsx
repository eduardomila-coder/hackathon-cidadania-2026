"use client";

import Link from "next/link";
import type { TipoDeEvento } from "@/lib/escritorio";
import type { TomDoPrazo } from "../casos/formatos";

export type ItemDaAgenda = {
  id: string;
  titulo: string;
  casoId: string;
  caso: string;
  cliente: string | null;
  casoConcluido: boolean;
  prazo: string | null;
  texto: string | null;
  tom: TomDoPrazo | null;
  dias: number | null;
  grupo: "vencendo" | "adiante" | "semData" | "concluida";
};

export type EventoNaAgenda = {
  id: string;
  titulo: string;
  casoId: string;
  caso: string;
  cliente: string | null;
  tipo: TipoDeEvento;
  descricao: string;
  data: string | null;
  ordem: string | null;
  prazoInformado: string | null;
  atualizadoEm: string;
};

type Props = { grupos: Record<ItemDaAgenda["grupo"], ItemDaAgenda[]>; total: number; eventos: EventoNaAgenda[] };

const CLASSES: Array<{ grupo: ItemDaAgenda["grupo"]; titulo: string; nota: string; vazio: string }> = [
  { grupo: "vencendo", titulo: "Vencendo agora", nota: "vencidas e o que vence nos próximos 7 dias", vazio: "Nada vencendo nos próximos 7 dias." },
  { grupo: "adiante", titulo: "Mais adiante", nota: "com data marcada para depois de 7 dias", vazio: "Nenhuma tarefa marcada para depois desta semana." },
  { grupo: "semData", titulo: "Sem data", nota: "sem prazo anotado: combine uma data ou conclua a tarefa", vazio: "Toda tarefa aberta tem data." },
  { grupo: "concluida", titulo: "Concluídas", nota: "já marcadas como feitas no caso", vazio: "Nenhuma tarefa concluída ainda." },
];

function classeDoTom(tom: TomDoPrazo | null) {
  if (tom === "vencido" || tom === "hoje") return "pd-estado pd-estado-risco";
  if (tom === "urgente" || tom === "proximo") return "pd-estado pd-estado-atencao";
  return "pd-estado";
}

const NOME_DO_EVENTO: Record<TipoDeEvento, string> = {
  audiencia: "Audiência",
  atendimento: "Atendimento",
  tarefa: "Tarefa",
  revisao: "Revisão",
  prazo_informado: "Prazo informado",
  prazo_confirmado: "Prazo confirmado",
};

function DetalhesDoEvento({ evento }: { evento: EventoNaAgenda }) {
  const ePrazoInformado = evento.tipo === "prazo_informado";
  const ePrazoConfirmado = evento.tipo === "prazo_confirmado";
  return <>
    <span className={`pd-estado${ePrazoConfirmado ? " pd-estado-ok" : ePrazoInformado ? " pd-estado-atencao" : ""}`}>{NOME_DO_EVENTO[evento.tipo]}</span>
    {ePrazoInformado && <p className="pd-linha-meta"><strong>Informado:</strong> {evento.prazoInformado ?? "sem texto de prazo anotado"}</p>}
    {ePrazoConfirmado && <p className="pd-linha-meta"><strong>Confirmado:</strong> marcado pelo escritório; confira no processo oficial.</p>}
    <p className="pd-linha-meta">{evento.data ? `${ePrazoConfirmado ? "Data confirmada registrada" : "Data registrada"}: ${evento.data}` : "Sem data registrada"}</p>
  </>;
}

export function Agenda({ grupos, total, eventos }: Props) {
  return <div className="pd-agenda">
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">Agenda e prazos</p>
        <h1>Agenda e prazos</h1>
        <p className="pd-auxiliar">Tarefas e eventos anotados nos seus casos. Cada item abre o caso de onde veio.</p>
      </div>
    </div>

    <p className="pd-aviso pd-aviso-atencao">
      <strong>Agenda não confirma prazo processual.</strong> Tarefas e eventos são registros do escritório. “Prazo informado” reproduz a anotação; “prazo confirmado” indica apenas a marcação feita pelo escritório. Confira sempre no processo oficial.
    </p>

    <dl className="pd-metricas">
      <div className={`pd-metrica${grupos.vencendo.length > 0 ? " pd-agenda-metrica-alerta" : ""}`}>
        <dt>Vencendo</dt><dd>{grupos.vencendo.length}</dd><small>até 7 dias, contando as vencidas</small>
      </div>
      <div className="pd-metrica"><dt>Mais adiante</dt><dd>{grupos.adiante.length}</dd><small>com data depois de 7 dias</small></div>
      <div className="pd-metrica"><dt>Sem data</dt><dd>{grupos.semData.length}</dd><small>tarefas sem prazo anotado</small></div>
      <div className="pd-metrica"><dt>Concluídas</dt><dd>{grupos.concluida.length}</dd><small>já marcadas como feitas</small></div>
    </dl>

    {total === 0 && eventos.length === 0
      ? <div className="pd-vazio">
        <strong>Nenhuma tarefa ou evento anotado ainda.</strong>
        Abra <Link href="/escritorio">um caso</Link> para registrar uma tarefa ou evento.
      </div>
      : total > 0 && CLASSES.map(({ grupo, titulo, nota, vazio }) => <section className="pd-cartao" key={grupo}>
        <div className="pd-cartao-cabeca">
          <h2>{titulo}</h2>
          <span className="pd-auxiliar">{grupos[grupo].length} · {nota}</span>
        </div>
        {grupos[grupo].length === 0
          ? <p className="pd-agenda-vazio">{vazio}</p>
          : <div className="pd-lista">
            {grupos[grupo].map((item) => <Link key={item.id} className="pd-linha" href={`/escritorio/casos/${item.casoId}`}>
              <div className="pd-agenda-celula">
                {item.prazo
                  ? <p className="pd-numero">{item.prazo}</p>
                  : <p className="pd-auxiliar">sem data</p>}
              </div>
              <div className="pd-agenda-celula">
                <p className="pd-linha-titulo">{item.titulo}</p>
                <p className="pd-linha-meta">
                  {item.caso}{item.cliente ? ` · ${item.cliente}` : ""}{item.casoConcluido ? " · caso concluído" : ""}
                </p>
              </div>
              <div className="pd-agenda-celula">
                {item.grupo === "concluida"
                  ? <span className="pd-estado pd-estado-ok">Concluída</span>
                  : item.texto
                    ? <span className={classeDoTom(item.tom)}>{item.texto}</span>
                    : <span className="pd-estado">Sem data</span>}
              </div>
              <span className="pd-seta" aria-hidden="true">›</span>
            </Link>)}
          </div>}
      </section>)}

    {eventos.length > 0 && <section className="pd-cartao" aria-labelledby="eventos-registrados">
      <div className="pd-cartao-cabeca">
        <h2 id="eventos-registrados">Eventos registrados</h2>
        <span className="pd-auxiliar">{eventos.length === 1 ? "1 evento anotado" : `${eventos.length} eventos anotados`}</span>
      </div>
      <div className="pd-lista">
        {eventos.map((evento) => <Link key={evento.id} className="pd-linha pd-agenda-evento" href={`/escritorio/casos/${evento.casoId}`}>
          <div className="pd-agenda-celula">
            <p className="pd-numero">{evento.data ?? "sem data"}</p>
          </div>
          <div className="pd-agenda-celula">
            <p className="pd-linha-titulo">{evento.titulo}</p>
            <p className="pd-linha-meta">{evento.caso}{evento.cliente ? ` · ${evento.cliente}` : ""}</p>
            {evento.descricao && <p className="pd-linha-meta">{evento.descricao}</p>}
          </div>
          <div className="pd-agenda-celula"><DetalhesDoEvento evento={evento} /></div>
          <span className="pd-seta" aria-hidden="true">›</span>
        </Link>)}
      </div>
    </section>}
  </div>;
}
