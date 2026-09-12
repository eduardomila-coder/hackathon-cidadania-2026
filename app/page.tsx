"use client";

import { useState } from "react";
import Link from "next/link";
import type { Etapa, Resultado } from "@/lib/analise";
import { useDitado } from "@/lib/useDitado";
import { Versoes } from "./Versoes";

const ETAPAS: { chave: Etapa; titulo: string; texto: string }[] = [
  { chave: "extraindo", titulo: "Lendo o relato", texto: "Separando fatos, partes, pedido e provas." },
  { chave: "buscando", titulo: "Procurando na lei", texto: "Recuperando os trechos que se aplicam ao caso." },
  { chave: "analisando", titulo: "Montando a triagem", texto: "Requisitos, documentos e cabimento, com a fonte de cada ponto." },
  { chave: "verificando", titulo: "Conferindo cada afirmação", texto: "Segunda passada: o que não tem trecho que sustente é barrado." },
];

const PERGUNTAS: { pergunta: string; resposta: string }[] = [
  { pergunta: "A ferramenta dá parecer ou decide se aceito o caso?", resposta: "Não. Ela organiza o relato do cliente, mostra quais requisitos legais já estão comprovados e qual documento falta para cada um, sempre com o trecho da lei ao lado. Analisar, decidir e assinar continua sendo atividade privativa da advocacia: o dossiê é insumo, não conclusão." },
  { pergunta: "O que significa a força do caso?", resposta: "É a contagem dos requisitos legais que já estão comprovados por um documento ou fato que o cliente tem, sobre o total de requisitos que se aplicam. Não é probabilidade de ganhar: é o quanto do que a lei exige já está provado hoje. Cada requisito traz o id do trecho que o exige, para você conferir." },
  { pergunta: "O relato do meu cliente fica guardado?", resposta: "Não. O relato é usado para montar a triagem e não fica gravado. O que fica registrado é só medida: área do caso, quantos requisitos ficaram comprovados, custo e tempo daquela análise. Sem nome, sem relato e sem número de processo." },
  { pergunta: "Quanto custa cada triagem?", resposta: "Aparece no fim de cada dossiê, calculado com os tokens realmente usados nas chamadas ao modelo e o preço de tabela. Em \"Eficiência\" você vê o custo acumulado e pode anotar no que deu cada caso, para saber se a ferramenta está se pagando." },
];

