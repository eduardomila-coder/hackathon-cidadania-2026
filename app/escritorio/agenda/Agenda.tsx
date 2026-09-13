"use client";

import Link from "next/link";
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

type Props = { grupos: Record<ItemDaAgenda["grupo"], ItemDaAgenda[]>; total: number };

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

export function Agenda({ grupos, total }: Props) {
  return <div className="pd-agenda">
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">Agenda e prazos</p>
        <h1>Agenda e prazos</h1>
        <p className="pd-auxiliar">As tarefas com data de todos os seus casos, na ordem em que vencem. Cada item abre o caso de onde saiu, e a tarefa nova nasce lá dentro, no caso.</p>
      </div>
    </div>

    <p className="pd-aviso pd-aviso-atencao">
      <strong>Data de tarefa não é prazo processual.</strong> O que está aqui é compromisso de trabalho que o escritório anotou. Prazo se confere no processo oficial, no sistema do tribunal. Este ambiente ainda não guarda audiência nem compromisso com hora marcada: só as tarefas com data dos casos.
    </p>

    <dl className="pd-metricas">
      <div className={`pd-metrica${grupos.vencendo.length > 0 ? " pd-agenda-metrica-alerta" : ""}`}>
        <dt>Vencendo</dt><dd>{grupos.vencendo.length}</dd><small>até 7 dias, contando as vencidas</small>
      </div>
      <div className="pd-metrica"><dt>Mais adiante</dt><dd>{grupos.adiante.length}</dd><small>com data depois de 7 dias</small></div>
      <div className="pd-metrica"><dt>Sem data</dt><dd>{grupos.semData.length}</dd><small>tarefas sem prazo anotado</small></div>
      <div className="pd-metrica"><dt>Concluídas</dt><dd>{grupos.concluida.length}</dd><small>já marcadas como feitas</small></div>
    </dl>

    {total === 0
      ? <div className="pd-vazio">
        <strong>Nenhuma tarefa com data ainda.</strong>
        A tarefa nasce dentro do caso, na parte de tarefas: abra <Link href="/escritorio">um caso</Link> e anote o que precisa ser feito. O que tiver data aparece aqui, separado por vencimento.
      </div>
      : CLASSES.map(({ grupo, titulo, nota, vazio }) => <section className="pd-cartao" key={grupo}>
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
  </div>;
}
