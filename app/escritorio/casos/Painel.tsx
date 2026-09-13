"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CasoComDetalhes, Cliente, ResumoDoEscritorio, Situacao } from "@/lib/escritorio";
import { useAdvogado } from "../Advogado";
import { chamar } from "./api";
import { dataPorExtenso, descreverPrazo, formatarCnj, formatarData, formatarMomento, NOMES_DA_ORIGEM, NOMES_DA_SITUACAO, primeiroNome, saudacao, SITUACOES } from "./formatos";
import { NovoCaso } from "./NovoCaso";
import { NovaNomeacao } from "./NovaNomeacao";

type Props = { resumo: ResumoDoEscritorio; casos: CasoComDetalhes[]; clientes: Cliente[] };
type Painel = "nenhum" | "novo" | "nomeacao";
type Filtro = "todos" | Situacao;

// Estado do WhatsApp do escritório. A cor acompanha o texto, nunca o
// substitui: quem lê a tela entende a situação sem depender do tom.
const ESTADOS_DO_WHATSAPP: Record<string, { texto: string; tom: "ok" | "atencao" | "neutro" }> = {
  open: { texto: "Conectado", tom: "ok" },
  connecting: { texto: "Conectando", tom: "atencao" },
  close: { texto: "Desconectado", tom: "atencao" },
  sem_numero: { texto: "Sem número cadastrado", tom: "neutro" },
  sem_instancia: { texto: "Precisa reconectar", tom: "atencao" },
  nao_configurado: { texto: "Não configurado neste servidor", tom: "neutro" },
  indisponivel: { texto: "Indisponível agora", tom: "neutro" },
};

const CLASSES_DE_TOM: Record<"ok" | "atencao" | "neutro", string> = {
  ok: "pd-estado-ok",
  atencao: "pd-estado-atencao",
  neutro: "",
};

// Situação do caso. Verde é o que já terminou; âmbar é o que depende de
// alguém; em andamento fica no neutro, porque não é pendência nem conclusão.
const TOM_DA_SITUACAO: Record<Situacao, string> = {
  novo: "pd-estado-atencao",
  em_andamento: "",
  aguardando_cliente: "pd-estado-atencao",
  concluido: "pd-estado-ok",
};

