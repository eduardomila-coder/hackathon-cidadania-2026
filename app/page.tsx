"use client";

import { useState } from "react";
import Link from "next/link";
import type { Etapa, Resultado } from "@/lib/analise";
import { useDitado } from "@/lib/useDitado";
import { Versoes } from "./Versoes";

const ETAPAS: { chave: Etapa; titulo: string; texto: string }[] = [
  { chave: "extraindo", titulo: "Lendo o relato", texto: "Informações recebidas e em análise." },
  { chave: "buscando", titulo: "Procurando na lei", texto: "Buscando pontos relevantes na legislação." },
  { chave: "analisando", titulo: "Organizando o caso", texto: "Estruturando os argumentos e documentos." },
  { chave: "verificando", titulo: "Conferindo cada afirmação", texto: "Validando as informações, ponto a ponto." },
];

export default function Home() {
  const [relato, setRelato] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const ditado = useDitado((texto) => setRelato((anterior) => (anterior ? `${anterior} ${texto}` : texto)));

  async function enviar() {
    setErro(null); setResultado(null); setEtapa("extraindo");
    try {
      const resposta = await fetch("/api/analisar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ relato }) });
      if (!resposta.ok || !resposta.body) { setErro((await resposta.json()).erro ?? "Não consegui analisar agora."); return; }
      const leitor = resposta.body.getReader(); const decodificador = new TextDecoder(); let pendente = "";
      for (;;) {
        const { value, done } = await leitor.read(); if (done) break;
        pendente += decodificador.decode(value, { stream: true });
        const linhas = pendente.split("\n"); pendente = linhas.pop() ?? "";
        for (const linha of linhas) {
          if (!linha.trim()) continue;
          const mensagem = JSON.parse(linha) as { etapa?: Etapa; resultado?: Resultado; erro?: string };
          if (mensagem.etapa) setEtapa(mensagem.etapa);
          if (mensagem.resultado) setResultado(mensagem.resultado);
          if (mensagem.erro) setErro(mensagem.erro);
        }
      }
    } catch { setErro("Perdi a conexão. Tente de novo."); }
    finally { setEtapa(null); }
  }

  const carregando = etapa !== null;
  return <main className="cf-publico">
    <Cabecalho />
    {carregando ? <AnaliseAndamento etapa={etapa} /> : resultado ? <ResultadoDaAnalise resultado={resultado} /> : <>
      <section className="cf-hero" id="inicio">
        <div className="cf-hero-conteudo">
          <p className="cf-sobrelinha">Habeas Titas</p>
          <h1>Entenda seu caso.<br />Saiba o próximo passo.</h1>
          <p className="cf-intro">Descreva sua situação em linguagem simples e receba uma análise inicial com orientação clara sobre seus direitos e os próximos passos.</p>
          <label className="cf-relato"><span className="sr-only">Conte o que aconteceu</span><textarea value={relato} onChange={(evento) => setRelato(evento.target.value)} maxLength={1000} placeholder="Conte o que aconteceu" /><small>{relato.length}/1000</small></label>
          <div className="cf-acoes">
            <button type="button" className="cf-botao-escuro" onClick={enviar} disabled={relato.trim().length < 10}>Analisar meu caso <span>→</span></button>
            {ditado.suportado && <button type="button" className="cf-botao-texto" onClick={ditado.gravando ? ditado.parar : ditado.iniciar} aria-pressed={ditado.gravando}>{ditado.gravando ? "Parar de falar" : "Falar o relato"}</button>}
            <small>Gratuito · Seguro · Sem cadastro</small>
          </div>
        </div>
        <aside className="cf-hero-lateral" aria-hidden="true"><span>Informação<br />também<br />é um direito</span><div className="cf-arco" /><p>Mais cidadania<br />uma sociedade<br />mais justa</p></aside>
      </section>
      {erro && <p role="alert" className="cf-erro">{erro}</p>}
      <section className="cf-passos" id="como-funciona"><Passo numero="1" titulo="Conte">Descreva sua situação de forma simples e objetiva, no seu jeito de falar.</Passo><Passo numero="2" titulo="Entenda">Receba uma análise inicial, com linguagem clara e orientação confiável.</Passo><Passo numero="3" titulo="Aja">Saiba quais são os próximos passos e como buscar ajuda, se necessário.</Passo></section>
      <section className="cf-conteudo" id="sobre"><p className="cf-sobrelinha">Nossa missão</p><h2>Direito mais acessível para todas as pessoas.</h2><p>O Cidadania Fácil organiza informações jurídicas com linguagem simples, fontes verificáveis e orientação prática.</p></section>
      <section className="cf-duvidas" id="perguntas"><p className="cf-sobrelinha">Dúvidas reais, respostas claras</p><h2>Perguntas frequentes</h2>{["O serviço substitui um advogado?", "Meu relato fica salvo?", "Posso usar pelo celular?", "A análise é uma orientação?"].map((pergunta) => <details key={pergunta}><summary>{pergunta}<span>⌄</span></summary><p>O Cidadania Fácil oferece informação organizada para ajudar você a entender a situação e decidir o próximo passo com mais segurança.</p></details>)}</section>
      <section className="cf-contato" id="contato"><div><p className="cf-sobrelinha">Contato</p><h2>Fale com a gente.</h2><p>Estamos à disposição para esclarecer dúvidas e ouvir sugestões durante o Hackathon da Cidadania.</p></div><div className="cf-cartao"><h3>Habeas Titas · OAB/PR</h3><p><strong>Atendimento no Hackathon da Cidadania</strong><br />OAB/PR, Curitiba/PR</p><p><strong>Horário</strong><br />Durante o período do evento.</p></div></section>
      <Versoes />
    </>}
    <Rodape />
  </main>;
}

function Cabecalho() { return <header className="cf-cabecalho"><Link href="/" className="cf-marca">Cidadania Fácil <small>Habeas Titas · OAB/PR</small></Link><nav aria-label="Navegação principal"><a href="#inicio">Início</a><a href="#sobre">Sobre</a><a href="#como-funciona">Como funciona</a><a href="#perguntas">Perguntas</a><a href="#contato">Contato</a></nav><Link href="/painel" className="cf-equipe">Área da equipe →</Link></header>; }
function Rodape() { return <footer className="cf-rodape"><strong>Cidadania Fácil</strong><span>Habeas Titas · OAB/PR</span><small>Informação hoje. Mais direitos sempre.</small></footer>; }
function Passo({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) { return <article><span>{numero}</span><div><h3>{titulo}</h3><p>{children}</p></div></article>; }

function AnaliseAndamento({ etapa }: { etapa: Etapa | null }) {
  const atual = ETAPAS.findIndex((item) => item.chave === etapa);
  return <section className="cf-carregando" aria-live="polite"><div className="cf-caixa-carregando"><h1>Estamos organizando seu caso.</h1><p>Nossa inteligência jurídica está analisando as informações e preparando uma orientação personalizada para você.</p><ol>{ETAPAS.map((item, indice) => <li key={item.chave} className={indice <= atual ? "feito" : ""}><i>{indice < atual ? "✓" : ""}</i><div><strong>{item.titulo}</strong><small>{item.texto}</small>{indice === atual && <b />}</div></li>)}</ol><footer>◷ &nbsp; Isso pode levar alguns instantes.</footer></div></section>;
}

function ResultadoDaAnalise({ resultado }: { resultado: Resultado }) {
  const analise = resultado.analise;
  const naoConfirmadas = resultado.verificacao.itens.filter((item) => item.situacao !== "confirmada");
  return <section className="cf-resultado"><div className="cf-resultado-principal"><p className="cf-status">✓ &nbsp; Análise concluída</p><p className="cf-intro-menor">Com base nas informações fornecidas, aqui está o resultado da sua análise.</p><h1>Seu caso, em poucas palavras.</h1><p className="cf-intro">Analisamos as informações que você enviou e organizamos um resumo claro, com os principais pontos e os próximos passos.</p><article className="cf-resumo"><div className="cf-item"><b>▤</b><div><h2>Resumo do caso</h2><p>{analise.resumo}</p></div></div><Linha titulo="Parece caber no Juizado Especial?" texto={analise.cabe_juizado_especial ? "Sim. " + analise.motivo_juizado : "Ainda não. " + analise.motivo_juizado} /><Linha titulo="Próximo passo" texto={analise.orientacao} /><div className="cf-aviso">☼ <span><strong>Importante</strong><br />Esta análise tem caráter informativo e não substitui a orientação de um profissional do Direito.</span></div></article></div><aside className="cf-coluna-resultados"><article className="cf-cartao"><h2>Documentos que ajudam</h2><p>Separe estes documentos para facilitar o seu atendimento e fortalecer o seu caso.</p><ul>{analise.documentos_necessarios.map((item) => <li key={item}>▤ {item}</li>)}</ul></article><details className="cf-link-legal"><summary>⚖ Ver fundamentos legais <span>›</span></summary><ul>{analise.fundamentos.map((fundamento) => <li key={fundamento.afirmacao}>{fundamento.afirmacao}</li>)}</ul></details>{(naoConfirmadas.length > 0 || analise.sem_base.length > 0 || resultado.verificacao.alertas.length > 0) && <details className="cf-link-legal cf-alerta"><summary>⌁ Pontos não confirmados <span>›</span></summary><ul>{[...analise.sem_base, ...resultado.verificacao.alertas].map((item) => <li key={item}>{item}</li>)}</ul></details>}</aside></section>;
}
function Linha({ titulo, texto }: { titulo: string; texto: string }) { return <div className="cf-linha"><b>→</b><div><h3>{titulo}</h3><p>{texto}</p></div></div>; }
