import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listarAdvogados } from "@/lib/contas";
import { listarCasos, listarNomeacoes } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Gestão do programa · Escritório Dativo" };
export const dynamic = "force-dynamic";

// Gestão do programa, no desenho do protótipo: perfil institucional separado,
// só com indicadores agregados. Os números são contagens reais deste servidor
// (contas e volumes), sem nenhum conteúdo de caso. O que o protótipo mostrava
// como integração (auditoria de conteúdo, publicação) fica marcado como exemplo.
export default async function PaginaDeGestao() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/gestao");

  const advogados = listarAdvogados();
  const ativos = advogados.filter((conta) => conta.ativo);
  const casos = ativos.flatMap((conta) => listarCasos(conta.id));
  const nomeacoes = ativos.flatMap((conta) => listarNomeacoes(conta.id));
  const abertos = casos.filter((caso) => caso.situacao !== "concluido").length;
  const percentual = (parte: number, todo: number) => todo ? `${Math.round((parte / todo) * 100)}%` : "—";

  return <>
    <div className="governance-head"><div className="eyebrow" style={{ color: "var(--red-700)" }}>Perfil institucional separado</div><h1>Gestão do programa</h1><p>A OAB/PR mantém a plataforma, a governança de conteúdo e as integrações, mas o desenho deve respeitar segredo profissional e minimização de acesso. Gestão institucional não significa acesso irrestrito ao conteúdo dos casos.</p></div>
    <div className="gov-grid">
      <div className="stack">
        <section className="card"><div className="card-head"><h2>Indicadores agregados</h2><span className="status st-info">Sem conteúdo de casos</span></div><div className="card-body">
          <div className="agg">
            <div className="agg-item"><label>Advogados ativos</label><strong>{ativos.length}</strong></div>
            <div className="agg-item"><label>Contas com caso aberto</label><strong>{percentual(ativos.filter((conta) => listarCasos(conta.id).some((caso) => caso.situacao !== "concluido")).length, ativos.length)}</strong></div>
            <div className="agg-item"><label>Casos abertos</label><strong>{abertos}</strong></div>
            <div className="agg-item"><label>Nomeações registradas</label><strong>{nomeacoes.length}</strong></div>
          </div>
          <div className="notice">Contagens deste servidor de demonstração, sem nome, processo ou texto de caso. Conteúdo de mensagens, estratégia e documentos não aparece aqui por desenho.</div>
        </div></section>
        <section className="card"><div className="card-head"><h2>Auditoria de plataforma</h2><span className="status st-neutral">Exemplo</span></div><div className="card-body">
          <div className="audit-row"><span className="mono">13/09 01:12</span><strong>Base normativa atualizada para versão 2026.09.13</strong><span>Conteúdo</span></div>
          <div className="audit-row"><span className="mono">12/09 18:42</span><strong>Nova versão do checklist de honorários publicada</strong><span>Honorários</span></div>
          <div className="audit-row"><span className="mono">12/09 11:05</span><strong>Integração ESA sincronizada</strong><span>Habilitações</span></div>
          <p className="tiny muted" style={{ margin: "10px 0 0" }}>Linhas ilustrativas: a auditoria de conteúdo institucional depende de integração que não existe nesta demonstração.</p>
        </div></section>
      </div>
      <aside className="stack">
        <section className="card"><div className="card-head"><h2>Governança</h2></div><div className="card-body">
          <div className="policy"><strong>Conteúdo jurídico versionado</strong><p>Cada orientação publicada tem data, responsável e histórico.</p></div>
          <div className="policy"><strong>Privilégio mínimo</strong><p>Equipe mantenedora vê somente o necessário para operar a plataforma.</p></div>
          <div className="policy"><strong>Segredo profissional</strong><p>Dados do caso permanecem segregados por advogado e finalidade.</p></div>
          <div className="policy"><strong>IA supervisionada</strong><p>Prompts, fontes permitidas e versões do assistente são auditáveis.</p></div>
        </div></section>
        <section className="card"><div className="card-head"><h2>Conteúdo institucional</h2><span className="status st-neutral">Exemplo</span></div><div className="card-body stack">
          <button type="button" className="btn btn-secondary btn-block" disabled>Gerenciar regulamento</button>
          <button type="button" className="btn btn-secondary btn-block" disabled>Publicar comunicado</button>
          <button type="button" className="btn btn-secondary btn-block" disabled>Atualizar checklist</button>
          <button type="button" className="btn btn-secondary btn-block" disabled>Gerenciar integrações</button>
        </div></section>
      </aside>
    </div>
  </>;
}
