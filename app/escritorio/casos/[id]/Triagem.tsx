"use client";

import type { Triagem } from "@/lib/escritorio";
import { formatarMomento } from "../formatos";

const SITUACAO_DO_REQUISITO: Record<string, { rotulo: string; classe: string }> = {
  comprovado: { rotulo: "comprovado", classe: "pd-estado-ok" },
  falta_documento: { rotulo: "falta documento", classe: "pd-estado-atencao" },
  nao_se_aplica: { rotulo: "não se aplica", classe: "" },
};

// A força do caso é contagem, nunca probabilidade: requisitos comprovados
// sobre os que se aplicam, com o que comprova cada um.
export function ForcaDoCaso({ triagem }: { triagem: Triagem }) {
  const { forca, analise } = triagem.resultado;

  if (forca.aplicaveis === 0) {
    return <p className="pd-vazio"><strong>Nenhum requisito se aplica a este caso.</strong>Sem requisito aplicável não há contagem de força. Leia os pontos a verificar na triagem completa.</p>;
  }

  const porcentagem = Math.round((forca.comprovados / forca.aplicaveis) * 100);
  const faltam = forca.aplicaveis - forca.comprovados;

  return <div className="pdc-forca">
    <div className="pdc-forca-contagem">
      <strong>{forca.comprovados} de {forca.aplicaveis}</strong>
      <span>requisitos comprovados</span>
    </div>
    <div className="pdc-forca-leitura">
      <div className="pd-progresso" role="img" aria-label={`${forca.comprovados} de ${forca.aplicaveis} requisitos comprovados`}>
        <span style={{ width: `${porcentagem}%` }} />
      </div>
      <p className="pdc-forca-nota">
        {faltam === 0 ? "Todos os requisitos aplicáveis têm comprovação no caso. " : `${faltam} ${faltam === 1 ? "ainda não tem" : "ainda não têm"} comprovação. `}
        Contagem do que já está provado por documento ou fato do relato. Não é probabilidade de êxito.
      </p>
      <p className="pdc-forca-jec">
        <span className={`pd-estado ${analise.cabe_juizado_especial ? "pd-estado-info" : "pd-estado-atencao"}`}>
          {analise.cabe_juizado_especial ? "cabe no Juizado Especial" : "não cabe no Juizado Especial"}
        </span>
      </p>
    </div>
  </div>;
}

