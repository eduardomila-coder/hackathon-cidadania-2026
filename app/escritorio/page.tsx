import Link from "next/link";
import { redirect } from "next/navigation";
import { documentosDoCaso, eventosDoCaso, honorariosDoCaso, listarCasosComDetalhes, resumoDoEscritorio, tarefasDoCaso, type CasoComDetalhes } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { dataPorExtenso, descreverPrazo, diasAte, formatarCnj, formatarData, primeiroNome, saudacao, hojeIso } from "./casos/formatos";
import { RegistrarNomeacao } from "./RegistrarNomeacao";

export const dynamic = "force-dynamic";

type Linha = {
  href: string; titulo: string; meta: string;
  estado: string; classeDoEstado: string;
  data: string; classeDaData: string;
  proxima: string; ordem: number;
};

// Linha da fila de trabalho: o que o caso pede de mais urgente, no desenho do
// protótipo (nome · processo e órgão · estado · data · próxima ação).
function linhaDoCaso(caso: CasoComDetalhes, advogadoId: string): Linha {
  const tarefas = tarefasDoCaso(advogadoId, caso.id).filter((tarefa) => !tarefa.concluida);
  const eventos = eventosDoCaso(advogadoId, caso.id);
  const hoje = hojeIso();
  const audiencia = eventos.filter((evento) => evento.tipo === "audiencia" && evento.data && evento.data >= hoje).sort((a, b) => a.data!.localeCompare(b.data!))[0];
  const prazo = descreverPrazo(caso.prazo);
  const meta = [caso.processo ? formatarCnj(caso.processo) : null, caso.orgao].filter(Boolean).join(" · ") || (caso.cliente ? caso.cliente.nome : "Sem processo informado");
  const proxima = tarefas[0]?.titulo ?? "Conferir prazo oficial";

  if (caso.prazo && prazo && ["vencido", "hoje", "urgente", "proximo"].includes(prazo.tom)) {
    return { href: `/escritorio/casos/${caso.id}`, titulo: caso.cliente?.nome ?? caso.titulo, meta, estado: prazo.tom === "vencido" ? "Prazo vencido" : "Prazo próximo", classeDoEstado: "risk-text", data: formatarData(caso.prazo), classeDaData: "risk-text", proxima, ordem: diasAte(caso.prazo) };
  }
  if (audiencia) {
    return { href: `/escritorio/casos/${caso.id}`, titulo: caso.cliente?.nome ?? caso.titulo, meta, estado: "Audiência", classeDoEstado: "info-text", data: formatarData(audiencia.data), classeDaData: "", proxima: "Preparação pendente", ordem: 10 + diasAte(audiencia.data!) };
  }
  if (caso.situacao === "aguardando_cliente") {
    return { href: `/escritorio/casos/${caso.id}`, titulo: caso.cliente?.nome ?? caso.titulo, meta, estado: "Aguardando cliente", classeDoEstado: "warn-text", data: caso.prazo ? formatarData(caso.prazo) : "Sem data", classeDaData: "", proxima, ordem: 100 };
  }
  return { href: `/escritorio/casos/${caso.id}`, titulo: caso.cliente?.nome ?? caso.titulo, meta, estado: caso.situacao === "novo" ? "Novo" : "Em andamento", classeDoEstado: caso.situacao === "novo" ? "warn-text" : "", data: caso.prazo ? formatarData(caso.prazo) : "Sem data", classeDaData: "", proxima, ordem: 200 + (caso.prazo ? diasAte(caso.prazo) : 999) };
}

function plural(n: number, um: string, varios: string) { return `${n} ${n === 1 ? um : varios}`; }

