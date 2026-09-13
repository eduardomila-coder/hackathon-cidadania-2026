"use client";

import Link from "next/link";
import { useState } from "react";

export type FonteDaBase = { id: string; lei: string; artigo: number };

export type TriagemNaTela = {
  id: string;
  quando: string;
  area: string;
  tipo: string;
  cabeJec: boolean;
  motivoJec: string;
  encaminhamento: string | null;
  resumo: string;
  orientacao: string;
  forca: { comprovados: number; aplicaveis: number };
  requisitos: Array<{ requisito: string; situacao: string; oQueComprova: string; fonte: string }>;
  fundamentos: Array<{ afirmacao: string; fonte: string }>;
  documentosAPedir: string[];
  perguntasPendentes: string[];
  alertas: string[];
  custo: string;
  modelo: string;
};

export type CasoPesquisado = { id: string; titulo: string; cliente: string | null; triagens: TriagemNaTela[] };

type Props = { casos: CasoPesquisado[]; fontes: Record<string, FonteDaBase>; base: FonteDaBase[]; totalDeTriagens: number };

const ESTADO_DO_REQUISITO: Record<string, { nome: string; classe: string }> = {
  comprovado: { nome: "comprovado", classe: "pd-estado pd-estado-ok" },
  falta_documento: { nome: "falta documento", classe: "pd-estado pd-estado-atencao" },
  nao_se_aplica: { nome: "não se aplica", classe: "pd-estado" },
};

