import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { advogadoAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Central OAB/PR · Escritório Dativo" };
export const dynamic = "force-dynamic";

// Central da Advocacia Dativa, no desenho do protótipo. Os cartões apontam
// para o que existe: telas do próprio escritório ou o site público da OAB
// Paraná. Não há integração com sistemas da OAB/PR, e a tela diz isso.
const SITE = "https://www.oabpr.org.br";

const CARTOES = [
  { numero: "01", titulo: "Regulamento e legislação", texto: "Regras do programa, legislação estadual, decretos e orientações operacionais com versionamento.", link: "Abrir site da OAB/PR →", href: SITE, externo: true },
  { numero: "02", titulo: "Tabela de honorários", texto: "Consulta da tabela vigente e referências históricas, vinculadas ao módulo de honorários.", link: "Abrir módulo de honorários →", href: "/escritorio/honorarios" },
  { numero: "03", titulo: "Formação obrigatória", texto: "Status da formação e acesso aos cursos da ESA relacionados às listas da advocacia dativa.", link: "Ver minha formação →", href: "/escritorio/formacao" },
  { numero: "04", titulo: "Modelos e checklists", texto: "Materiais institucionais versionados para reduzir erros operacionais e retrabalho.", link: "Abrir biblioteca →", href: "/escritorio/documentos" },
  { numero: "05", titulo: "Comunicados", texto: "Alterações de regras, prazos institucionais, cursos e informações importantes para dativos.", link: "Ver no site da OAB/PR →", href: SITE, externo: true },
  { numero: "06", titulo: "Suporte OAB/PR", texto: "Canal único para dúvida operacional sobre o programa, cadastro, habilitação ou ferramenta.", link: "Dúvidas frequentes →", href: "/#duvidas" },
];

export default async function PaginaDaCentral() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/oabpr");

  return <>
    <section className="central-hero">
      <div><div className="eyebrow">OAB Paraná</div><h1>Central da Advocacia Dativa</h1><p>Normas, orientações, tabela, formação, avisos e suporte da OAB/PR reunidos no mesmo escritório digital em que o advogado conduz suas nomeações.</p></div>
      <div className="oab-word"><span>OAB</span>PR</div>
    </section>
    <div className="notice" style={{ marginBottom: 13 }}><strong>Sem conexão institucional nesta demonstração.</strong> Os cartões levam às telas do escritório ou ao site público da OAB Paraná; nenhuma nomeação, credencial, tabela ou comunicado é consultado em sistema da OAB/PR.</div>
    <div className="central-grid">
      {CARTOES.map((cartao) => <div className="central-card" key={cartao.numero}>
        <div className="num">{cartao.numero}</div>
        <h3>{cartao.titulo}</h3>
        <p>{cartao.texto}</p>
        {cartao.externo
          ? <a href={cartao.href} target="_blank" rel="noreferrer">{cartao.link}</a>
          : <Link href={cartao.href}>{cartao.link}</Link>}
      </div>)}
    </div>
  </>;
}