// A última triagem do caso, como o advogado precisa ler: força primeiro,
// depois o que fazer, e a fonte de cada afirmação ao lado. Não é parecer.
export function TriagemDoCaso({ triagem }: { triagem: Triagem }) {
  const { analise, verificacao, custo, tempos_ms, extracao } = triagem.resultado;
  const faltando = analise.requisitos.filter((r) => r.situacao === "falta_documento");
  const documentosAPedir = [...new Set([...faltando.map((r) => r.o_que_comprova), ...analise.documentos_necessarios])].filter(Boolean);
  const barrados = [...analise.sem_base, ...verificacao.alertas];
  const segundos = (Object.values(tempos_ms).reduce((total, ms) => total + ms, 0) / 1000).toFixed(1);
  const valor = custo.reais !== null ? `R$ ${custo.reais.toFixed(2).replace(".", ",")}` : custo.dolares !== null ? `US$ ${custo.dolares.toFixed(3)}` : "custo não calculado";

  return <section className="pd-cartao" aria-label="Última triagem do caso">
    <div className="pd-cartao-cabeca">
      <h2>Triagem com fontes</h2>
      <span className="pd-auxiliar">última em {formatarMomento(triagem.quando)}</span>
    </div>
    <div className="pd-cartao-corpo">
      <p className="pd-auxiliar pdc-triagem-tipo">
        {extracao.tipo_caso === "em_andamento" ? "Processo já em andamento." : extracao.tipo_caso === "novo" ? "Caso novo, ainda sem processo." : "Não deu para saber se já existe processo."}
      </p>

      <ForcaDoCaso triagem={triagem} />

      <h3>Resumo</h3>
      <p className="pdc-texto">{analise.resumo}</p>

      <h3>Cabe no Juizado Especial?</h3>
      <p className="pdc-texto">{analise.cabe_juizado_especial ? "Sim. " : "Não. "}{analise.motivo_juizado}</p>

      {analise.encaminhamento && <><h3>Via adequada</h3><p className="pdc-texto">{analise.encaminhamento}</p></>}

      <h3>Próximo passo</h3>
      <p className="pdc-texto">{analise.orientacao}</p>

      {analise.requisitos.length > 0 && <>
        <h3>Requisitos, um a um</h3>
        <p className="pd-auxiliar">Cada requisito traz o id do trecho da lei que o exige e o que o comprova hoje.</p>
        <ul className="pdc-requisitos">
          {analise.requisitos.map((r) => {
            const situacao = SITUACAO_DO_REQUISITO[r.situacao] ?? { rotulo: r.situacao, classe: "" };
            return <li key={`${r.fonte}-${r.requisito}`} className={`pdc-req pdc-req-${r.situacao}`}>
              <div className="pdc-req-topo">
                <strong>{r.requisito}</strong>
                <span className={`pd-estado ${situacao.classe}`}>{situacao.rotulo}</span>
              </div>
              <p className="pdc-req-texto">{r.o_que_comprova} <code className="pdc-fonte">[{r.fonte}]</code></p>
            </li>;
          })}
        </ul>
      </>}

      <div className="pdc-duas-colunas">
        <div>
          <h3>Pedir ao cliente</h3>
          {documentosAPedir.length > 0
            ? <ul className="pdc-topicos">{documentosAPedir.map((item) => <li key={item}>{item}</li>)}</ul>
            : <p className="pd-auxiliar">Nenhum documento além dos que já estão no checklist.</p>}
        </div>
        <div>
          <h3>Perguntar ao cliente</h3>
          {analise.perguntas_pendentes.length > 0
            ? <ul className="pdc-topicos">{analise.perguntas_pendentes.map((item) => <li key={item}>{item}</li>)}</ul>
            : <p className="pd-auxiliar">Nenhuma pergunta pendente.</p>}
        </div>
      </div>

      {(analise.caminhos_extrajudiciais.length > 0 || analise.custos_do_processo.length > 0) && <div className="pdc-duas-colunas">
        {analise.caminhos_extrajudiciais.length > 0 && <div>
          <h3>Antes de processar</h3>
          <ul className="pdc-topicos">{analise.caminhos_extrajudiciais.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>}
        {analise.custos_do_processo.length > 0 && <div>
          <h3>Custas nesta via</h3>
          <ul className="pdc-topicos">{analise.custos_do_processo.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>}
      </div>}

      <details className="pdc-detalhe">
        <summary>Fundamentos citados <b>{analise.fundamentos.length}</b></summary>
        {analise.fundamentos.length > 0
          ? <ul className="pdc-topicos">{analise.fundamentos.map((f) => <li key={`${f.fonte}-${f.afirmacao}`}>{f.afirmacao} <code className="pdc-fonte">[{f.fonte}]</code></li>)}</ul>
          : <p className="pd-auxiliar">Nenhuma afirmação jurídica sobreviveu à verificação.</p>}
      </details>

      {barrados.length > 0 && <details className="pdc-detalhe pdc-detalhe-alerta">
        <summary>Barrado na verificação e o que conferir <b>{barrados.length}</b></summary>
        <ul className="pdc-topicos">{barrados.map((item) => <li key={item}>{item}</li>)}</ul>
      </details>}

      <p className="pdc-triagem-rodape">
        Esta triagem organiza o relato e cita a fonte de cada ponto. Não é parecer, não diz se o caso deve ser aceito e não foi enviada ao cliente. · {valor} · {segundos}s · {custo.modelo}
      </p>
    </div>
  </section>;
}