export default function Home() {
  const [relato, setRelato] = useState("");
  const [andamento, setAndamento] = useState("");
  const [documento, setDocumento] = useState<File | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [caso, setCaso] = useState<{ id: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const ditado = useDitado((texto) => setRelato((anterior) => (anterior ? `${anterior} ${texto}` : texto)));

  async function enviar(complemento?: string) {
    setErro(null); setResultado(null); setCaso(null); setEtapa("extraindo");
    const textoBase = andamento.trim()
      ? `${relato}\n\nAndamento do processo em curso, informado pelo advogado:\n"""\n${andamento}\n"""`
      : relato;
    const texto = complemento?.trim() ? `${textoBase}\n\nInformações complementares respondidas depois da triagem:\n"""\n${complemento.trim()}\n"""` : textoBase;
    try {
      const corpo = new FormData();
      corpo.append("relato", texto);
      if (documento) corpo.append("documento", documento);
      const resposta = await fetch("/api/analisar", { method: "POST", body: corpo });
      if (!resposta.ok || !resposta.body) { setErro((await resposta.json()).erro ?? "Não consegui analisar agora."); return; }
      const leitor = resposta.body.getReader(); const decodificador = new TextDecoder(); let pendente = "";
      for (;;) {
        const { value, done } = await leitor.read(); if (done) break;
        pendente += decodificador.decode(value, { stream: true });
        const linhas = pendente.split("\n"); pendente = linhas.pop() ?? "";
        for (const linha of linhas) {
          if (!linha.trim()) continue;
          const mensagem = JSON.parse(linha) as { etapa?: Etapa; resultado?: Resultado; caso?: { id: string } | null; erro?: string };
          if (mensagem.etapa) setEtapa(mensagem.etapa);
          if (mensagem.resultado) setResultado(mensagem.resultado);
          if (mensagem.caso) setCaso(mensagem.caso);
          if (mensagem.erro) setErro(mensagem.erro);
        }
      }
    } catch { setErro("Perdi a conexão. Tente de novo."); }
    finally { setEtapa(null); }
  }

  const carregando = etapa !== null;
  return <main className="cf-publico">
    <Cabecalho />
    {carregando ? <AnaliseAndamento etapa={etapa} /> : resultado ? <Dossie resultado={resultado} caso={caso} aoContinuar={enviar} /> : <>
      <section className="cf-hero" id="inicio">
        <div className="cf-hero-conteudo">
          <p className="cf-sobrelinha">Habeas Titas</p>
          <h1>O caso triado<br />antes da consulta.</h1>
          <p className="cf-intro">Seu cliente conta o que aconteceu, por escrito ou falando. Você recebe o caso organizado: requisitos que já estão comprovados, documentos que faltam pedir e cada afirmação com o trecho da lei que a sustenta.</p>
          <label className="cf-relato"><span className="sr-only">Relato do cliente</span><textarea value={relato} onChange={(evento) => setRelato(evento.target.value)} maxLength={4000} placeholder="Cole ou dite o que o cliente contou" /><small>{relato.length}/4000</small></label>
          <details className="cf-opcional">
            <summary>O processo já está em andamento?</summary>
            <label><span className="sr-only">Andamento do processo</span><textarea value={andamento} onChange={(evento) => setAndamento(evento.target.value)} maxLength={4000} placeholder="Cole o andamento, a decisão ou o que já aconteceu no processo" /></label>
          </details>
          <label className="cf-documento"><span>Foto do documento <small>opcional, JPG, PNG ou WebP, até 5 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(evento) => setDocumento(evento.target.files?.[0] ?? null)} />{documento && <em>{documento.name} será lido só nesta triagem.</em>}</label>
          <div className="cf-acoes">
            <button type="button" className="cf-botao-escuro" onClick={() => enviar()} disabled={relato.trim().length < 10}>Triar o caso <span>→</span></button>
            {ditado.suportado && <button type="button" className="cf-botao-texto" onClick={ditado.gravando ? ditado.parar : ditado.iniciar} aria-pressed={ditado.gravando}>{ditado.gravando ? "Parar de ditar" : "Ditar o relato"}</button>}
            <small>Sem cadastro · O relato não fica gravado</small>
          </div>
        </div>
        <aside className="cf-hero-lateral"><span>Quem atende<br />o Juizado<br />atende sozinho</span><div className="cf-arquitetura"><i aria-hidden="true" /><img src="/arquitetura-cidadania.png" alt="Arquitetura modernista em concreto" /></div><p>Mais tempo<br />no caso</p></aside>
      </section>
      {erro && <p role="alert" className="cf-erro">{erro}</p>}
      <section className="cf-passos" id="como-funciona"><Passo numero="1" titulo="Receba">Manda o link para o cliente ou cola o relato você mesmo, em texto ou por voz.</Passo><Passo numero="2" titulo="Confira">Requisitos comprovados, documentos que faltam e o trecho da lei de cada ponto.</Passo><Passo numero="3" titulo="Assuma">Decide com o caso já organizado, e anota depois no que deu para medir a ferramenta.</Passo></section>
      <section className="cf-conteudo" id="sobre"><p className="cf-sobrelinha">Para quem atende no Juizado</p><h2>A triagem que hoje você faz de graça.</h2><p>72% da advocacia brasileira atua sozinha, sem secretaria e sem sistema. Antes de fechar contrato, é o próprio advogado que ouve o cliente, separa documento por documento e decide se o caso vale. O Cidadania Fácil faz essa primeira volta e devolve o caso organizado, com fonte em cada afirmação.</p></section>
      <section className="cf-duvidas" id="perguntas"><p className="cf-sobrelinha">Antes de usar</p><h2>Perguntas frequentes</h2>{PERGUNTAS.map(({ pergunta, resposta }) => <details key={pergunta}><summary>{pergunta}<span>⌄</span></summary><p>{resposta}</p></details>)}</section>
      <section className="cf-contato" id="contato"><div><p className="cf-sobrelinha">Contato</p><h2>Fale com a gente.</h2><p>Estamos à disposição para esclarecer dúvidas e ouvir sugestões durante o Hackathon da Cidadania.</p></div><div className="cf-cartao"><h3>Habeas Titas · OAB/PR</h3><p><strong>Atendimento no Hackathon da Cidadania</strong><br />OAB/PR, Curitiba/PR</p><p><strong>Horário</strong><br />Durante o período do evento.</p></div></section>
      <Versoes />
    </>}
    <Rodape />
  </main>;
}

