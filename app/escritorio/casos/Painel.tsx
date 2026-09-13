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

const ESTADOS_DO_WHATSAPP: Record<string, { texto: string; tom: "ok" | "atencao" | "neutro" }> = {
  open: { texto: "Conectado", tom: "ok" },
  connecting: { texto: "Conectando", tom: "atencao" },
  close: { texto: "Desconectado", tom: "atencao" },
  sem_numero: { texto: "Sem número cadastrado", tom: "neutro" },
  sem_instancia: { texto: "Precisa reconectar", tom: "atencao" },
  nao_configurado: { texto: "Não configurado neste servidor", tom: "neutro" },
  indisponivel: { texto: "Indisponível agora", tom: "neutro" },
};

function plural(quantidade: number, singular: string, pluralizado: string) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralizado}`;
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

  return <div className="pdc-painel">
    <header className="pdc-topo">
      <div>
        <p className="md-eyebrow">{dataPorExtenso()}</p>
        <h1>{saudacao()}, {primeiroNome(advogado.nome)}.</h1>
        <p className="pdc-topo-texto">{fraseDoDia(resumo)}</p>
      </div>
      <div className="pdc-topo-acoes">
        <button type="button" className="md-botao-primario" onClick={() => alternar("novo")} aria-pressed={painel === "novo"}>Novo caso <span>+</span></button>
        <button type="button" className="md-botao-secundario" onClick={() => alternar("nomeacao")} aria-pressed={painel === "nomeacao"}>Nova nomeação</button>
      </div>
    </header>

    <section className="md-resumo pdc-resumo" aria-label="Resumo do escritório">
      <article><strong>{resumo.casosAbertos}</strong><span>{resumo.casosAbertos === 1 ? "caso aberto" : "casos abertos"}</span></article>
      <article className={resumo.prazosProximos.length > 0 ? "pdc-resumo-alerta" : ""}><strong>{resumo.prazosProximos.length}</strong><span>{resumo.prazosProximos.length === 1 ? "prazo" : "prazos"} nos próximos 7 dias</span></article>
      <Link href="/escritorio/mensagens" className={`pdc-resumo-link${resumo.mensagensNovas > 0 ? " pdc-resumo-destaque" : ""}`}><strong>{resumo.mensagensNovas}</strong><span>{resumo.mensagensNovas === 1 ? "mensagem nova" : "mensagens novas"} no WhatsApp</span></Link>
      <article><strong>{resumo.documentosPendentes}</strong><span>{resumo.documentosPendentes === 1 ? "documento pendente" : "documentos pendentes"}</span></article>
      <EstadoDoWhatsapp />
    </section>

    {painel === "novo" && <NovoCaso clientes={clientes} aoFechar={() => setPainel("nenhum")} />}
    {painel === "nomeacao" && <NovaNomeacao aoFechar={() => setPainel("nenhum")} />}

    <div className="pdc-corpo">
      <section className="pd-cartao pdc-lista" aria-label="Seus casos">
        <div className="md-titulo-linha">
          <div><p className="md-eyebrow">Casos</p><h2>Seus casos</h2></div>
          <span className="md-contador">{plural(casos.length, "caso", "casos")}</span>
        </div>

        {casos.length === 0 ? <div className="pdc-vazio-grande">
          <strong>Nenhum caso ainda.</strong>
          <p>Abra o primeiro por um dos dois caminhos: <b>Novo caso</b> para um atendimento que você já tem (plantão, particular ou nomeação que você prefere digitar), ou <b>Nova nomeação</b> para colar a intimação e deixar a IA montar a ficha.</p>
          <div className="md-acoes">
            <button type="button" className="md-botao-primario" onClick={() => setPainel("novo")}>Novo caso <span>+</span></button>
            <button type="button" className="md-botao-secundario" onClick={() => setPainel("nomeacao")}>Nova nomeação</button>
          </div>
        </div> : <>
          <div className="pdc-filtros" role="group" aria-label="Filtrar por situação">
            {(["todos", ...SITUACOES] as Filtro[]).map((opcao) => <button key={opcao} type="button" aria-pressed={filtro === opcao} onClick={() => setFiltro(opcao)}>
              {opcao === "todos" ? "Todos" : NOMES_DA_SITUACAO[opcao]} <b>{contagem(opcao)}</b>
            </button>)}
          </div>
          {visiveis.length === 0
            ? <p className="pdc-vazio">Nenhum caso {filtro === "todos" ? "" : `em "${NOMES_DA_SITUACAO[filtro as Situacao].toLowerCase()}"`} por enquanto.</p>
            : <ul className="pdc-casos">{visiveis.map((caso) => <LinhaDoCaso key={caso.id} caso={caso} />)}</ul>}
        </>}
      </section>

      <aside className="pdc-lateral">
        <section className="pd-cartao pdc-prazos" aria-label="Prazos da semana">
          <p className="md-eyebrow">Próximos 7 dias</p>
          <h2>Prazos</h2>
          {resumo.prazosProximos.length === 0
            ? <p className="pdc-vazio">Nenhum prazo nesta semana. Os prazos dos casos e das tarefas aparecem aqui.</p>
            : <ul className="pdc-lista-prazos">{resumo.prazosProximos.map((item) => {
              const prazo = descreverPrazo(item.prazo);
              return <li key={`${item.casoId}-${item.titulo}-${item.prazo}`}>
                <Link href={`/escritorio/casos/${item.casoId}`}>{item.titulo}</Link>
                <span className={`pdc-prazo tom-${prazo?.tom ?? "normal"}`}>{formatarData(item.prazo)} · {prazo?.texto}</span>
              </li>;
            })}</ul>}
        </section>

        <section className="pd-cartao pdc-guia" aria-label="Como o escritório funciona">
          <p className="md-eyebrow">Como funciona</p>
          <ol>
            <li><b>1</b><span><strong>Abra o caso</strong> pelo relato do cliente ou colando a intimação de nomeação.</span></li>
            <li><b>2</b><span><strong>Triagem com fontes</strong>: a IA organiza requisitos e documentos citando o trecho da lei. Você confere.</span></li>
            <li><b>3</b><span><strong>Fale com o cliente</strong> pelo WhatsApp do escritório. A IA sugere, só você envia.</span></li>
          </ol>
        </section>
      </aside>
    </div>
  </div>;
}

function LinhaDoCaso({ caso }: { caso: CasoComDetalhes }) {
  const prazo = descreverPrazo(caso.prazo);
  const concluido = caso.situacao === "concluido";
  return <li className={`pdc-caso${concluido ? " pdc-caso-concluido" : ""}`}>
    <Link href={`/escritorio/casos/${caso.id}`} className="pdc-caso-principal">
      <strong>{caso.titulo}</strong>
      <small>{caso.cliente ? caso.cliente.nome : "Sem cliente cadastrado"}{caso.processo ? ` · ${formatarCnj(caso.processo)}` : ""}</small>
    </Link>
    <div className="pdc-caso-selos">
      <span className={`pdc-selo pdc-origem-${caso.origem}`}>{NOMES_DA_ORIGEM[caso.origem]}</span>
      <span className={`pdc-selo pdc-situacao-${caso.situacao}`}>{NOMES_DA_SITUACAO[caso.situacao]}</span>
    </div>
    <span className={`pdc-prazo tom-${concluido || !prazo ? "normal" : prazo.tom}`}>
      {caso.prazo ? <><b>{formatarData(caso.prazo)}</b>{!concluido && prazo ? ` · ${prazo.texto}` : ""}</> : <em>sem prazo</em>}
    </span>
    <span className="pdc-caso-ultimo">
      {caso.ultimoRegistro ? <>{caso.ultimoRegistro.texto}<small>{formatarMomento(caso.ultimoRegistro.quando, { comAno: false })}</small></> : <em>sem registro</em>}
    </span>
  </li>;
}

// O estado do WhatsApp vem depois, pela API: a Evolution pode demorar e o
// painel não espera por ela.
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
  return <Link href="/escritorio/whatsapp" className={`pdc-resumo-link pdc-whatsapp tom-${descricao.tom}`}>
    <strong><i aria-hidden="true" />{descricao.texto}</strong>
    <span>WhatsApp do escritório · abrir</span>
  </Link>;
}