export default async function Inicio() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar");

  const resumo = resumoDoEscritorio(advogado.id);
  const casos = listarCasosComDetalhes(advogado.id);
  const abertos = casos.filter((caso) => caso.situacao !== "concluido");

  const semanaAtras = new Date(); semanaAtras.setDate(semanaAtras.getDate() - 7);
  const comAtividade = abertos.filter((caso) => caso.ultimoRegistro && new Date(caso.ultimoRegistro.quando) >= semanaAtras).length;
  const hoje = hojeIso();
  const daqui7 = new Date(); daqui7.setDate(daqui7.getDate() + 7);
  const limite = daqui7.toISOString().slice(0, 10);
  const audiencias = abertos.flatMap((caso) => eventosDoCaso(advogado.id, caso.id))
    .filter((evento) => evento.tipo === "audiencia" && evento.data && evento.data >= hoje && evento.data <= limite);
  const honorarios = casos.map((caso) => honorariosDoCaso(advogado.id, caso.id)).filter((item) => item !== null);
  const comPendencia = honorarios.filter((item) => item!.pendencias.some((pendencia) => !pendencia.resolvida)).length;
  const casosComDocumentoPendente = abertos.filter((caso) => documentosDoCaso(advogado.id, caso.id).some((documento) => !documento.recebido)).length;
  const prazosHoje = resumo.prazosProximos.filter((item) => item.prazo === hoje).length;

  const fila = abertos.map((caso) => linhaDoCaso(caso, advogado.id)).sort((a, b) => a.ordem - b.ordem).slice(0, 6);
  const prioritario = fila[0];

  const atencao: Array<{ cor: string; titulo: string; texto: string }> = [];
  for (const item of resumo.prazosProximos.slice(0, 2)) {
    const prazo = descreverPrazo(item.prazo);
    const [caso, tarefa] = item.titulo.split(": ");
    atencao.push({ cor: "", titulo: tarefa ? `${tarefa} · ${caso}` : `Conferir prazo de ${caso}`, texto: `${formatarData(item.prazo)}${prazo ? `, ${prazo.texto}` : ""} · prazo informado não substitui o processo oficial.` });
  }
  for (const audiencia of audiencias.slice(0, 1)) atencao.push({ cor: "var(--warn)", titulo: audiencia.titulo, texto: `${formatarData(audiencia.data)}${audiencia.descricao ? ` · ${audiencia.descricao}` : ""}` });
  if (resumo.mensagensNovas > 0) atencao.push({ cor: "var(--oab)", titulo: plural(resumo.mensagensNovas, "mensagem nova", "mensagens novas"), texto: "Conversas ainda não lidas no atendimento." });
  if (atencao.length === 0) atencao.push({ cor: "var(--ok)", titulo: "Nada urgente registrado", texto: "Nenhum prazo, audiência ou mensagem pendente hoje." });

  const partes: string[] = [];
  if (resumo.prazosProximos.length) partes.push(plural(resumo.prazosProximos.length, "prazo informado nesta semana", "prazos informados nesta semana"));
  if (audiencias.length) partes.push(plural(audiencias.length, "audiência", "audiências"));
  if (resumo.mensagensNovas) partes.push(plural(resumo.mensagensNovas, "mensagem ainda não lida", "mensagens ainda não lidas"));
  if (resumo.documentosPendentes) partes.push(plural(resumo.documentosPendentes, "documento pendente", "documentos pendentes"));
  const frase = partes.length
    ? `Há ${partes.length} ${partes.length === 1 ? "ponto que merece" : "pontos que merecem"} atenção hoje: ${partes.length > 1 ? `${partes.slice(0, -1).join(", ")} e ${partes.at(-1)}` : partes[0]}.`
    : abertos.length ? "Nenhuma providência urgente registrada para hoje." : "Nenhum caso aberto ainda. Comece registrando uma nomeação.";

  return <>
    <section className="workday-head">
      <div>
        <div className="workday-date">{dataPorExtenso()}</div>
        <h1>{saudacao()}, {primeiroNome(advogado.nome)}.</h1>
        <p>{frase}</p>
      </div>
      <div className="inline workday-actions">
        <RegistrarNomeacao />
        {prioritario
          ? <Link href={prioritario.href} className="btn btn-primary">Abrir caso prioritário</Link>
          : <Link href="/escritorio/casos" className="btn btn-primary">Abrir casos</Link>}
      </div>
    </section>

    <section className="metrics">
      <div className="metric"><label>Casos ativos</label><strong>{abertos.length}</strong><small>{comAtividade} com atividade nesta semana</small></div>
      <div className="metric"><label>Prazos em 7 dias</label><strong>{resumo.prazosProximos.length}</strong><small>{prazosHoje ? `${prazosHoje} exige conferência hoje` : "a conferir no processo oficial"}</small></div>
      <div className="metric"><label>Audiências</label><strong>{audiencias.length}</strong><small>próximos 7 dias</small></div>
      <div className="metric"><label>Documentos pendentes</label><strong>{resumo.documentosPendentes}</strong><small>em {plural(casosComDocumentoPendente, "caso aberto", "casos abertos")}</small></div>
      <div className="metric"><label>Honorários em fluxo</label><strong>{honorarios.length}</strong><small>{comPendencia} com pendência</small></div>
    </section>

    <div className="home-grid">
      <section className="card">
        <div className="card-head"><h2>Minha fila de trabalho</h2><div className="inline"><Link href="/escritorio/casos" className="btn btn-quiet btn-sm">Todos os casos</Link><Link href="/escritorio/agenda" className="btn btn-secondary btn-sm">Ver agenda</Link></div></div>
        <div className="list">
          {fila.length === 0 && <div className="vazio"><strong>Nenhum caso aberto.</strong>Registre uma nomeação ou abra um caso em Casos.</div>}
          {fila.map((linha) => <Link key={linha.href} href={linha.href} className="list-row" style={{ borderLeft: 0, borderRight: 0, borderTop: 0, background: "white" }}>
            <div><div className="list-title">{linha.titulo}</div><div className="list-meta mono">{linha.meta}</div></div>
            <span className={`row-state ${linha.classeDoEstado}`.trim()}>{linha.estado}</span>
            <strong className={`deadline-text ${linha.classeDaData}`.trim()}>{linha.data}</strong>
            <span className="small muted">{linha.proxima}</span>
            <span className="chev">›</span>
          </Link>)}
        </div>
      </section>
      <aside className="stack">
        <section className="card"><div className="card-head"><h2>Atenção hoje</h2></div><div className="card-body attention">
          {atencao.map((item, indice) => <div className="att-item" key={indice}><span className="att-dot" style={item.cor ? { background: item.cor } : undefined} /><div><strong>{item.titulo}</strong><span>{item.texto}</span></div></div>)}
        </div></section>
        <section className="card"><div className="card-head"><h2>Habilitação</h2><span className="status st-ok">Conta ativa</span></div><div className="card-body">
          <div className="small"><strong>{advogado.oab}</strong></div>
          <div className="profile-progress"><span style={{ width: "100%" }} /></div>
          <div className="tiny muted">Conta do evento ativa. A situação cadastral e as listas de habilitação não são consultadas nesta demonstração.</div>
          <Link href="/escritorio/formacao" className="btn btn-secondary btn-sm btn-block" style={{ marginTop: 11 }}>Ver formação e listas</Link>
        </div></section>
        <section className="card"><div className="card-head"><h2>Ações frequentes</h2></div><div className="card-body quick-grid">
          <Link href="/escritorio/nomeacoes" className="quick"><strong>Nova nomeação</strong><span>Extrair ficha de uma intimação</span></Link>
          <Link href="/escritorio/mensagens" className="quick"><strong>Solicitar documentos</strong><span>Via WhatsApp do caso</span></Link>
          <Link href="/escritorio/pesquisa" className="quick"><strong>Pesquisar fundamento</strong><span>Com fonte rastreável</span></Link>
          <Link href="/escritorio/honorarios" className="quick"><strong>Honorários</strong><span>Certidões e pedidos</span></Link>
        </div></section>
      </aside>
    </div>
  </>;
}
