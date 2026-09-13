import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listarCasosComDetalhes, tarefasDoCaso } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { descreverPrazo, diasAte, formatarData } from "../casos/formatos";
import { Agenda, type ItemDaAgenda } from "./Agenda";
import "./agenda.css";

export const metadata: Metadata = { title: "Agenda e prazos · Ponto Dativo" };
export const dynamic = "force-dynamic";

// Agenda = as tarefas com data de todos os casos do advogado. Não existe
// entidade de evento: audiência, atendimento e compromisso com hora não estão
// no modelo de dados, então não aparecem aqui, e a tela diz isso. Cada item
// leva ao caso de onde saiu. Data de tarefa é compromisso de trabalho, não
// prazo processual. O corte de 7 dias e o texto de cada data saem do servidor,
// para o HTML não depender do relógio de quem abre a tela.
export default async function PaginaDaAgenda() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/agenda");

  const casos = listarCasosComDetalhes(advogado.id);
  const itens: ItemDaAgenda[] = [];

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

  return <Agenda grupos={grupos} total={itens.length} />;
}
