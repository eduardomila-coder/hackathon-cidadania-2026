"use client";

import Link from "next/link";
import { useState } from "react";

export type FonteDaBase = { id: string; lei: string; artigo: string };

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

const ESTADO_DO_REQUISITO: Record<string, { nome: string; tom: string }> = {
  comprovado: { nome: "comprovado", tom: "st-ok" },
  falta_documento: { nome: "falta documento", tom: "st-warn" },
  nao_se_aplica: { nome: "não se aplica", tom: "st-neutral" },
};

// Leitura das triagens salvas, no desenho do protótipo: à esquerda o contexto
// que a análise usou; à direita a resposta, numerada, com a fonte de cada
// afirmação. Nada é analisado de novo aqui; quem confere e decide é o
// advogado, e o rodapé diz isso.
export function Pesquisa({ casos, fontes, base, totalDeTriagens }: Props) {
  const [casoId, setCasoId] = useState<string>(casos[0]?.id ?? "");
  const caso = casos.find((item) => item.id === casoId) ?? casos[0] ?? null;
  const [triagemId, setTriagemId] = useState<string | null>(null);
  const triagem = caso ? caso.triagens.find((item) => item.id === triagemId) ?? caso.triagens[0] ?? null : null;

  if (!caso || !triagem) return <div className="card"><div className="vazio"><strong>Nenhuma pesquisa guardada ainda.</strong>Abra um caso, salve o relato e use <b>Triar com fontes</b>: a triagem fica aqui, com os requisitos e a fonte de cada ponto.</div></div>;

  const leis = Array.from(new Set(base.map((fonte) => fonte.lei))).slice(0, 6);
  const pergunta = `O que a lei exige para o caso ${caso.cliente ? `de ${caso.cliente}` : `"${caso.titulo}"`} e o que já está comprovado?`;

  return <div className="assistant-layout">
    <aside className="context-panel">
      <div className="card-head"><h2>Contexto usado</h2><span className="status st-info">{casos.length === 1 ? "Caso atual" : `${totalDeTriagens} triagens`}</span></div>
      {casos.length > 1 && <div className="context-item"><label>Caso</label>
        <select className="select" value={caso.id} onChange={(evento) => { setCasoId(evento.target.value); setTriagemId(null); }} aria-label="Caso pesquisado">
          {casos.map((item) => <option key={item.id} value={item.id}>{item.cliente ? `${item.cliente} · ${item.titulo}` : item.titulo}</option>)}
        </select>
      </div>}
      {caso.triagens.length > 1 && <div className="context-item"><label>Triagem</label>
        <select className="select" value={triagem.id} onChange={(evento) => setTriagemId(evento.target.value)} aria-label="Data da triagem">
          {caso.triagens.map((item) => <option key={item.id} value={item.id}>{item.quando}</option>)}
        </select>
      </div>}
      <div className="context-item"><label>Assistida</label><strong>{caso.cliente ?? "Sem cliente vinculado"}</strong></div>
      <div className="context-item"><label>Matéria</label><strong>{triagem.area} · {triagem.tipo}</strong></div>
      <div className="context-item"><label>Fatos relevantes</label><strong>{triagem.resumo}</strong></div>
      <div className="context-item"><label>Documentos</label><strong>{triagem.documentosAPedir.length ? `${triagem.documentosAPedir.length} a pedir` : "Nenhum pendente na triagem"}</strong></div>
      <div className="context-item"><label>Fontes permitidas</label><strong>Acervo local: {leis.join(", ")}</strong></div>
      <div className="context-item"><label>Não autorizado</label><strong>Contar prazo, protocolar ou enviar comunicação sozinho</strong></div>
    </aside>
    <section className="research">
      <div className="research-head"><div className="eyebrow">Pergunta do advogado</div><h2>{pergunta}</h2><p className="small muted">Resposta construída para pesquisa e conferência, não para uso automático em peça. Triagem de {triagem.quando}.</p></div>
      <div className="answer">
        <h3>1. Cabimento no Juizado Especial</h3>
        <p>{triagem.cabeJec ? "Sim. " : "Não. "}{triagem.motivoJec}{triagem.encaminhamento ? ` Via adequada: ${triagem.encaminhamento}.` : ""}</p>
        {triagem.forca.aplicaveis > 0 && <div className="source">Força do caso · {triagem.forca.comprovados} de {triagem.forca.aplicaveis} requisitos comprovados · contagem do que está provado, não probabilidade de êxito</div>}

        <h3>2. Requisitos e a fonte de cada um</h3>
        {triagem.requisitos.length === 0 && <p>A triagem não listou requisitos para este caso.</p>}
        {triagem.requisitos.map((requisito) => {
          const estado = ESTADO_DO_REQUISITO[requisito.situacao] ?? { nome: requisito.situacao, tom: "st-neutral" };
          const fonte = fontes[requisito.fonte];
          return <div key={`${requisito.fonte}-${requisito.requisito}`} style={{ marginBottom: 10 }}>
            <p style={{ marginBottom: 4 }}><strong>{requisito.requisito}</strong> <span className={`status ${estado.tom}`}>{estado.nome}</span></p>
            <p style={{ marginBottom: 6 }}>{requisito.oQueComprova}</p>
            <div className="source">Fonte jurídica recuperada · <code>{requisito.fonte}</code>{fonte ? ` · ${fonte.lei}, art. ${fonte.artigo}` : " · trecho não encontrado no acervo"}</div>
          </div>;
        })}

        {triagem.fundamentos.length > 0 && <>
          <h3>3. Fundamentos citados</h3>
          {triagem.fundamentos.map((fundamento) => {
            const fonte = fontes[fundamento.fonte];
            return <div key={`${fundamento.fonte}-${fundamento.afirmacao}`} style={{ marginBottom: 8 }}><p style={{ marginBottom: 4 }}>{fundamento.afirmacao}</p><div className="source"><code>{fundamento.fonte}</code>{fonte ? ` · ${fonte.lei}, art. ${fonte.artigo}` : ""}</div></div>;
          })}
        </>}

        {(triagem.documentosAPedir.length > 0 || triagem.perguntasPendentes.length > 0) && <>
          <h3>{triagem.fundamentos.length > 0 ? "4" : "3"}. Documentos e perguntas ao cliente</h3>
          {triagem.documentosAPedir.length > 0 && <p><strong>Pedir:</strong> {triagem.documentosAPedir.join("; ")}.</p>}
          {triagem.perguntasPendentes.length > 0 && <p><strong>Perguntar:</strong> {triagem.perguntasPendentes.join(" ")}</p>}
        </>}

        <h3>Próximo passo</h3>
        <p>{triagem.orientacao}</p>
        {triagem.alertas.length > 0 && <div className="notice risk" style={{ marginBottom: 12 }}><strong>A conferir antes de confiar:</strong> {triagem.alertas.join(" ")}</div>}
        <div className="notice warn"><strong>Conferência obrigatória:</strong> a redação final, a seleção de precedentes e a estratégia pertencem ao advogado dativo. Resposta de apoio · custo {triagem.custo} · {triagem.modelo}.</div>
        <div className="inline" style={{ marginTop: 12 }}><Link href={`/escritorio/casos/${caso.id}?aba=relato`} className="btn btn-primary">Abrir no caso</Link><Link href={`/escritorio/casos/${caso.id}?aba=documentos`} className="btn btn-secondary">Ver documentos do caso</Link></div>
      </div>
    </section>
  </div>;
}
