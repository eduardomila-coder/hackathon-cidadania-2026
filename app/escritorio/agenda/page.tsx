import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eventosDoCaso, listarCasosComDetalhes, tarefasDoCaso } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { descreverPrazo, diasAte, formatarData } from "../casos/formatos";
import { Agenda, type ItemDaAgenda } from "./Agenda";
import "./agenda.css";

export const metadata: Metadata = { title: "Agenda e prazos · Escritório Dativo" };
export const dynamic = "force-dynamic";

// A agenda junta tarefas e os eventos que o escritório anotou em cada caso.
// Datas de eventos são só exibidas como foram registradas: a tela não confirma
// nem calcula prazo processual.
export default async function PaginaDaAgenda() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/agenda");

  const casos = listarCasosComDetalhes(advogado.id);
  const itens: ItemDaAgenda[] = [];
  const eventos = [];

  for (const caso of casos) {
    for (const tarefa of tarefasDoCaso(advogado.id, caso.id)) {
      const dias = tarefa.prazo ? diasAte(tarefa.prazo) : null;
      const descricao = tarefa.prazo ? descreverPrazo(tarefa.prazo) : null;
      const grupo: ItemDaAgenda["grupo"] = tarefa.concluida
        ? "concluida"
        : dias === null
          ? "semData"
          : dias <= 7 ? "vencendo" : "adiante";
      itens.push({
        id: tarefa.id,
        titulo: tarefa.titulo,
        casoId: caso.id,
        caso: caso.titulo,
        cliente: caso.cliente?.nome ?? null,
        casoConcluido: caso.situacao === "concluido",
        prazo: tarefa.prazo ? formatarData(tarefa.prazo) : null,
        texto: descricao?.texto ?? null,
        tom: descricao?.tom ?? null,
        dias,
        grupo,
      });
    }
    for (const evento of eventosDoCaso(advogado.id, caso.id)) {
      eventos.push({
        id: evento.id,
        titulo: evento.titulo,
        casoId: caso.id,
        caso: caso.titulo,
        cliente: caso.cliente?.nome ?? null,
        tipo: evento.tipo,
        descricao: evento.descricao,
        data: evento.data ? formatarData(evento.data) : null,
        ordem: evento.data,
        prazoInformado: evento.prazoInformado,
        atualizadoEm: evento.atualizadoEm,
      });
    }
  }

  // Vencendo primeiro, por data; o resto por caso e título, para a lista não
  // dançar entre uma abertura e outra.
  const porData = (a: ItemDaAgenda, b: ItemDaAgenda) => (a.dias ?? 0) - (b.dias ?? 0) || a.caso.localeCompare(b.caso, "pt-BR");
  const porCaso = (a: ItemDaAgenda, b: ItemDaAgenda) => a.caso.localeCompare(b.caso, "pt-BR") || a.titulo.localeCompare(b.titulo, "pt-BR");
  const grupos: Record<ItemDaAgenda["grupo"], ItemDaAgenda[]> = {
    vencendo: itens.filter((item) => item.grupo === "vencendo").sort(porData),
    adiante: itens.filter((item) => item.grupo === "adiante").sort(porData),
    semData: itens.filter((item) => item.grupo === "semData").sort(porCaso),
    concluida: itens.filter((item) => item.grupo === "concluida").sort(porCaso),
  };

  eventos.sort((a, b) => (a.ordem ?? "9999-99-99").localeCompare(b.ordem ?? "9999-99-99") || a.atualizadoEm.localeCompare(b.atualizadoEm));

  return <Agenda grupos={grupos} total={itens.length} eventos={eventos} />;
}
