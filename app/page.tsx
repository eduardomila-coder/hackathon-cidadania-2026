"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Etapa, Resultado } from "@/lib/analise";
import { useDitado } from "@/lib/useDitado";
import { Versoes } from "./Versoes";
import estilos from "./landing.module.css";

const ETAPAS: { chave: Etapa; titulo: string; texto: string }[] = [
  { chave: "extraindo", titulo: "Lendo o relato", texto: "Separando fatos, partes, pedido e provas." },
  { chave: "buscando", titulo: "Procurando na lei", texto: "Recuperando os trechos que se aplicam ao caso." },
  { chave: "analisando", titulo: "Montando a triagem", texto: "Requisitos, documentos e cabimento, com a fonte de cada ponto." },
  { chave: "verificando", titulo: "Conferindo cada afirmação", texto: "Segunda passada: o que não tem trecho que sustente é barrado." },
];

const PERGUNTAS: { pergunta: string; resposta: string }[] = [
  { pergunta: "O assistente substitui o advogado dativo?", resposta: "Não. Ele organiza o relato, mostra requisitos e documentos com o trecho da lei ao lado. Analisar, decidir, orientar o cliente e assinar continua sendo atividade privativa da advocacia: o dossiê é insumo, não conclusão." },
  { pergunta: "O que significa a força do caso?", resposta: "É a contagem dos requisitos legais que já estão comprovados por um documento ou fato que o cliente tem, sobre o total de requisitos que se aplicam. Não é probabilidade de ganhar: é o quanto do que a lei exige já está provado hoje. Cada requisito traz o id do trecho que o exige, para você conferir." },
  { pergunta: "O relato do cliente fica guardado?", resposta: "O aplicativo não grava relato, nome ou número de processo no seu próprio registro. Nesta demonstração, use apenas casos fictícios: uma operação com clientes reais precisa de aviso de privacidade, controle de acesso, definição de retenção e governança do fornecedor de IA." },
  { pergunta: "Quanto custa cada triagem?", resposta: "Aparece no fim de cada dossiê, calculado com os tokens realmente usados nas chamadas ao modelo e o preço de tabela. Em \"Eficiência\" você vê o custo acumulado e pode anotar no que deu cada caso, para saber se a ferramenta está se pagando." },
];

export default function Home() {
  return <Suspense fallback={<Landing />}><PaginaSelecionada /></Suspense>;
}

function PaginaSelecionada() {
  const parametros = useSearchParams();
  return parametros.get("triagem") === "1" ? <TriagemPublica /> : <Landing />;
}

function TriagemPublica() {
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
          <p className="cf-sobrelinha">Escritório Dativo · Habeas Titas</p>
          <h1>Atendimento melhor.<br />Caso sob controle.</h1>
          <p className="cf-intro">A triagem é um módulo do escritório de apoio para a advocacia dativa. Organize o relato, os documentos e os próximos passos antes da conversa com o cliente, com fonte em cada afirmação jurídica.</p>
          <label className="cf-relato"><span className="sr-only">Relato do cliente</span><textarea value={relato} onChange={(evento) => setRelato(evento.target.value)} maxLength={4000} placeholder="Cole ou dite o que o cliente contou" /><small>{relato.length}/4000</small></label>
          <details className="cf-opcional">
            <summary>O processo já está em andamento?</summary>
            <label><span className="sr-only">Andamento do processo</span><textarea value={andamento} onChange={(evento) => setAndamento(evento.target.value)} maxLength={4000} placeholder="Cole o andamento, a decisão ou o que já aconteceu no processo" /></label>
          </details>
          <label className="cf-documento"><span>Foto do documento <small>opcional, JPG, PNG ou WebP, até 5 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(evento) => setDocumento(evento.target.files?.[0] ?? null)} />{documento && <em>{documento.name} será lido só nesta triagem.</em>}</label>
          <div className="cf-acoes">
            <button type="button" className="cf-botao-escuro" onClick={() => enviar()} disabled={relato.trim().length < 10}>Organizar relato <span>→</span></button>
            {ditado.suportado && <button type="button" className="cf-botao-texto" onClick={ditado.gravando ? ditado.parar : ditado.iniciar} aria-pressed={ditado.gravando}>{ditado.gravando ? "Parar de ditar" : "Ditar o relato"}</button>}
            <Link href="/escritorio" className="cf-botao-texto">Abrir escritório de apoio</Link>
          </div>
        </div>
        <aside className="cf-hero-lateral"><span>Quem atende<br />o Juizado<br />atende sozinho</span><div className="cf-arquitetura"><i aria-hidden="true" /><img src="/arquitetura-cidadania.png" alt="Arquitetura modernista em concreto" /></div><p>Mais tempo<br />no caso</p></aside>
      </section>
      {erro && <p role="alert" className="cf-erro">{erro}</p>}
      <section className="cf-passos" id="como-funciona"><Passo numero="1" titulo="Acolha">Registre o essencial do atendimento e o próximo compromisso no escritório de apoio.</Passo><Passo numero="2" titulo="Organize">Estruture relato, requisitos e documentos com apoio do assistente, sempre com fonte legal.</Passo><Passo numero="3" titulo="Decida">O advogado dativo confere, orienta e assume o próximo ato. A ferramenta não toma a decisão.</Passo></section>
      <section className="cf-conteudo" id="sobre"><p className="cf-sobrelinha">Para a advocacia dativa</p><h2>Um escritório de apoio para quem atende com poucos recursos e muita responsabilidade.</h2><p>Escritório Dativo reúne atendimento, checklist de documentos, agenda, WhatsApp profissional e triagem com fonte jurídica. É um ambiente demonstrativo, sem vínculo institucional e sem integração a sistemas externos.</p></section>
      <section className="cf-duvidas" id="perguntas"><p className="cf-sobrelinha">Antes de usar</p><h2>Perguntas frequentes</h2>{PERGUNTAS.map(({ pergunta, resposta }) => <details key={pergunta}><summary>{pergunta}<span>⌄</span></summary><p>{resposta}</p></details>)}</section>
      <section className="cf-contato" id="contato"><div><p className="cf-sobrelinha">Escritório Dativo</p><h2>Da primeira conversa ao próximo ato.</h2><p>O protótipo apoia o atendimento dativo sem confundir organização de informações com a atuação profissional do advogado.</p></div><div className="cf-cartao"><h3>Habeas Titas</h3><p><strong>Protótipo para advocacia dativa</strong><br />Demonstração durante o Hackathon da Cidadania.</p><p><strong>Limite do ambiente</strong><br />Sem vínculo institucional e sem integração a sistemas externos.</p></div></section>
      <Versoes />
    </>}
    <Rodape />
  </main>;
}

