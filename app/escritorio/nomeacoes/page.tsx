import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listarNomeacoes } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { formatarCnj, formatarMomento } from "../casos/formatos";
import { ListaDeNomeacoes, type NomeacaoNaTela } from "./Lista";
import "./nomeacoes.css";

export const metadata: Metadata = { title: "Nomeações · Escritório Dativo" };
export const dynamic = "force-dynamic";

// A nomeação é registrada antes de virar caso. A tela não mistura os dois
// fluxos: o vínculo aparece apenas quando o caso for aberto após a conferência.
export default async function PaginaDeNomeacoes() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/nomeacoes");

  const registros = listarNomeacoes(advogado.id);

  const nomeacoes: NomeacaoNaTela[] = registros.map((nomeacao) => {
    const ficha = nomeacao.camposExtraidos;
    return {
      id: nomeacao.id,
      titulo: ficha.ato ?? (ficha.processo ? `Nomeação no processo ${formatarCnj(ficha.processo)}` : "Nomeação a conferir"),
      processo: ficha.processo ? formatarCnj(ficha.processo) : null,
      orgao: ficha.orgao,
      ato: ficha.ato,
      estado: nomeacao.estado,
      casoId: nomeacao.casoId,
      registradaEm: formatarMomento(nomeacao.criadoEm, { comAno: false }),
      atualizadaEm: formatarMomento(nomeacao.atualizadoEm, { comAno: false }),
    };
  });

  const abertas = nomeacoes.filter((item) => item.estado === "aberta").length;
  const arquivadas = nomeacoes.filter((item) => item.estado === "arquivada").length;
  const emConferencia = nomeacoes.filter((item) => item.estado === "aberta" && !item.casoId).length;
  const casosAbertos = nomeacoes.filter((item) => item.casoId).length;

  return <div className="pd-nomeacoes">
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">Nomeações</p>
        <h1>Nomeações recebidas</h1>
        <p className="pd-auxiliar">Cada intimação fica registrada aqui antes de virar caso. O aceite e o andamento continuam no sistema do processo: esta tela não é canal oficial e o prazo se confere no processo.</p>
      </div>
      <div className="pd-pagina-acoes">
        <Link className="pd-botao pd-botao-primario" href="/escritorio">Nova nomeação</Link>
      </div>
    </div>

    <dl className="pd-metricas">
      <div className="pd-metrica"><dt>Registradas</dt><dd>{nomeacoes.length}</dd><small>intimações guardadas separadamente</small></div>
      <div className="pd-metrica"><dt>Abertas</dt><dd>{abertas}</dd><small>disponíveis para conferência</small></div>
      <div className="pd-metrica"><dt>Arquivadas</dt><dd>{arquivadas}</dd><small>não seguirão para abertura</small></div>
      <div className="pd-metrica"><dt>Casos abertos</dt><dd>{casosAbertos}</dd><small>{emConferencia} ainda em conferência</small></div>
    </dl>

    <p className="pd-aviso">
      <strong>O que é o quê.</strong> Uma nomeação registrada ainda não é um caso. Abra o detalhe para conferir o texto, marcar as verificações e decidir se deve abrir o caso. Data em <em>prazo</em> é a que estava escrita na intimação e vale como <strong>a conferir no processo oficial</strong>.
    </p>

    <ListaDeNomeacoes nomeacoes={nomeacoes} />
  </div>;
}
