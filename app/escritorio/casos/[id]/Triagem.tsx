"use client";

import type { Triagem } from "@/lib/escritorio";
import { formatarMomento } from "../formatos";

const SITUACAO_DO_REQUISITO: Record<string, string> = { comprovado: "comprovado", falta_documento: "falta documento", nao_se_aplica: "não se aplica" };

// A última triagem do caso, como o advogado precisa ler: força primeiro,
// depois o que fazer, e a fonte de cada afirmação ao lado. Não é parecer.
export function TriagemDoCaso({ triagem }: { triagem: Triagem }) {
  const { analise, forca, verificacao, custo, tempos_ms, extracao } = triagem.resultado;
  const faltando = analise.requisitos.filter((r) => r.situacao === "falta_documento");
  const documentosAPedir = [...new Set([...faltando.map((r) => r.o_que_comprova), ...analise.documentos_necessarios])].filter(Boolean);
  const barrados = [...analise.sem_base, ...verificacao.alertas];
  const segundos = (Object.values(tempos_ms).reduce((total, ms) => total + ms, 0) / 1000).toFixed(1);
  const valor = custo.reais !== null ? `R$ ${custo.reais.toFixed(2).replace(".", ",")}` : custo.dolares !== null ? `US$ ${custo.dolares.toFixed(3)}` : "custo não calculado";
  const porcentagem = forca.aplicaveis > 0 ? Math.round((forca.comprovados / forca.aplicaveis) * 100) : 0;

  return <div className="pdc-triagem" aria-label="Última triagem">
    <div className="pdc-triagem-cabeca">
      <div>
        <p className="md-eyebrow">Última triagem · {formatarMomento(triagem.quando)}</p>
        <p className="pdc-triagem-tipo">{extracao.tipo_caso === "em_andamento" ? "Processo já em andamento." : extracao.tipo_caso === "novo" ? "Caso novo, ainda sem processo." : "Não deu para saber se já existe processo."}</p>
      </div>
      <span className={`pdc-selo ${analise.cabe_juizado_especial ? "pdc-selo-ok" : "pdc-selo-atencao"}`}>{analise.cabe_juizado_especial ? "Cabe no JEC" : "Não cabe no JEC"}</span>
    </div>

    {forca.aplicaveis > 0 && <div className="pdc-forca">
      <div>
        <strong>{forca.comprovados} de {forca.aplicaveis} requisitos comprovados</strong>
        <small>Contagem do que já está provado por documento ou fato do relato. Não é probabilidade de êxito.</small>
      </div>
      <div className="pdc-forca-barra" role="img" aria-label={`${forca.comprovados} de ${forca.aplicaveis} requisitos comprovados`}><i style={{ width: `${porcentagem}%` }} /></div>
    </div>}

    <div className="pdc-triagem-bloco">
      <h3>Resumo</h3>
      <p className="pdc-texto">{analise.resumo}</p>
      <h3>Cabe no Juizado Especial?</h3>
      <p className="pdc-texto">{analise.cabe_juizado_especial ? "Sim. " : "Não. "}{analise.motivo_juizado}</p>
      {analise.encaminhamento && <><h3>Via adequada</h3><p className="pdc-texto">{analise.encaminhamento}</p></>}
      <h3>Próximo passo</h3>
      <p className="pdc-texto">{analise.orientacao}</p>
    </div>

    {analise.requisitos.length > 0 && <div className="pdc-triagem-bloco">
      <h3>Requisitos, um a um</h3>
      <p className="md-texto-auxiliar">Cada requisito traz o id do trecho da lei que o exige e o que o comprova hoje.</p>
      <ul className="pdc-requisitos">{analise.requisitos.map((r) => <li key={`${r.fonte}-${r.requisito}`} className={`pdc-req-${r.situacao}`}>
        <div><strong>{r.requisito}</strong><span className="pdc-req-tag">{SITUACAO_DO_REQUISITO[r.situacao] ?? r.situacao}</span></div>
        <p>{r.o_que_comprova} <code>[{r.fonte}]</code></p>
      </li>)}</ul>
    </div>}

    <div className="pdc-triagem-colunas">
      <div className="pdc-triagem-bloco">
        <h3>Pedir ao cliente</h3>
        {documentosAPedir.length > 0 ? <ul className="pdc-marcadores">{documentosAPedir.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="pdc-vazio">Nenhum documento além dos que já estão no checklist.</p>}
      </div>
      <div className="pdc-triagem-bloco">
        <h3>Perguntar ao cliente</h3>
        {analise.perguntas_pendentes.length > 0 ? <ul className="pdc-marcadores">{analise.perguntas_pendentes.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="pdc-vazio">Nenhuma pergunta pendente.</p>}
      </div>
    </div>

    {(analise.caminhos_extrajudiciais.length > 0 || analise.custos_do_processo.length > 0) && <div className="pdc-triagem-colunas">
      {analise.caminhos_extrajudiciais.length > 0 && <div className="pdc-triagem-bloco"><h3>Antes de processar</h3><ul className="pdc-marcadores">{analise.caminhos_extrajudiciais.map((item) => <li key={item}>{item}</li>)}</ul></div>}
      {analise.custos_do_processo.length > 0 && <div className="pdc-triagem-bloco"><h3>Custas nesta via</h3><ul className="pdc-marcadores">{analise.custos_do_processo.map((item) => <li key={item}>{item}</li>)}</ul></div>}
    </div>}

    <details className="pdc-detalhe">
      <summary>Fundamentos citados <b>{analise.fundamentos.length}</b></summary>
      {analise.fundamentos.length > 0 ? <ul className="pdc-marcadores">{analise.fundamentos.map((f) => <li key={`${f.fonte}-${f.afirmacao}`}>{f.afirmacao} <code>[{f.fonte}]</code></li>)}</ul> : <p className="pdc-vazio">Nenhuma afirmação jurídica sobreviveu à verificação.</p>}
    </details>
    {barrados.length > 0 && <details className="pdc-detalhe pdc-detalhe-alerta">
      <summary>Barrado na verificação e o que conferir <b>{barrados.length}</b></summary>
      <ul className="pdc-marcadores">{barrados.map((item) => <li key={item}>{item}</li>)}</ul>
    </details>}

    <p className="pdc-triagem-rodape">Esta triagem organiza o relato e cita a fonte de cada ponto. Não é parecer, não diz se o caso deve ser aceito e não foi enviada ao cliente. · {valor} · {segundos}s · {custo.modelo}</p>
  </div>;
}