function Cabecalho() { return <header className="cf-cabecalho"><Link href="/" className="cf-marca">Cidadania Fácil <small>Habeas Titas · OAB/PR</small></Link><nav aria-label="Navegação principal"><a href="#inicio">Início</a><a href="#sobre">Sobre</a><a href="#como-funciona">Como funciona</a><a href="#perguntas">Perguntas</a><a href="#contato">Contato</a></nav><Link href="/painel" className="cf-equipe">Área da equipe →</Link></header>; }
function Rodape() { return <footer className="cf-rodape"><strong>Cidadania Fácil</strong><span>Habeas Titas · OAB/PR</span><small>Triagem com fonte. Decisão do advogado.</small></footer>; }
function Passo({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) { return <article><span>{numero}</span><div><h3>{titulo}</h3><p>{children}</p></div></article>; }

function AnaliseAndamento({ etapa }: { etapa: Etapa | null }) {
  const atual = ETAPAS.findIndex((item) => item.chave === etapa);
  return <section className="cf-carregando" aria-live="polite"><div className="cf-caixa-carregando"><h1>Triando o caso.</h1><p>A cadeia está lendo o relato, recuperando os trechos da lei e conferindo cada afirmação contra a fonte.</p><ol>{ETAPAS.map((item, indice) => <li key={item.chave} className={indice <= atual ? "feito" : ""}><i>{indice < atual ? "✓" : ""}</i><div><strong>{item.titulo}</strong><small>{item.texto}</small>{indice === atual && <b />}</div></li>)}</ol><footer>◷ &nbsp; Isso pode levar alguns instantes.</footer></div></section>;
}

const SITUACAO: Record<string, string> = { comprovado: "comprovado", falta_documento: "falta documento", nao_se_aplica: "não se aplica" };

function Dossie({ resultado, caso, aoContinuar }: { resultado: Resultado; caso: { id: string } | null; aoContinuar: (complemento: string) => void }) {
  const { analise, forca, custo, extracao } = resultado;
  const naoConfirmadas = resultado.verificacao.itens.filter((item) => item.situacao !== "confirmada");
  const faltando = analise.requisitos.filter((r) => r.situacao === "falta_documento");
  return <section className="cf-resultado">
    <div className="cf-resultado-principal">
      <p className="cf-status">✓ &nbsp; Triagem concluída</p>
      <p className="cf-intro-menor">{extracao.tipo_caso === "em_andamento" ? "Processo já em andamento." : extracao.tipo_caso === "novo" ? "Caso novo, ainda sem processo." : "Não deu para saber se já existe processo."}</p>
      <h1>O caso, organizado.</h1>

      <ForcaDoCaso forca={forca} />

      <article className="cf-resumo">
        <div className="cf-item"><b>▤</b><div><h2>Resumo</h2><p>{analise.resumo}</p></div></div>
        <Linha titulo="Cabe no Juizado Especial?" texto={(analise.cabe_juizado_especial ? "Sim. " : "Não. ") + analise.motivo_juizado} />
        {analise.encaminhamento && <Linha titulo="Via adequada" texto={analise.encaminhamento} />}
        <Linha titulo="Próximo passo" texto={analise.orientacao} />
        <div className="cf-aviso">☼ <span><strong>A decisão é sua</strong><br />Esta triagem organiza o relato e cita a fonte de cada ponto. Ela não é parecer e não diz se o caso deve ser aceito.</span></div>
      </article>

      {analise.requisitos.length > 0 && <article className="cf-resumo">
        <div className="cf-item"><b>⚖</b><div><h2>Requisitos, um a um</h2><p>Cada requisito traz o id do trecho que o exige e o que o comprova hoje.</p></div></div>
        <ul className="cf-requisitos">{analise.requisitos.map((r) => <li key={r.requisito} className={`cf-req-${r.situacao}`}>
          <strong>{r.requisito}</strong>
          <span className="cf-req-tag">{SITUACAO[r.situacao] ?? r.situacao}</span>
          <p>{r.o_que_comprova} <code>[{r.fonte}]</code></p>
        </li>)}</ul>
      </article>}
    </div>

    <aside className="cf-coluna-resultados">
      {faltando.length > 0 && <article className="cf-cartao"><h2>Pedir ao cliente</h2><p>Documentos que fecham os requisitos ainda em aberto.</p><ul>{[...new Set([...faltando.map((r) => r.o_que_comprova), ...analise.documentos_necessarios])].map((item) => <li key={item}>▤ {item}</li>)}</ul></article>}
      {faltando.length === 0 && analise.documentos_necessarios.length > 0 && <article className="cf-cartao"><h2>Pedir ao cliente</h2><ul>{analise.documentos_necessarios.map((item) => <li key={item}>▤ {item}</li>)}</ul></article>}
      {analise.perguntas_pendentes.length > 0 && <Conversa perguntas={analise.perguntas_pendentes} aoEnviar={aoContinuar} />}
      {analise.custos_do_processo.length > 0 && <article className="cf-cartao"><h2>Custas nesta via</h2><p>Só o que os trechos recuperados dizem.</p><ul>{analise.custos_do_processo.map((item) => <li key={item}>◷ {item}</li>)}</ul></article>}
      {analise.caminhos_extrajudiciais.length > 0 && <article className="cf-cartao"><h2>Antes de processar</h2><ul>{analise.caminhos_extrajudiciais.map((item) => <li key={item}>→ {item}</li>)}</ul></article>}
      <details className="cf-link-legal"><summary>⚖ Fundamentos citados <span>›</span></summary><ul>{analise.fundamentos.map((f) => <li key={f.afirmacao}>{f.afirmacao} <code>[{f.fonte}]</code></li>)}</ul></details>
      {(naoConfirmadas.length > 0 || analise.sem_base.length > 0 || resultado.verificacao.alertas.length > 0) && <details className="cf-link-legal cf-alerta"><summary>⌁ Barrado na verificação <span>›</span></summary><ul>{[...analise.sem_base, ...resultado.verificacao.alertas].map((item) => <li key={item}>{item}</li>)}</ul></details>}
      <Medidor custo={custo} tempos={resultado.tempos_ms} caso={caso} />
    </aside>
  </section>;
}

function Conversa({ perguntas, aoEnviar }: { perguntas: string[]; aoEnviar: (texto: string) => void }) {
  const [respostas, setRespostas] = useState("");
  return <article className="cf-cartao cf-conversa"><h2>Completar a conversa</h2><p>Leve estas perguntas para o cliente e cole as respostas. A próxima triagem considera o relato anterior e estas informações.</p><ul>{perguntas.map((item) => <li key={item}>? {item}</li>)}</ul><label><span className="sr-only">Respostas do cliente</span><textarea value={respostas} onChange={(evento) => setRespostas(evento.target.value)} placeholder="Cole aqui as respostas do cliente" /></label><button type="button" onClick={() => aoEnviar(respostas)} disabled={respostas.trim().length < 3}>Atualizar dossiê</button></article>;
}

function ForcaDoCaso({ forca }: { forca: Resultado["forca"] }) {
  if (forca.aplicaveis === 0) return null;
  const parte = forca.comprovados / forca.aplicaveis;
  return <div className="cf-forca">
    <div>
      <p className="cf-sobrelinha">Força do caso</p>
      <strong>{forca.comprovados} de {forca.aplicaveis} requisitos comprovados</strong>
      <small>Contagem do que já está provado por documento ou fato do relato. Não é probabilidade de êxito.</small>
    </div>
    <div className="cf-forca-barra" role="img" aria-label={`${forca.comprovados} de ${forca.aplicaveis} requisitos comprovados`}>
      <i style={{ width: `${Math.round(parte * 100)}%` }} />
    </div>
  </div>;
}

function Medidor({ custo, tempos, caso }: { custo: Resultado["custo"]; tempos: Resultado["tempos_ms"]; caso: { id: string } | null }) {
  const [anotado, setAnotado] = useState<string | null>(null);
  const segundos = (Object.values(tempos).reduce((t, ms) => t + ms, 0) / 1000).toFixed(1);
  const valor = custo.reais !== null ? `R$ ${custo.reais.toFixed(2).replace(".", ",")}`
    : custo.dolares !== null ? `US$ ${custo.dolares.toFixed(3)}`
    : `sem preço de tabela para ${custo.modelo}`;

  async function anotar(desfecho: string) {
    if (!caso) return;
    await fetch("/api/casos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: caso.id, desfecho }) });
    setAnotado(desfecho);
  }

  return <article className="cf-cartao cf-medidor">
    <h2>Esta triagem</h2>
    <ul>
      <li>Custo <strong>{valor}</strong></li>
      <li>Tempo <strong>{segundos}s</strong></li>
      <li>Modelo <strong>{custo.modelo}</strong></li>
      <li>{custo.chamadas} chamadas · {custo.tokens_entrada.toLocaleString("pt-BR")} tokens de entrada, {custo.tokens_saida.toLocaleString("pt-BR")} de saída</li>
    </ul>
    {caso && <div className="cf-desfecho">
      {anotado ? <p>Desfecho anotado: <strong>{anotado}</strong>.</p> : <>
        <p>Quando o caso terminar, volte e anote no que deu. É assim que medimos se a ferramenta acerta.</p>
        <div>{["ganho", "acordo", "perdido", "desistiu"].map((d) => <button key={d} type="button" onClick={() => anotar(d)}>{d}</button>)}</div>
      </>}
    </div>}
  </article>;
}

function Linha({ titulo, texto }: { titulo: string; texto: string }) { return <div className="cf-linha"><b>→</b><div><h3>{titulo}</h3><p>{texto}</p></div></div>; }