function Cabecalho() { return <header className="cf-cabecalho"><Link href="/" className="cf-marca">Escritório Dativo <small>Habeas Titas · protótipo dativo</small></Link><nav aria-label="Navegação principal"><a href="#inicio">Início</a><a href="#sobre">Sobre</a><a href="#como-funciona">Como funciona</a><a href="#perguntas">Perguntas</a><a href="#contato">Contato</a></nav><Link href="/escritorio" className="cf-equipe">Escritório de apoio →</Link></header>; }
function Rodape() { return <footer className="cf-rodape"><strong>Escritório Dativo</strong><span>Habeas Titas · protótipo para advocacia dativa</span><small>Triagem com fonte. Decisão humana.</small></footer>; }
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

function Landing() {
  return <main className={estilos.pagina}>
    <header className={estilos.cabecalho}>
      <Link href="/" className={estilos.marca}>
        Escritório Dativo
        <span>OAB Paraná · Advocacia Dativa</span>
      </Link>
      <nav className={estilos.navegacao} aria-label="Navegação principal">
        <a href="#o-que-e">O que é</a>
        <a href="#responsabilidades">Responsabilidades</a>
        <a href="#o-caso">O caso</a>
        <a href="#duvidas">Dúvidas</a>
      </nav>
      <Link href="/entrar" className={estilos.entrar}>Entrar</Link>
    </header>

    <section className={estilos.abertura} id="o-que-e">
      <div className={estilos.aberturaTexto}>
        <p className={estilos.sobrelinha}>Ambiente profissional</p>
        <h1>Escritório<br />Dativo</h1>
        <p className={estilos.chamada}>O ambiente de trabalho da advocacia dativa no Paraná.</p>
        <p className={estilos.introducao}>Nomeações, atendimento, processo, documentos, pesquisa, formação e honorários convivem no mesmo ambiente. O sistema organiza o trabalho; o advogado continua responsável por cada ato.</p>
        <div className={estilos.acoesAbertura}>
          <Link href="/entrar" className={estilos.entrarPrincipal}>Entrar no Escritório Dativo <span aria-hidden="true">→</span></Link>
          <Link href="/?triagem=1" className={estilos.linkSecundario}>Acessar triagem pública demonstrativa</Link>
        </div>
        <p className={estilos.avisoDemo}>Ambiente de demonstração. Todos os dados desta página são fictícios.</p>
      </div>
      <aside className={estilos.hoje} aria-labelledby="hoje-titulo">
        <div className={estilos.hojeCabecalho}>
          <div><p>Quarta-feira, 16 de setembro</p><h2 id="hoje-titulo">Hoje no escritório</h2></div>
          <span>DEMO</span>
        </div>
        <ol className={estilos.filaHoje}>
          <li><span className={estilos.marcadorAtencao} /><div><strong>Prazo informado</strong><p>Manifestação em contestação</p></div><small>A conferir no processo oficial</small></li>
          <li><span className={estilos.marcadorAzul} /><div><strong>Audiência</strong><p>Conciliação · 14h30</p></div><small>2º JEC de Curitiba</small></li>
          <li><span className={estilos.marcadorOk} /><div><strong>Documentos recebidos</strong><p>Comprovantes enviados pela assistida</p></div><small>Revisar 3 arquivos</small></li>
          <li><span className={estilos.marcadorNeutro} /><div><strong>Honorários dativos</strong><p>Certidão em acompanhamento</p></div><small>Checklist documental</small></li>
        </ol>
      </aside>
    </section>

    <section className={estilos.fluxo} aria-labelledby="fluxo-titulo">
      <div className={estilos.tituloSecao}><p className={estilos.sobrelinha}>Do recebimento ao pós-atuação</p><h2 id="fluxo-titulo">O caso permanece inteiro.</h2></div>
      <div className={estilos.linhasFluxo}>
        <article><span>01</span><h3>Nomeação</h3><p>O registro abre o caso com processo, órgão, pessoa assistida e pontos que exigem conferência.</p></article>
        <article><span>02</span><h3>Atendimento</h3><p>Comunicação e documentos chegam vinculados ao contexto em que serão usados.</p></article>
        <article><span>03</span><h3>Atuação</h3><p>Tarefas, pesquisa e peças deixam um histórico de trabalho rastreável.</p></article>
        <article><span>04</span><h3>Encerramento</h3><p>Certidões, checklist e acompanhamento de honorários preservam o pós-atuação.</p></article>
      </div>
    </section>

    <section className={estilos.responsabilidades} id="responsabilidades" aria-labelledby="responsabilidades-titulo">
      <div className={estilos.tituloSecao}><p className={estilos.sobrelinha}>Tecnologia com limite claro</p><h2 id="responsabilidades-titulo">O sistema apoia. A responsabilidade permanece profissional.</h2></div>
      <div className={estilos.tabelaResponsabilidades} role="table" aria-label="Responsabilidades do sistema e do advogado">
        <div role="row" className={estilos.cabecaTabela}><span role="columnheader">Atividade</span><span role="columnheader">O sistema pode fazer</span><span role="columnheader">O advogado deve fazer</span></div>
        <div role="row"><strong role="rowheader">Nomeação</strong><span role="cell">Estruturar dados e destacar campos incompletos.</span><span role="cell">Conferir processo oficial, parte, ato e eventual impedimento.</span></div>
        <div role="row"><strong role="rowheader">Prazo</strong><span role="cell">Registrar data identificada como informação a conferir.</span><span role="cell">Validar prazo fatal no processo oficial e definir a providência.</span></div>
        <div role="row"><strong role="rowheader">Pesquisa</strong><span role="cell">Recuperar fontes e organizar notas vinculadas ao caso.</span><span role="cell">Escolher tese, estratégia e fundamento aplicável.</span></div>
        <div role="row"><strong role="rowheader">Comunicação</strong><span role="cell">Preparar um rascunho e manter o histórico da conversa.</span><span role="cell">Revisar e enviar a mensagem por ação expressa.</span></div>
      </div>
      <p className={estilos.notaResponsabilidades}>A plataforma não substitui Projudi, PJe ou qualquer sistema judicial oficial. Também não protocola, envia mensagens ou toma decisões de forma autônoma.</p>
    </section>

    <section className={estilos.caso} id="o-caso" aria-labelledby="caso-titulo">
      <div className={estilos.casoIntroducao}><p className={estilos.sobrelinha}>Uma prévia de caso</p><h2 id="caso-titulo">Contexto suficiente para a próxima providência.</h2><p>Informações processuais, contato, documentos e pesquisa permanecem ligados ao mesmo caso, sem transformar o escritório em uma sequência de telas sem contexto.</p><Link href="/entrar" className={estilos.linkCaso}>Entrar para acessar o escritório <span aria-hidden="true">→</span></Link></div>
      <div className={estilos.previaCaso} aria-label="Prévia fictícia de um caso no Escritório Dativo">
        <div className={estilos.previaTopo}><div><p>CASO · DADOS FICTÍCIOS</p><h3>Marina A. · Responsabilidade civil</h3><span>0001234-56.2026.8.16.0001 · 2º Juizado Especial Cível de Curitiba</span></div><b>A conferir</b></div>
        <div className={estilos.abasCaso}><span className={estilos.abaAtiva}>Visão geral</span><span>Tarefas</span><span>Processo</span><span>Assistida</span><span>Documentos</span><span>Honorários</span></div>
        <div className={estilos.corpoCaso}>
          <div className={estilos.providencia}><p>Próxima providência</p><h4>Conferir intimação e prazo no processo oficial</h4><span>Data identificada: 18 set. 2026 · não confirmada</span></div>
          <div className={estilos.tarefasCaso}><p>Tarefas</p><ul><li><span />Solicitar comprovante de residência <small>Hoje</small></li><li><span />Revisar documentos recebidos <small>16 set.</small></li><li><span />Preparar resposta à contestação <small>A confirmar</small></li></ul></div>
          <div className={estilos.resumoCaso}><p>Resumo técnico</p><span>Documentos iniciais recebidos. Consulta processual registrada em 15 set. Pesquisa jurídica deve manter as fontes visíveis para revisão profissional.</span></div>
          <div className={estilos.colunaCaso}><p>Assistida</p><strong>Marina A.</strong><span>Contato iniciado pelo advogado</span><hr /><p>Documentos</p><strong>3 recebidos · 1 pendente</strong><span>Origem e vínculo preservados</span></div>
        </div>
      </div>
    </section>

    <section className={estilos.duvidas} id="duvidas" aria-labelledby="duvidas-titulo">
      <div className={estilos.tituloSecao}><p className={estilos.sobrelinha}>Dúvidas frequentes</p><h2 id="duvidas-titulo">Limites e funcionamento, sem promessas implícitas.</h2></div>
      <div className={estilos.listaDuvidas}>
        <Duvida pergunta="O sistema substitui Projudi ou PJe?">Não. O Escritório Dativo organiza o trabalho profissional e não substitui sistemas judiciais oficiais.</Duvida>
        <Duvida pergunta="O sistema conta prazos automaticamente?">Uma data identificada permanece como informação a conferir no processo oficial até validação humana.</Duvida>
        <Duvida pergunta="Como uma nomeação entra no Escritório Dativo?">A nomeação pode ser registrada e estruturada antes da criação do caso. A conferência dos dados é do advogado.</Duvida>
        <Duvida pergunta="A pessoa assistida precisa criar conta?">Não. O contato e a solicitação de documentos partem do caso e da ação do profissional.</Duvida>
        <Duvida pergunta="A OAB/PR consegue ver documentos, conversas e estratégia?">A mantenedora institucional não se confunde com acesso irrestrito ao conteúdo protegido da atuação profissional.</Duvida>
        <Duvida pergunta="Como funciona a pesquisa jurídica?">Ela recupera fontes permitidas e organiza material de apoio. A escolha de tese e estratégia continua profissional.</Duvida>
        <Duvida pergunta="O sistema envia mensagens ou petições sozinho?">Não por padrão. A comunicação sai por ação expressa do advogado. A exceção é o estagiário virtual, que você liga conversa por conversa e pode ser configurado para responder sozinho, sempre sob as travas de confiança que você define.</Duvida>
        <Duvida pergunta="Como funciona o acompanhamento de honorários?">O caso preserva o vínculo com arbitramento, certidão, checklist documental e acompanhamento administrativo.</Duvida>
        <Duvida pergunta="Formação e habilitações aparecem no sistema?">Quando houver integração institucional autorizada, essas informações podem ser reunidas no ambiente profissional.</Duvida>
        <Duvida pergunta="Posso usar o Escritório Dativo como ambiente principal?">O produto foi concebido para concentrar a rotina dativa, mantendo sempre a conferência humana e os sistemas oficiais como referência processual.</Duvida>
      </div>
    </section>

    <section className={estilos.chamadaFinal}>
      <div><p className={estilos.sobrelinha}>Acesso profissional</p><h2>Seu trabalho dativo, com o caso no centro.</h2><p>Entre com sua identidade profissional vinculada ao ambiente de demonstração.</p></div>
      <Link href="/entrar" className={estilos.entrarFinal}>Entrar no Escritório Dativo <span aria-hidden="true">→</span></Link>
    </section>

    <footer className={estilos.rodape}><strong>Escritório Dativo</strong><span>OAB Paraná · Advocacia Dativa</span><small>Ambiente de demonstração · dados fictícios</small><Link href="/?triagem=1">Triagem pública</Link></footer>
  </main>;
}

function Duvida({ pergunta, children }: { pergunta: string; children: React.ReactNode }) {
  return <details><summary>{pergunta}<span aria-hidden="true">+</span></summary><p>{children}</p></details>;
}
