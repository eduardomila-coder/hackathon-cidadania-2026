"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FichaDeNomeacao } from "@/lib/assistente";
import type { Caso } from "@/lib/escritorio";
import { chamar, mensagemDeErro } from "./api";
import { formatarData } from "./formatos";

type Props = { aoFechar: () => void };

// Nova nomeação em dois passos: a IA lê a intimação e mostra a ficha; o
// caso só é aberto quando o advogado clica. Uma leitura só: ao abrir, a
// ficha já conferida vai junto e o modelo não é chamado de novo.
export function NovaNomeacao({ aoFechar }: Props) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [ficha, setFicha] = useState<FichaDeNomeacao | null>(null);
  const [lendo, setLendo] = useState(false);
  const [abrindo, setAbrindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function ler() {
    setErro(null);
    setLendo(true);
    setFicha(null);
    try {
      const resposta = await chamar<{ ficha: FichaDeNomeacao }>("/api/escritorio/nomeacao", { metodo: "POST", corpo: { texto, somenteFicha: true } });
      setFicha(resposta.ficha);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setLendo(false);
    }
  }

  async function abrirCaso() {
    if (!ficha) return;
    setErro(null);
    setAbrindo(true);
    try {
      const resposta = await chamar<{ caso: Caso }>("/api/escritorio/nomeacao", { metodo: "POST", corpo: { texto, ficha } });
      router.push(`/escritorio/casos/${resposta.caso.id}`);
    } catch (e) {
      setErro(mensagemDeErro(e));
      setAbrindo(false);
    }
  }

  const ocupado = lendo || abrindo;
  return <section className="pd-cartao pdc-formulario pdc-nomeacao" aria-label="Nova nomeação">
    <div className="md-titulo-linha">
      <div><p className="md-eyebrow">Nova nomeação</p><h2>Colar a intimação</h2></div>
      <button type="button" className="md-link-botao" onClick={aoFechar} disabled={ocupado}>Fechar</button>
    </div>
    <p className="pdc-formulario-intro">Cole o texto da intimação de nomeação (Portal da Advocacia Dativa, e-mail ou processo eletrônico). A IA monta uma ficha com o que está escrito ali, sem calcular prazo e sem decidir tese. O caso só é aberto quando você clicar.</p>

    <label className="pdc-campo">
      <span className="sr-only">Texto da intimação</span>
      <textarea value={texto} onChange={(evento) => setTexto(evento.target.value)} maxLength={12000} rows={8} placeholder="Cole aqui o texto completo da intimação" disabled={ocupado} />
      <small className="pdc-contagem">{texto.length}/12000</small>
    </label>

    <div className="md-acoes">
      <button type="button" className={ficha ? "md-botao-secundario" : "md-botao-primario"} onClick={ler} disabled={ocupado || texto.trim().length < 30}>{lendo ? "Trabalhando…" : ficha ? "Ler de novo" : "Ler a intimação"}</button>
      {lendo && <span className="pdc-trabalhando">Lendo o texto e separando processo, órgão, ato e prazo. Nada é enviado a ninguém.</span>}
    </div>
    {erro && <p role="alert" className="pdc-erro">{erro}</p>}

    {ficha && <div className="pdc-ficha" aria-live="polite">
      <p className="md-eyebrow">Ficha extraída pela IA</p>
      <dl className="pdc-dados">
        <div><dt>Processo</dt><dd>{ficha.processo ?? <em>não consta no texto</em>}</dd></div>
        <div><dt>Órgão</dt><dd>{ficha.orgao ?? <em>não consta</em>}</dd></div>
        <div><dt>Ato</dt><dd>{ficha.ato ?? <em>não consta</em>}</dd></div>
        <div><dt>Ciência</dt><dd>{ficha.dataCiencia ? <>{formatarData(ficha.dataCiencia)} <em>· é daqui que o prazo em dias começa a contar</em></> : <em>o texto não traz a data da intimação</em>}</dd></div>
        <div><dt>Prazo</dt><dd>{ficha.dataPrazo ? <><b>{formatarData(ficha.dataPrazo)}</b>{ficha.prazoInformado ? ` · ${ficha.prazoInformado}` : ""}</> : <>{ficha.prazoInformado ?? "sem data no texto"} <em>· conferir no ato</em></>}</dd></div>
      </dl>
      <h3>Resumo</h3>
      <p className="pdc-texto">{ficha.resumo}</p>
      <div className="pdc-ficha-listas">
        <Lista titulo="Fundamentos a avaliar" itens={ficha.fundamentosAAvaliar} vazio="Nada sugerido pelo texto." />
        <Lista titulo="Documentos a pedir" itens={ficha.documentosAPedir} vazio="Nenhum além do checklist padrão." />
        <Lista titulo="Perguntas ao cliente" itens={ficha.perguntasAoCliente} vazio="Nenhuma por enquanto." />
        <Lista titulo="Confira antes de confiar" itens={ficha.alertas} vazio="Sem alertas." classe="pdc-lista-alerta" />
      </div>
      <div className="md-acoes">
        <button type="button" className="md-botao-primario" onClick={abrirCaso} disabled={ocupado}>{abrindo ? "Abrindo…" : "Abrir caso a partir da ficha"} <span>→</span></button>
        <span className="md-texto-auxiliar">O caso nasce com esta ficha, o checklist de documentos e duas tarefas: conferir a íntegra da intimação e confirmar o prazo no processo.</span>
      </div>
    </div>}
  </section>;
}

function Lista({ titulo, itens, vazio, classe = "" }: { titulo: string; itens: string[]; vazio: string; classe?: string }) {
  return <div className={`pdc-ficha-lista ${classe}`.trim()}>
    <h3>{titulo}</h3>
    {itens.length === 0 ? <p className="pdc-vazio">{vazio}</p> : <ul>{itens.map((item) => <li key={item}>{item}</li>)}</ul>}
  </div>;
}
