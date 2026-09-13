import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { advogadoAtual } from "@/lib/sessao";
import { resumoDoEscritorio } from "@/lib/escritorio";
import { AdvogadoProvider } from "./Advogado";
import { BotaoSair, Navegacao } from "./Navegacao";
import "./escritorio.css";

export const metadata: Metadata = { title: "Escritório · Ponto Dativo" };
export const dynamic = "force-dynamic";

// Casca de todas as telas do escritório. O proxy já barrou quem não tem
// cookie válido; aqui se confirma que a conta existe e continua ativa.
export default async function LayoutDoEscritorio({ children }: { children: React.ReactNode }) {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar");

  const resumo = resumoDoEscritorio(advogado.id);

  return <AdvogadoProvider advogado={advogado}>
    <div className="pd-escritorio">
      <aside className="pd-menu">
        <Link href="/escritorio" className="pd-menu-marca" aria-label="Ponto Dativo, ir para casos">
          <svg className="pd-menu-simbolo" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="M4 5.5h12.5l4.5 4.5v12.5H4z" fill="#0873B9" />
            <path d="M8 10h8M8 14h5.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M17 5.5V10h4" stroke="#D7493F" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <span>Ponto <b>Dativo</b><small>Escritório do advogado</small></span>
        </Link>
        <Navegacao contagens={{
          casos: resumo.casosAbertos,
          prazos: resumo.prazosProximos.length,
          documentos: resumo.documentosPendentes,
          mensagens: resumo.mensagensNovas,
        }} />
        <div className="pd-menu-conta">
          <div className="pd-menu-quem"><strong>{advogado.nome}</strong><small>{advogado.oab}</small></div>
          <BotaoSair />
        </div>
      </aside>
      <div className="pd-coluna">
        <section className="pd-faixa" aria-label="Estado do ambiente">
          <strong>Demonstração</strong>
          <p>Use dados fictícios ou casos que você pode tratar. Este ambiente não é um sistema oficial.</p>
        </section>
        <main className="pd-conteudo">{children}</main>
      </div>
    </div>
  </AdvogadoProvider>;
}
