import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listarCasosComDetalhes } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { descreverPrazo, formatarCnj, formatarData, formatarMomento, NOMES_DA_SITUACAO } from "../casos/formatos";
import { ListaDeNomeacoes, type NomeacaoNaTela } from "./Lista";
import "./nomeacoes.css";

export const metadata: Metadata = { title: "Nomeações · Ponto Dativo" };
export const dynamic = "force-dynamic";

// Nomeações recebidas. Não existe entidade separada de "nomeação": quando o
// advogado cola a intimação, ela nasce como caso com origem "nomeacao"
// (app/api/escritorio/nomeacao/route.ts). Então esta tela mostra exatamente
// esses casos, com o último registro que a leitura deixou na linha do tempo.
// Nada é estimado aqui: prazo, órgão e processo vêm do que foi registrado.
export default async function PaginaDeNomeacoes() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/nomeacoes");

  const casos = listarCasosComDetalhes(advogado.id).filter((caso) => caso.origem === "nomeacao");

  const nomeacoes: NomeacaoNaTela[] = casos.map((caso) => {
    const prazo = caso.prazo ? descreverPrazo(caso.prazo) : null;
    const registro = caso.ultimoRegistro;
    return {
      id: caso.id,
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
    };
  });

  const aConferir = nomeacoes.filter((item) => item.situacao === "novo").length;
  const naSemana = nomeacoes.filter((item) => item.prazo && ["vencido", "hoje", "urgente", "proximo"].includes(item.prazo.tom)).length;
  const concluidas = nomeacoes.filter((item) => item.situacao === "concluido").length;

  return <div className="pd-nomeacoes">
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">Nomeações</p>
        <h1>Nomeações recebidas</h1>
        <p className="pd-auxiliar">Cada nomeação registrada aqui já é um caso do escritório, com o processo, o órgão e o ato que vieram da intimação. O aceite e o andamento continuam no sistema do processo: esta tela não é canal oficial e o prazo se confere no processo.</p>
      </div>
      <div className="pd-pagina-acoes">
        <Link className="pd-botao pd-botao-primario" href="/escritorio">Nova nomeação</Link>
      </div>
    </div>

    <dl className="pd-metricas">
      <div className="pd-metrica"><dt>Nomeações registradas</dt><dd>{nomeacoes.length}</dd><small>casos com origem nomeação</small></div>
      <div className="pd-metrica"><dt>A conferir</dt><dd>{aConferir}</dd><small>ainda sem conferência do processo</small></div>
      <div className="pd-metrica"><dt>Prazo nesta semana</dt><dd>{naSemana}</dd><small>data anotada até 7 dias</small></div>
      <div className="pd-metrica"><dt>Concluídas</dt><dd>{concluidas}</dd><small>casos encerrados</small></div>
    </dl>

    <p className="pd-aviso">
      <strong>O que é o quê.</strong> Nomeação recebida que você ainda não registrou não aparece nesta lista: ela entra pela mesa de trabalho, em Nova nomeação, que lê a intimação e abre o caso. A partir daí o registro daqui é o caso aberto. Data em <em>prazo</em> é a que estava escrita na intimação e vale como <strong>a conferir no processo oficial</strong>.
    </p>

    <ListaDeNomeacoes nomeacoes={nomeacoes} />
  </div>;
}
