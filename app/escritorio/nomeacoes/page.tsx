import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listarCasosComDetalhes, listarNomeacoes } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { descreverPrazo, formatarCnj, formatarData, formatarMomento, NOMES_DA_SITUACAO } from "../casos/formatos";
import { ListaDeNomeacoes, type NomeacaoNaTela } from "./Lista";
import "./nomeacoes.css";

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
    const prazo = ficha.dataPrazo ? descreverPrazo(ficha.dataPrazo) : null;
    nomeacoes.push({
      id: registro.id,
      destino: `/escritorio/nomeacoes/${registro.id}`,
      titulo: ficha.ato ? `Nomeação: ${ficha.ato}` : "Nomeação a conferir",
      cliente: caso?.cliente?.nome ?? null,
      processo: ficha.processo ? formatarCnj(ficha.processo) : null,
      orgao: ficha.orgao,
      ato: ficha.ato,
      situacao: caso ? caso.situacao : registro.estado === "arquivada" ? "concluido" : "novo",
      situacaoNome: caso
        ? NOMES_DA_SITUACAO[caso.situacao]
        : registro.estado === "arquivada" ? "Arquivada, sem caso" : "Aberta para conferência",
      registradaEm: formatarMomento(registro.criadoEm, { comAno: false }),
      prazo: ficha.dataPrazo && prazo ? { data: formatarData(ficha.dataPrazo), texto: prazo.texto, tom: prazo.tom } : null,
      ultimoRegistro: null,
    });
  }

  // Casos de nomeação anteriores à entidade própria; levam direto ao caso.
  for (const caso of casos) {
    if (caso.origem !== "nomeacao" || vinculados.has(caso.id)) continue;
    const prazo = caso.prazo ? descreverPrazo(caso.prazo) : null;
    const registro = caso.ultimoRegistro;
    nomeacoes.push({
      id: caso.id,
      destino: `/escritorio/casos/${caso.id}`,
      titulo: caso.titulo,
      cliente: caso.cliente?.nome ?? null,
      processo: caso.processo ? formatarCnj(caso.processo) : null,
      orgao: caso.orgao,
      ato: caso.ato,
      situacao: caso.situacao,
      situacaoNome: NOMES_DA_SITUACAO[caso.situacao],
      registradaEm: formatarMomento(caso.criadoEm, { comAno: false }),
      prazo: caso.prazo && prazo ? { data: formatarData(caso.prazo), texto: prazo.texto, tom: prazo.tom } : null,
      ultimoRegistro: registro ? {
        texto: registro.texto.length > 170 ? `${registro.texto.slice(0, 170).trimEnd()}…` : registro.texto,
        quando: formatarMomento(registro.quando, { comAno: false }),
      } : null,
    });
  }

  const aConferir = nomeacoes.filter((item) => item.situacao === "novo").length;
  const naSemana = nomeacoes.filter((item) => item.prazo && ["vencido", "hoje", "urgente", "proximo"].includes(item.prazo.tom)).length;
  const concluidas = nomeacoes.filter((item) => item.situacao === "concluido").length;

  return <div className="pd-nomeacoes">
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">Nomeações</p>
        <h1>Nomeações recebidas</h1>
        <p className="pd-auxiliar">Cada linha é uma nomeação: o registro próprio, que vira caso só depois das suas conferências, ou um caso de nomeação já aberto. O aceite e o andamento continuam no sistema do processo: esta tela não é canal oficial e o prazo se confere no processo.</p>
      </div>
      <div className="pd-pagina-acoes">
        <Link className="pd-botao pd-botao-primario" href="/escritorio">Nova nomeação</Link>
      </div>
    </div>

    <dl className="pd-metricas">
      <div className="pd-metrica"><dt>Nomeações registradas</dt><dd>{nomeacoes.length}</dd><small>registros próprios e casos de nomeação</small></div>
      <div className="pd-metrica"><dt>A conferir</dt><dd>{aConferir}</dd><small>ainda sem conferência do processo</small></div>
      <div className="pd-metrica"><dt>Prazo nesta semana</dt><dd>{naSemana}</dd><small>data anotada até 7 dias</small></div>
      <div className="pd-metrica"><dt>Concluídas</dt><dd>{concluidas}</dd><small>casos encerrados ou arquivadas</small></div>
    </dl>

    <p className="pd-aviso">
      <strong>O que é o quê.</strong> A nomeação nova entra pela mesa de trabalho, em <em>Nova nomeação</em>: o texto colado vira ficha, o registro fica com o checklist de conferência e o caso só abre depois que você marcar cada conferência. As linhas sem registro próprio são casos de nomeação abertos antes disso e levam direto ao caso. Data em <em>prazo</em> é a que estava escrita na intimação e vale como <strong>a conferir no processo oficial</strong>.
    </p>

    <ListaDeNomeacoes nomeacoes={nomeacoes} />
  </div>;
}