// Leitura das triagens salvas. Cada requisito mostra o id do trecho que o
// exige e a lei a que esse id pertence; quem confere a leitura e decide é o
// advogado. Nada aqui é parecer, e o rodapé de cada triagem diz isso.
export function Pesquisa({ casos, fontes, base, totalDeTriagens }: Props) {
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const visiveis = escolhido ? casos.filter((caso) => caso.id === escolhido) : casos;

  return <div className="pd-pesquisa">
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">Pesquisa jurídica</p>
        <h1>Pesquisa jurídica</h1>
        <p className="pd-auxiliar">As triagens já feitas nos seus casos, guardadas com os requisitos e a fonte de cada afirmação. É a memória de pesquisa do escritório: nada é analisado de novo aqui, só o que ficou salvo no caso.</p>
      </div>
    </div>

    <p className="pd-aviso">
      <strong>Resposta de apoio, sujeita à conferência profissional.</strong> A triagem organiza o relato e cita o trecho da lei que sustenta cada ponto, mas não é parecer, não decide tese e não diz se o caso deve ser aceito. A redação final e a estratégia são do advogado.
    </p>

    {totalDeTriagens === 0
      ? <div className="pd-vazio">
        <strong>Nenhuma triagem salva ainda.</strong>
        A triagem nasce dentro do caso: abra <Link href="/escritorio">um caso</Link>, cole o relato na parte de triagem e rode a análise. O que ficar salvo aparece aqui, com as fontes, como memória de pesquisa do escritório.
      </div>
      : <div className="pd-pesquisa-layout">
        <aside className="pd-pesquisa-contexto" aria-label="Casos com triagem">
          <div className="pd-cartao-cabeca">
            <h2>Casos com pesquisa</h2>
            <span className="pd-auxiliar">{totalDeTriagens} {totalDeTriagens === 1 ? "triagem" : "triagens"}</span>
          </div>
          <button
            type="button"
            className={`pd-pesquisa-caso${escolhido === null ? " pd-pesquisa-caso-ativo" : ""}`}
            aria-pressed={escolhido === null}
            onClick={() => setEscolhido(null)}
          >
            <span className="pd-pesquisa-caso-nome">Todos os casos</span>
            <span className="pd-pesquisa-caso-contagem">{totalDeTriagens}</span>
          </button>
          {casos.map((caso) => <button
            key={caso.id}
            type="button"
            className={`pd-pesquisa-caso${escolhido === caso.id ? " pd-pesquisa-caso-ativo" : ""}`}
            aria-pressed={escolhido === caso.id}
            onClick={() => setEscolhido(caso.id)}
          >
            <span className="pd-pesquisa-caso-nome">{caso.titulo}</span>
            <span className="pd-pesquisa-caso-contagem">{caso.triagens.length}</span>
          </button>)}
        </aside>

        <div className="pd-pesquisa-tudo">
          {visiveis.map((caso) => <section className="pd-pesquisa-grupo" key={caso.id}>
            <div className="pd-pesquisa-grupo-cabeca">
              <div>
                <h2>{caso.titulo}</h2>
                <p className="pd-linha-meta">{caso.cliente ?? "sem cliente vinculado"}</p>
              </div>
              <Link className="pd-botao pd-botao-pequeno pd-botao-secundario" href={`/escritorio/casos/${caso.id}`}>Abrir caso</Link>
            </div>

            {caso.triagens.map((triagem) => <article className="pd-pesquisa-triagem" key={triagem.id}>
              <div className="pd-pesquisa-triagem-cabeca">
                <div>
                  <p className="pd-eyebrow">Triagem de {triagem.quando}</p>
                  <p className="pd-linha-meta">{triagem.area} · {triagem.tipo}</p>
                </div>
                <span className={`pd-estado ${triagem.cabeJec ? "pd-estado-ok" : "pd-estado-atencao"}`}>
                  {triagem.cabeJec ? "Cabe no Juizado Especial" : "Não cabe no Juizado Especial"}
                </span>
              </div>

              {triagem.forca.aplicaveis > 0 && <div className="pd-pesquisa-forca">
                <div>
                  <strong>{triagem.forca.comprovados} de {triagem.forca.aplicaveis} requisitos comprovados</strong>
                  <small>Contagem do que já está provado por documento ou fato do relato. Não é probabilidade de êxito.</small>
                </div>
                <div className="pd-progresso" role="img" aria-label={`${triagem.forca.comprovados} de ${triagem.forca.aplicaveis} requisitos comprovados`}>
                  <span style={{ width: `${Math.round((triagem.forca.comprovados / triagem.forca.aplicaveis) * 100)}%` }} />
                </div>
              </div>}

              <p className="pd-pesquisa-texto">{triagem.resumo}</p>
              <p className="pd-pesquisa-texto"><strong>No Juizado:</strong> {triagem.cabeJec ? "Sim. " : "Não. "}{triagem.motivoJec}</p>
              {triagem.encaminhamento && <p className="pd-pesquisa-texto"><strong>Via adequada:</strong> {triagem.encaminhamento}</p>}

              {triagem.requisitos.length > 0 && <div className="pd-pesquisa-bloco">
                <h3>Requisitos e a fonte de cada um</h3>
                <ul className="pd-pesquisa-requisitos">
                  {triagem.requisitos.map((requisito) => {
                    const estado = ESTADO_DO_REQUISITO[requisito.situacao] ?? { nome: requisito.situacao, classe: "pd-estado" };
                    const fonte = fontes[requisito.fonte];
                    return <li key={`${triagem.id}-${requisito.fonte}-${requisito.requisito}`}>
                      <div className="pd-pesquisa-requisito-topo">
                        <strong>{requisito.requisito}</strong>
                        <span className={estado.classe}>{estado.nome}</span>
                      </div>
                      <p className="pd-pesquisa-texto">{requisito.oQueComprova}</p>
                      <p className="pd-pesquisa-fonte">
                        <code>{requisito.fonte}</code>
                        {fonte ? ` ${fonte.lei}, art. ${fonte.artigo}` : " trecho não encontrado no acervo"}
                      </p>
                    </li>;
                  })}
                </ul>
              </div>}

              {triagem.fundamentos.length > 0 && <details className="pd-pesquisa-detalhe">
                <summary>Fundamentos citados <b>{triagem.fundamentos.length}</b></summary>
                <ul className="pd-pesquisa-marcadores">
                  {triagem.fundamentos.map((fundamento) => {
                    const fonte = fontes[fundamento.fonte];
                    return <li key={`${triagem.id}-${fundamento.fonte}-${fundamento.afirmacao}`}>
                      {fundamento.afirmacao} <code>{fundamento.fonte}</code>{fonte ? ` (${fonte.lei}, art. ${fonte.artigo})` : ""}
                    </li>;
                  })}
                </ul>
              </details>}

              {(triagem.documentosAPedir.length > 0 || triagem.perguntasPendentes.length > 0) && <div className="pd-pesquisa-colunas">
                {triagem.documentosAPedir.length > 0 && <div>
                  <h3>Pedir ao cliente</h3>
                  <ul className="pd-pesquisa-marcadores">{triagem.documentosAPedir.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>}
                {triagem.perguntasPendentes.length > 0 && <div>
                  <h3>Perguntar ao cliente</h3>
                  <ul className="pd-pesquisa-marcadores">{triagem.perguntasPendentes.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>}
              </div>}

              {triagem.alertas.length > 0 && <details className="pd-pesquisa-detalhe pd-pesquisa-detalhe-alerta">
                <summary>A conferir antes de confiar <b>{triagem.alertas.length}</b></summary>
                <ul className="pd-pesquisa-marcadores">{triagem.alertas.map((item) => <li key={item}>{item}</li>)}</ul>
              </details>}

              <div className="pd-pesquisa-bloco">
                <h3>Próximo passo</h3>
                <p className="pd-pesquisa-texto">{triagem.orientacao}</p>
              </div>

              <p className="pd-pesquisa-rodape">
                Resposta de apoio, sujeita à conferência profissional. · custo {triagem.custo} · {triagem.modelo}
              </p>
            </article>)}
          </section>)}
        </div>
      </div>}

    {base.length > 0 && <details className="pd-pesquisa-base">
      <summary>Trechos que toda busca leva em conta <b>{base.length}</b></summary>
      <p className="pd-pesquisa-texto">Além destes, a busca por tema recupera os outros trechos do acervo, que fica em <code>docs/juridico/</code>, um artigo por trecho. Cada id citado acima é um desses artigos.</p>
      <ul className="pd-pesquisa-marcadores">
        {base.map((trecho) => <li key={trecho.id}><code>{trecho.id}</code> {trecho.lei}, art. {trecho.artigo}</li>)}
      </ul>
    </details>}
  </div>;
}
