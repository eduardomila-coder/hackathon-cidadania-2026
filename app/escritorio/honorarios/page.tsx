import Link from "next/link";
import { redirect } from "next/navigation";
import { honorariosDoCaso, listarCasosComDetalhes } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { formatarCnj, formatarMomento } from "../casos/formatos";
import { ETAPAS_PADRAO, Honorarios } from "./Honorarios";

export const metadata = { title: "Honorários · Escritório Dativo" };
export const dynamic = "force-dynamic";

// Honorários dativos no desenho do protótipo: resumo, o fluxo em cinco etapas
// e a tabela por caso. Não há valor, tabela nem integração institucional: a
// coluna de valor mostra o que o advogado anotou nos registros, ou nada.
export default async function PaginaDeHonorarios({ searchParams }: { searchParams: Promise<{ caso?: string }> }) {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/honorarios");
  const { caso: casoPedido } = await searchParams;

  const casos = listarCasosComDetalhes(advogado.id);
  const linhas = casos.map((caso) => ({ caso, honorarios: honorariosDoCaso(advogado.id, caso.id) }));
  const comFluxo = linhas.filter((linha) => linha.honorarios !== null);

  const etapaAtual = (etapas: Array<{ titulo: string; concluida: boolean }>) => etapas.find((etapa) => !etapa.concluida)?.titulo ?? (etapas.length ? "Acompanhamento" : "Sem etapas");
  const indiceDaEtapa = (titulo: string) => ETAPAS_PADRAO.findIndex((padrao) => titulo.toLowerCase().includes(padrao.toLowerCase().split(" ")[0]));
  const valorAnotado = (registros: Array<{ texto: string }>) => registros.map((registro) => registro.texto.match(/R\$\s?[\d.]+(?:,\d{2})?/)?.[0]).find(Boolean) ?? null;

  const aguardandoCertidao = comFluxo.filter(({ honorarios }) => indiceDaEtapa(etapaAtual(honorarios!.etapas)) === 1).length;
  const prontos = comFluxo.filter(({ honorarios }) => indiceDaEtapa(etapaAtual(honorarios!.etapas)) === 3).length;
  const emAcompanhamento = comFluxo.filter(({ honorarios }) => indiceDaEtapa(etapaAtual(honorarios!.etapas)) >= 4 || honorarios!.etapas.length > 0 && honorarios!.etapas.every((etapa) => etapa.concluida)).length;

  const selecionado = casos.find((caso) => caso.id === casoPedido) ?? comFluxo[0]?.caso ?? casos[0] ?? null;
  const fluxoSelecionado = selecionado ? honorariosDoCaso(advogado.id, selecionado.id) : null;
  const passoAtual = fluxoSelecionado ? indiceDaEtapa(etapaAtual(fluxoSelecionado.etapas)) : -1;
  const tudoConcluido = fluxoSelecionado ? fluxoSelecionado.etapas.length > 0 && fluxoSelecionado.etapas.every((etapa) => etapa.concluida) : false;

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Honorários</div><h1>Honorários dativos</h1><p>Organize certidões, documentos e etapas administrativas sem perder o vínculo com o caso que originou o crédito. Nada aqui confirma valor, direito ou pagamento perante qualquer instituição.</p></div>
      {selecionado && !fluxoSelecionado && <Link href={`/escritorio/honorarios?caso=${selecionado.id}#acompanhamento`} className="btn btn-primary">Novo acompanhamento</Link>}
    </div>
    <div className="money-summary">
      <div className="money"><label>Casos com honorários</label><strong>{comFluxo.length}</strong></div>
      <div className="money"><label>Aguardando certidão</label><strong>{aguardandoCertidao}</strong></div>
      <div className="money"><label>Prontos para requerimento</label><strong>{prontos}</strong></div>
      <div className="money"><label>Em acompanhamento</label><strong>{emAcompanhamento}</strong></div>
    </div>
    <div className="flow" aria-label={selecionado ? `Fluxo do caso ${selecionado.titulo}` : "Fluxo de honorários"}>
      {ETAPAS_PADRAO.map((etapa, indice) => {
        const feita = tudoConcluido || (passoAtual > indice);
        const agora = !tudoConcluido && passoAtual === indice;
        return <div key={etapa} className={`flow-step${feita ? " done" : ""}${agora ? " now" : ""}`}><strong>{indice + 1}. {etapa}</strong><span>{DESCRICAO_DA_ETAPA[indice]}</span></div>;
      })}
    </div>
    <section className="card">
      <div className="fee-row header"><div>Caso</div><div>Etapa</div><div>Valor registrado</div><div>Última atualização</div><div>Ação</div></div>
      {comFluxo.length === 0 && <div className="vazio"><strong>Nenhum acompanhamento iniciado.</strong>Escolha um caso abaixo e inicie o fluxo quando houver arbitramento ou certidão.</div>}
      {comFluxo.map(({ caso, honorarios }) => {
        const etapa = etapaAtual(honorarios!.etapas);
        const indice = indiceDaEtapa(etapa);
        const valor = valorAnotado(honorarios!.registros);
        return <div className="fee-row" key={caso.id}>
          <div><strong>{caso.cliente?.nome ?? caso.titulo}</strong><div className="tiny muted mono">{caso.processo ? formatarCnj(caso.processo) : caso.titulo}</div></div>
          <div><span className={`status ${indice === 1 ? "st-warn" : indice >= 4 ? "st-ok" : "st-info"}`}>{etapa}</span></div>
          <div>{valor ?? <span className="muted">—</span>}</div>
          <div className="muted">{formatarMomento(honorarios!.atualizadoEm, { comAno: false })}</div>
          <div><Link href={`/escritorio/honorarios?caso=${caso.id}#acompanhamento`} className="btn btn-secondary btn-sm">Abrir</Link></div>
        </div>;
      })}
    </section>
    <div className="notice" style={{ margin: "13px 0 22px" }}><strong>Integração institucional possível:</strong> por ser mantida pela OAB/PR, a ferramenta pode futuramente reaproveitar dados do cadastro e orientar o advogado conforme o procedimento oficial de cobrança, sem prometer protocolo automático onde ele não exista.</div>

    <div id="acompanhamento">
      <Honorarios casos={casos.map((caso) => ({ id: caso.id, titulo: caso.cliente ? `${caso.cliente.nome} · ${caso.titulo}` : caso.titulo }))} casoInicial={selecionado?.id ?? ""} />
    </div>
  </>;
}

const DESCRICAO_DA_ETAPA = ["ato registrado", "obter e conferir dados", "documentos obrigatórios", "protocolo no canal competente", "pendência, análise e pagamento"];
