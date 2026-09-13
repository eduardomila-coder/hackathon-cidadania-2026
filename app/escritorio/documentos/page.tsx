import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { documentosDoCaso, listarCasosComDetalhes } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { formatarMomento, NOMES_DA_SITUACAO } from "../casos/formatos";
import { Documentos, type GrupoDeDocumentos } from "./Documentos";
import "./documentos.css";

export const metadata: Metadata = { title: "Documentos · Escritório Dativo" };
export const dynamic = "force-dynamic";

// Todos os documentos do advogado, agrupados pelo caso de origem. O que existe
// no modelo é o checklist do caso: quando o caso abre, nascem os documentos
// padrão com `recebido: false`, e o advogado marca o que chegou. Não há
// upload de arquivo nesta demonstração, e a tela diz isso em vez de fingir
// um botão que não grava nada.
export default async function PaginaDeDocumentos() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/documentos");

  const casos = listarCasosComDetalhes(advogado.id);
  const grupos: GrupoDeDocumentos[] = [];

  for (const caso of casos) {
    const documentos = documentosDoCaso(advogado.id, caso.id);
    if (documentos.length === 0) continue;
    grupos.push({
      casoId: caso.id,
      titulo: caso.titulo,
      cliente: caso.cliente?.nome ?? null,
      situacao: NOMES_DA_SITUACAO[caso.situacao],
      documentos: documentos.map((documento) => ({
        id: documento.id,
        nome: documento.nome,
        detalhe: documento.detalhe,
        essencial: documento.essencial,
        recebido: documento.recebido,
        atualizadoEm: formatarMomento(documento.atualizadoEm, { comAno: false }),
      })),
    });
  }

  // Caso com pendência essencial primeiro: é onde falta documento que trava.
  const pendentesDoGrupo = (grupo: GrupoDeDocumentos) => grupo.documentos.filter((documento) => !documento.recebido);
  grupos.sort((a, b) => {
    const essenciais = (grupo: GrupoDeDocumentos) => pendentesDoGrupo(grupo).filter((documento) => documento.essencial).length;
    return essenciais(b) - essenciais(a) || pendentesDoGrupo(b).length - pendentesDoGrupo(a).length || a.titulo.localeCompare(b.titulo, "pt-BR");
  });

  const todos = grupos.flatMap((grupo) => grupo.documentos);
  const resumo = {
    pendentes: todos.filter((documento) => !documento.recebido).length,
    essenciaisPendentes: todos.filter((documento) => !documento.recebido && documento.essencial).length,
    recebidos: todos.filter((documento) => documento.recebido).length,
    grupos: grupos.length,
  };

  return <Documentos grupos={grupos} resumo={resumo} />;
}
