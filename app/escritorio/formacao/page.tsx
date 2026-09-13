import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { advogadoAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Formação · Escritório Dativo" };
export const dynamic = "force-dynamic";

// Formação e habilitações no desenho do protótipo. Não existe integração com a
// ESA nem com o cadastro da OAB/PR: a trilha abaixo é ilustrativa e diz isso.
// O que é verdade aqui é a conta do evento e a sua OAB.
const TRILHA = [
  { numero: "01", titulo: "Formação Deontológica", sub: "Componente da formação obrigatória", carga: "4h" },
  { numero: "02", titulo: "Formação Continuada em Direito Civil", sub: "Área principal escolhida", carga: "16h" },
  { numero: "03", titulo: "Direito de Família e Sucessões", sub: "Habilita lista especializada", carga: "5h" },
  { numero: "04", titulo: "Infância e Juventude · matéria cível", sub: "Especialização disponível", carga: "2h" },
];

export default async function PaginaDeFormacao() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/formacao");

  return <>
    <div className="training-hero">
      <div>
        <div className="eyebrow">Formação e habilitações</div>
        <h1>Formação e habilitações</h1>
        <p className="small muted">O Escritório Dativo transforma requisitos do programa em informação operacional: o advogado visualiza suas habilitações, formação concluída e eventuais pendências para permanência nas listas.</p>
        <div className="inline" style={{ marginTop: 12 }}><span className="status st-ok">Conta ativa · {advogado.oab}</span><span className="status st-neutral">Habilitações não consultadas</span></div>
      </div>
      <div className="training-score">
        <label>Carga obrigatória concluída</label>
        <strong>—</strong>
        <div className="profile-progress"><span style={{ width: "0%" }} /></div>
        <div className="tiny muted">Sem integração com a ESA ou com o cadastro da OAB/PR nesta demonstração.</div>
      </div>
    </div>
    <div className="notice" style={{ marginBottom: 13 }}><strong>Conteúdo ilustrativo.</strong> A trilha abaixo mostra como a formação apareceria com integração institucional autorizada. Nenhum curso, presença ou certificado é consultado ou gravado aqui.</div>
    <section className="card">
      <div className="card-head"><h2>Minha trilha</h2><a className="btn btn-secondary btn-sm" href="https://www.oabpr.org.br" target="_blank" rel="noreferrer">Abrir OAB Paraná</a></div>
      {TRILHA.map((curso, indice) => <div className="course-row" key={curso.numero}>
        <div className="course-number">{curso.numero}</div>
        <div><strong>{curso.titulo}</strong><p>{curso.sub}</p></div>
        <div><span className={`status ${indice < 3 ? "st-neutral" : "st-neutral"}`}>Exemplo</span></div>
        <div className="small">{curso.carga}</div>
        <Link href="/escritorio/oabpr" className="btn btn-quiet btn-sm">Ver na Central</Link>
      </div>)}
    </section>
  </>;
}
