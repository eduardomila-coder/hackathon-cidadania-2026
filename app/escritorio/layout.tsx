import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { advogadoAtual } from "@/lib/sessao";
import { resumoDoEscritorio } from "@/lib/escritorio";
import { AdvogadoProvider } from "./Advogado";
import { Barra, BotaoSair, Navegacao } from "./Navegacao";
import "./escritorio.css";

export const metadata: Metadata = { title: "Escritório · Escritório Dativo" };
export const dynamic = "force-dynamic";

// Iniciais para o avatar do rodapé do menu, como no protótipo.
function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return `${primeira}${ultima}`.toUpperCase() || "?";
}

// Casca de todas as telas do escritório, no desenho do protótipo: menu lateral
// fixo, topbar com breadcrumb e faixa de demonstração. O proxy já barrou quem
// não tem cookie válido; aqui se confirma que a conta existe e continua ativa.
export default async function LayoutDoEscritorio({ children }: { children: React.ReactNode }) {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar");

  const resumo = resumoDoEscritorio(advogado.id);

  return <AdvogadoProvider advogado={advogado}>
    <div className="pd-escritorio">
      <aside className="pd-menu">
        <Link href="/escritorio" className="pd-menu-marca" aria-label="Escritório Dativo, ir para o início">
          <span className="pd-simbolo" aria-hidden="true" />
          <span className="pd-menu-marca-texto">
            <strong>Escritório Dativo</strong>
            <small>OAB Paraná · Advocacia Dativa</small>
          </span>
        </Link>
        <Navegacao contagens={{
          casos: resumo.casosAbertos,
          prazos: resumo.prazosProximos.length,
          documentos: resumo.documentosPendentes,
          mensagens: resumo.mensagensNovas,
        }} />
        <div className="pd-menu-conta">
          <div className="pd-menu-quem">
            <span className="pd-avatar" aria-hidden="true">{iniciais(advogado.nome)}</span>
            <span className="pd-menu-quem-texto">
              <strong>{advogado.nome}</strong>
              <small>{advogado.oab}</small>
            </span>
          </div>
          <BotaoSair />
        </div>
      </aside>
      <div className="pd-coluna">
        <Barra />
        <section className="pd-faixa" aria-label="Aviso de demonstração">
          <strong>Demonstração</strong>
          <p>Dados fictícios. A decisão técnica, o prazo e o ato processual são sempre de responsabilidade do advogado. Este ambiente não é um sistema oficial.</p>
        </section>
        <main className="pd-conteudo">{children}</main>
      </div>
    </div>
  </AdvogadoProvider>;
}