function plural(quantidade: number, singular: string, pluralizado: string) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralizado}`;
}

function classeDoTom(tom: string | undefined) {
  if (tom === "vencido") return "pdl-prazo-risco";
  if (tom === "hoje" || tom === "urgente") return "pdl-prazo-atencao";
  return "";
}

function fraseDoDia(resumo: ResumoDoEscritorio) {
  if (resumo.casosAbertos === 0) return "Nenhum caso aberto ainda. Comece por um caso novo ou cole uma intimação de nomeação.";
  const partes = [plural(resumo.casosAbertos, "caso aberto", "casos abertos")];
  if (resumo.prazosProximos.length > 0) partes.push(plural(resumo.prazosProximos.length, "prazo nesta semana", "prazos nesta semana"));
  if (resumo.mensagensNovas > 0) partes.push(plural(resumo.mensagensNovas, "mensagem nova", "mensagens novas"));
  if (resumo.documentosPendentes > 0) partes.push(plural(resumo.documentosPendentes, "documento pendente", "documentos pendentes"));
  return `Você tem ${partes.length > 1 ? `${partes.slice(0, -1).join(", ")} e ${partes.at(-1)}` : partes[0]}.`;
}

export function Painel({ resumo, casos, clientes }: Props) {
  const advogado = useAdvogado();
  const [painel, setPainel] = useState<Painel>("nenhum");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const alternar = (qual: Painel) => setPainel((atual) => atual === qual ? "nenhum" : qual);
  const contagem = (situacao: Filtro) => situacao === "todos" ? casos.length : casos.filter((caso) => caso.situacao === situacao).length;
  const visiveis = filtro === "todos" ? casos : casos.filter((caso) => caso.situacao === filtro);
  const emAndamento = casos.filter((caso) => caso.situacao === "em_andamento").length;

  return <div className="pdl-mesa">
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">{dataPorExtenso()}</p>
        <h1>{saudacao()}, {primeiroNome(advogado.nome)}.</h1>
        <p className="pd-auxiliar">{fraseDoDia(resumo)}</p>
      </div>
      <div className="pd-pagina-acoes">
        <button type="button" className="pd-botao pd-botao-primario" onClick={() => alternar("novo")} aria-pressed={painel === "novo"}>Novo caso</button>
        <button type="button" className="pd-botao pd-botao-secundario" onClick={() => alternar("nomeacao")} aria-pressed={painel === "nomeacao"}>Nova nomeação</button>
      </div>
    </div>

    <dl className="pd-metricas pdl-metricas">
      <div className="pd-metrica">
        <dt>Casos abertos</dt>
        <dd>{resumo.casosAbertos}</dd>
        <small>{emAndamento === 0 ? "nenhum em andamento" : `${emAndamento} em andamento`}</small>
      </div>
      <div className="pd-metrica">
        <dt>Prazos em 7 dias</dt>
        <dd>{resumo.prazosProximos.length}</dd>
        <small>a conferir no processo oficial</small>
      </div>
      <div className={`pd-metrica${resumo.mensagensNovas > 0 ? " pdl-metrica-destaque" : ""}`}>
        <dt>Mensagens novas</dt>
        <dd>{resumo.mensagensNovas}</dd>
        <small><Link href="/escritorio/mensagens">ver as conversas no WhatsApp</Link></small>
      </div>
      <div className="pd-metrica">
        <dt>Documentos pendentes</dt>
        <dd>{resumo.documentosPendentes}</dd>
        <small>a pedir ou conferir nos casos</small>
      </div>
    </dl>

    {painel === "novo" && <NovoCaso clientes={clientes} aoFechar={() => setPainel("nenhum")} />}
    {painel === "nomeacao" && <NovaNomeacao aoFechar={() => setPainel("nenhum")} />}

    <div className="pdl-corpo">
      <section className="pd-cartao" aria-label="Seus casos">
        <div className="pd-cartao-cabeca">
          <div><p className="pd-eyebrow">Casos</p><h2>Seus casos</h2></div>
          <span className="pd-auxiliar">{plural(casos.length, "caso", "casos")}</span>
        </div>

        {casos.length === 0
          ? <div className="pdl-vazio">
            <div className="pd-vazio">
              <strong>Nenhum caso ainda.</strong>
              Abra o primeiro por um dos dois caminhos: <b>Novo caso</b>, para um atendimento que você já tem (plantão, particular ou uma nomeação que prefere digitar), ou <b>Nova nomeação</b>, para colar a intimação e deixar a IA montar a ficha.
            </div>
            <div className="pd-linha-campos">
              <button type="button" className="pd-botao pd-botao-primario" onClick={() => setPainel("novo")}>Novo caso</button>
              <button type="button" className="pd-botao pd-botao-secundario" onClick={() => setPainel("nomeacao")}>Nova nomeação</button>
            </div>
          </div>
          : <>
            <div className="pdl-cabeca-lista">
              <div className="pd-abas" role="tablist" id="pdl-filtro-situacao" aria-label="Filtrar por situação">
                {(["todos", ...SITUACOES] as Filtro[]).map((opcao) => <button
                  key={opcao}
                  type="button"
                  role="tab"
                  id={`pdl-aba-${opcao}`}
                  className="pd-aba"
                  aria-selected={filtro === opcao}
                  aria-controls="pdl-lista-casos"
                  onClick={() => setFiltro(opcao)}
                >
                  {opcao === "todos" ? "Todos" : NOMES_DA_SITUACAO[opcao]} <b>{contagem(opcao)}</b>
                </button>)}
              </div>
              <p className="pd-auxiliar pdl-nota-prazo">A data mostrada é a informada no caso. Confira sempre no processo oficial.</p>
            </div>
            <div role="tabpanel" id="pdl-lista-casos" aria-labelledby="pdl-filtro-situacao">
              {visiveis.length === 0
                ? <div className="pdl-vazio"><div className="pd-vazio">
                  <strong>Nenhum caso {filtro === "todos" ? "" : `em "${NOMES_DA_SITUACAO[filtro as Situacao].toLowerCase()}"`} por enquanto.</strong>
                  Troque o filtro acima para ver os outros casos, ou abra um caso novo.
                </div></div>
                : <ul className="pd-lista">{visiveis.map((caso) => <LinhaDoCaso key={caso.id} caso={caso} />)}</ul>}
            </div>
          </>}
      </section>

      <aside className="pdl-lateral">
        <section className="pd-cartao" aria-label="Prazos dos próximos 7 dias">
          <div className="pd-cartao-cabeca">
            <div><p className="pd-eyebrow">Próximos 7 dias</p><h2>Prazos</h2></div>
          </div>
          <div className="pd-cartao-corpo">
            {resumo.prazosProximos.length === 0
              ? <div className="pd-vazio">
                <strong>Nenhum prazo nesta semana.</strong>
                Os prazos dos casos e das tarefas aparecem aqui.
              </div>
              : <ul className="pdl-prazos">{resumo.prazosProximos.map((item) => {
                const prazo = descreverPrazo(item.prazo);
                return <li key={`${item.casoId}-${item.titulo}-${item.prazo}`}>
                  <Link href={`/escritorio/casos/${item.casoId}`}>{item.titulo}</Link>
                  <span className={`pdl-prazo ${classeDoTom(prazo?.tom)}`}>
                    <b>{formatarData(item.prazo)}</b>
                    <small>{prazo?.texto ? `${prazo.texto} · conferir no processo oficial` : "a conferir no processo oficial"}</small>
                  </span>
                </li>;
              })}</ul>}
          </div>
        </section>

        <section className="pd-cartao" aria-label="WhatsApp do escritório">
          <div className="pd-cartao-cabeca">
            <div><p className="pd-eyebrow">Atendimento</p><h2>WhatsApp do escritório</h2></div>
          </div>
          <div className="pd-cartao-corpo pdl-atendimento">
            <EstadoDoWhatsapp />
          </div>
        </section>

        <section className="pd-cartao" aria-label="Ações frequentes">
          <div className="pd-cartao-cabeca">
            <div><p className="pd-eyebrow">Atalhos</p><h2>Ações frequentes</h2></div>
          </div>
          <div className="pd-cartao-corpo pdl-atalhos">
            <button type="button" className="pdl-atalho" onClick={() => alternar("nomeacao")}>
              <strong>Nova nomeação</strong><small>Ler uma intimação</small>
            </button>
            <button type="button" className="pdl-atalho" onClick={() => alternar("novo")}>
              <strong>Novo caso</strong><small>Abrir pelo relato</small>
            </button>
            <Link href="/escritorio/mensagens" className="pdl-atalho">
              <strong>Mensagens</strong><small>Conversas dos casos</small>
            </Link>
            <Link href="/escritorio/processos" className="pdl-atalho">
              <strong>Processos</strong><small>Consultar andamento</small>
            </Link>
          </div>
        </section>
      </aside>
    </div>
  </div>;
}

function LinhaDoCaso({ caso }: { caso: CasoComDetalhes }) {
  const prazo = descreverPrazo(caso.prazo);
  const concluido = caso.situacao === "concluido";
  return <li className={`pd-linha pdl-caso${concluido ? " pdl-caso-concluido" : ""}`}>
    <Link href={`/escritorio/casos/${caso.id}`} className="pdl-caso-principal">
      <span className="pd-linha-titulo">{caso.titulo}</span>
      <span className="pd-linha-meta">
        {caso.cliente ? caso.cliente.nome : "Sem cliente cadastrado"}
        {" · "}{NOMES_DA_ORIGEM[caso.origem]}
        {caso.processo ? <>{" · "}<span className="pd-numero">{formatarCnj(caso.processo)}</span></> : null}
      </span>
    </Link>
    <span className={`pd-estado ${TOM_DA_SITUACAO[caso.situacao]}`.trim()}>{NOMES_DA_SITUACAO[caso.situacao]}</span>
    <span className={`pdl-prazo ${concluido ? "" : classeDoTom(prazo?.tom)}`}>
      {caso.prazo
        ? <><b>{formatarData(caso.prazo)}</b>{!concluido && prazo ? <small>{prazo.texto}</small> : null}</>
        : <em>sem prazo informado</em>}
    </span>
    <span className="pdl-ultimo">
      {caso.ultimoRegistro
        ? <>{caso.ultimoRegistro.texto}<small>{formatarMomento(caso.ultimoRegistro.quando, { comAno: false })}</small></>
        : <em>sem registro</em>}
    </span>
    <span className="pd-seta" aria-hidden="true">›</span>
  </li>;
}

// O estado do WhatsApp vem depois, pela API: a Evolution pode demorar e a
// mesa de trabalho não espera por ela.
function EstadoDoWhatsapp() {
  const [estado, setEstado] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    chamar<{ whatsapp: string }>("/api/escritorio/resumo")
      .then((dados) => { if (ativo) setEstado(dados.whatsapp); })
      .catch(() => { if (ativo) setEstado("indisponivel"); });
    return () => { ativo = false; };
  }, []);
  const descricao = estado ? ESTADOS_DO_WHATSAPP[estado] ?? { texto: estado, tom: "neutro" as const } : { texto: "Verificando…", tom: "neutro" as const };
  return <>
    <span className={`pd-estado ${CLASSES_DE_TOM[descricao.tom]}`.trim()}>{descricao.texto}</span>
    <p className="pd-auxiliar">As mensagens chegam aqui e nenhuma resposta sai sem o seu clique.</p>
    <Link href="/escritorio/whatsapp" className="pd-botao pd-botao-secundario">Abrir a conexão</Link>
  </>;
}
