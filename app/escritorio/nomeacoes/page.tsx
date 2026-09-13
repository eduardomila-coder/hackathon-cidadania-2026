import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listarCasosComDetalhes, listarNomeacoes } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { descreverPrazo, formatarCnj, formatarData, formatarMomento } from "../casos/formatos";
import { RegistrarNomeacao } from "../RegistrarNomeacao";
import { ListaDeNomeacoes, type NomeacaoNaTela } from "./Lista";

export const metadata: Metadata = { title: "Nomeações · Escritório Dativo" };
export const dynamic = "force-dynamic";

// Nomeações recebidas em duas origens: o registro próprio de nomeação (novo,
// separado do caso, com checklist de conferência) e os casos de nomeação
// criados antes dessa entidade existir, que continuam entrando para não
// desaparecerem da tela. Nada é estimado: prazo, órgão e processo vêm do que foi
// registrado, e o prazo é sempre a conferir no processo oficial.
export default async function PaginaDeNomeacoes() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/nomeacoes");

  const registros = listarNomeacoes(advogado.id);
  const casos = listarCasosComDetalhes(advogado.id);
  const casosPorId = new Map(casos.map((caso) => [caso.id, caso]));
  const vinculados = new Set(registros.map((registro) => registro.casoId).filter((id): id is string => Boolean(id)));

  const nomeacoes: NomeacaoNaTela[] = [];

  // Registros próprios de nomeação.
  for (const registro of registros) {
    const ficha = registro.camposExtraidos;
    const caso = registro.casoId ? casosPorId.get(registro.casoId) ?? null : null;
    const conferidos = registro.checklist.filter((item) => item.conferido).length;
    const prazo = ficha.dataPrazo ? descreverPrazo(ficha.dataPrazo) : null;
    const aba = registro.estado === "arquivada" ? "arquivadas" : caso ? "convertidas" : conferidos > 0 ? "analise" : "pendentes";
    nomeacoes.push({
      id: registro.id,
      destino: caso ? `/escritorio/casos/${caso.id}` : `/escritorio/nomeacoes/${registro.id}`,
      aba,
      origem: caso ? "Convertida" : "Registro manual",
      registradaEm: formatarMomento(registro.criadoEm, { comAno: false }),
      titulo: caso?.cliente?.nome ?? caso?.titulo ?? (ficha.ato ? `Nomeação: ${ficha.ato}` : "Nomeação a conferir"),
      processo: ficha.processo ? formatarCnj(ficha.processo) : null,
      orgao: ficha.orgao,
      estado: caso
        ? { texto: "Caso aberto", tom: "ok" }
        : registro.estado === "arquivada" ? { texto: "Arquivada", tom: "neutral" }
        : conferidos > 0 ? { texto: "Conferir", tom: "warn" } : { texto: "Ação necessária", tom: "risk" },
      ato: ficha.ato,
      prazo: ficha.dataPrazo && prazo ? `${formatarData(ficha.dataPrazo)} · ${prazo.texto}` : ficha.prazoInformado ? `Prazo informado: ${ficha.prazoInformado}` : "Prazo: conferir no processo",
    });
  }

  // Casos de nomeação anteriores à entidade própria; levam direto ao caso.
  for (const caso of casos) {
    if (caso.origem !== "nomeacao" || vinculados.has(caso.id)) continue;
    const prazo = caso.prazo ? descreverPrazo(caso.prazo) : null;
    nomeacoes.push({
      id: caso.id,
      destino: `/escritorio/casos/${caso.id}`,
      aba: caso.situacao === "concluido" ? "arquivadas" : caso.situacao === "novo" ? "pendentes" : "convertidas",
      origem: caso.situacao === "novo" ? "Registro manual" : "Convertida",
      registradaEm: formatarMomento(caso.criadoEm, { comAno: false }),
      titulo: caso.cliente?.nome ?? caso.titulo,
      processo: caso.processo ? formatarCnj(caso.processo) : null,
      orgao: caso.orgao,
      estado: caso.situacao === "concluido" ? { texto: "Encerrado", tom: "neutral" }
        : caso.situacao === "novo" ? { texto: "Ação necessária", tom: "risk" }
        : { texto: "Caso aberto", tom: "ok" },
      ato: caso.ato,
      prazo: caso.prazo && prazo ? `${formatarData(caso.prazo)} · ${prazo.texto}` : "Prazo: conferir no processo",
    });
  }

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Nomeações</div><h1>Nomeações</h1><p>Registre e organize as nomeações recebidas nos canais oficiais. O aceite processual continua no sistema judicial competente.</p></div>
      <RegistrarNomeacao classe="btn btn-primary" />
    </div>
    <ListaDeNomeacoes nomeacoes={nomeacoes} />
    <div className="notice" style={{ marginTop: 13 }}><strong>Integração futura:</strong> quando houver canal institucional autorizado, o Escritório Dativo pode receber metadados da nomeação diretamente. Até lá, o registro por texto colado evita inventar uma integração inexistente.</div>
  </>;
}
