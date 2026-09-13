"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FichaDeNomeacao } from "@/lib/assistente";
import type { Caso } from "@/lib/escritorio";
import { chamar, mensagemDeErro } from "./api";
import { formatarCnj, formatarData } from "./formatos";

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
  const cnjIdentificado = Boolean(ficha?.processo);
  const prazoDoTexto = ficha ? (ficha.dataPrazo ? formatarData(ficha.dataPrazo) : ficha.prazoInformado) : null;

  return <section className="pd-cartao pdl-formulario" aria-label="Nova nomeação">
    <div className="pd-cartao-cabeca">
      <div>
        <p className="pd-eyebrow">Nova nomeação</p>
        <h2>{ficha ? "Leitura assistida da nomeação" : "Colar a intimação"}</h2>
      </div>
      <button type="button" className="pd-botao pd-botao-quieto pd-botao-pequeno" onClick={aoFechar} disabled={ocupado}>Fechar</button>
    </div>

    <div className="pd-cartao-corpo">
      <p className="pd-auxiliar pdl-formulario-intro">Cole o texto da intimação de nomeação (Portal da Advocacia Dativa, e-mail ou processo eletrônico). A IA monta uma ficha com o que está escrito ali, sem calcular prazo e sem decidir tese. O caso só é aberto quando você clicar.</p>

      <div className="pd-campo">
        <label htmlFor="nn-texto">Texto da intimação</label>
        <textarea id="nn-texto" className="pd-area-texto" value={texto} onChange={(evento) => setTexto(evento.target.value)} maxLength={12000} rows={8} placeholder="Cole aqui o texto completo da intimação" disabled={ocupado} />
        <small className="pd-auxiliar pdl-contagem">{texto.length}/12000</small>
      </div>

      <div className="pd-linha-campos">
        <button type="button" className={`pd-botao ${ficha ? "pd-botao-secundario" : "pd-botao-primario"}`} onClick={ler} disabled={ocupado || texto.trim().length < 30}>{lendo ? "Trabalhando…" : ficha ? "Ler de novo" : "Ler a intimação"}</button>
        {lendo && <span className="pd-auxiliar pdl-andamento">Lendo o texto e separando processo, órgão, ato e prazo. Nada é enviado a ninguém.</span>}
      </div>
      {erro && <p role="alert" className="pd-aviso pd-aviso-risco">{erro}</p>}

      {ficha && <div aria-live="polite">
        <div className="pdl-hero">
          <div className="pdl-hero-topo">
            <div>
              <p className="pd-eyebrow">Nomeação lida</p>
              <h3>{ficha.processo ? formatarCnj(ficha.processo) : "Processo não identificado no texto"}</h3>
              <span className="pd-numero">{ficha.orgao ?? "Órgão não consta no texto"}</span>
            </div>
            <span className={`pd-estado ${cnjIdentificado ? "pd-estado-ok" : "pd-estado-atencao"}`}>
              {cnjIdentificado ? "Número CNJ identificado" : "Sem número CNJ no texto"}
            </span>
          </div>
          <dl className="pdl-meta-grade">
            <div className="pdl-meta"><dt>Origem</dt><dd>Intimação colada pelo advogado</dd></div>
            <div className="pdl-meta"><dt>Ato indicado</dt><dd>{ficha.ato ?? <em>não consta no texto</em>}</dd></div>
            <div className="pdl-meta"><dt>Ciência</dt><dd>{ficha.dataCiencia ? formatarData(ficha.dataCiencia) : <em>não consta no texto</em>}</dd></div>
            <div className={`pdl-meta${ficha.dataPrazo || ficha.prazoInformado ? "" : " pdl-meta-risco"}`}>
              <dt>Prazo</dt>
              <dd>{prazoDoTexto ?? <em>não determinado · conferir no processo oficial</em>}</dd>
            </div>
          </dl>
        </div>

        <p className="pd-aviso">A IA estruturou a intimação. Ela não contou prazo nem tomou decisão processual. Revise cada campo antes de abrir o caso.</p>
        <p className="pd-auxiliar pdl-nota-prazo">Prazo identificado no texto é sempre a conferir no processo oficial.</p>

        <dl className="pd-dados pdl-extraido">
          <div className="pd-dado"><dt>Processo</dt><dd>{ficha.processo ? <span className="pd-numero">{formatarCnj(ficha.processo)}</span> : <em>não consta no texto</em>}</dd></div>
          <div className="pd-dado"><dt>Órgão</dt><dd>{ficha.orgao ?? <em>não consta</em>}</dd></div>
          <div className="pd-dado"><dt>Ciência</dt><dd>{ficha.dataCiencia ? <>{formatarData(ficha.dataCiencia)} <em>· é daqui que o prazo em dias começa a contar</em></> : <em>o texto não traz a data da intimação</em>}</dd></div>
          <div className="pd-dado"><dt>Prazo</dt><dd>{ficha.dataPrazo
            ? <><b>{formatarData(ficha.dataPrazo)}</b>{ficha.prazoInformado ? ` · ${ficha.prazoInformado}` : ""} <em>· a conferir no processo oficial</em></>
            : <>{ficha.prazoInformado ?? "não determinado"} <em>· a conferir no processo oficial</em></>}</dd></div>
        </dl>

        <div className="pdl-ficha-bloco">
          <h4>Resumo</h4>
          <p>{ficha.resumo}</p>
        </div>

        <div className="pdl-ficha-listas">
          <Lista titulo="Fundamentos a avaliar" itens={ficha.fundamentosAAvaliar} vazio="Nada sugerido pelo texto." />
          <Lista titulo="Documentos a pedir" itens={ficha.documentosAPedir} vazio="Nenhum além do checklist padrão." />
          <Lista titulo="Perguntas ao cliente" itens={ficha.perguntasAoCliente} vazio="Nenhuma por enquanto." />
          <Lista titulo="Confira antes de confiar" itens={ficha.alertas} vazio="Sem alertas." classe="pdl-alerta" />
        </div>

        <section className="pdl-decisao">
          <p className="pd-eyebrow">Antes de abrir o caso</p>
          <h4>Checklist mínimo</h4>
          <p>Estas conferências são suas. O sistema só mostra o que o texto da intimação trouxe.</p>
          <ul className="pdl-tarefas">
            <li>
              <span className={`pdl-check${cnjIdentificado ? " pdl-check-ok" : ""}`} aria-hidden="true">{cnjIdentificado ? "✓" : ""}</span>
              <div><strong>Número CNJ identificado</strong><span>{cnjIdentificado ? formatarCnj(ficha.processo ?? "") : "não consta no texto colado"}</span></div>
            </li>
            <li>
              <span className="pdl-check" aria-hidden="true" />
              <div><strong>Conferir o processo oficial</strong><span>ato e prazo, no sistema do tribunal</span></div>
            </li>
            <li>
              <span className="pdl-check" aria-hidden="true" />
              <div><strong>Confirmar os dados da parte assistida</strong><span>nome, contato e documentação</span></div>
            </li>
            <li>
              <span className="pdl-check" aria-hidden="true" />
              <div><strong>Verificar impedimento ou conflito</strong><span>confirmação humana</span></div>
            </li>
          </ul>
        </section>

        <div className="pd-linha-campos">
          <button type="button" className="pd-botao pd-botao-primario" onClick={abrirCaso} disabled={ocupado}>{abrindo ? "Abrindo…" : "Abrir caso a partir da ficha"}</button>
          <span className="pd-auxiliar">O caso nasce com esta ficha, o checklist de documentos e duas tarefas: conferir a íntegra da intimação e confirmar o prazo no processo.</span>
        </div>
      </div>}
    </div>
  </section>;
}

function Lista({ titulo, itens, vazio, classe = "" }: { titulo: string; itens: string[]; vazio: string; classe?: string }) {
  return <div className={classe.trim()}>
    <h4>{titulo}</h4>
    {itens.length === 0 ? <div className="pd-vazio">{vazio}</div> : <ul>{itens.map((item) => <li key={item}>{item}</li>)}</ul>}
  </div>;
}
