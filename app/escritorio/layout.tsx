import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { advogadoAtual } from "@/lib/sessao";
import { AdvogadoProvider } from "./Advogado";
import { BotaoSair, Navegacao } from "./Navegacao";
import "./escritorio.css";

export const metadata: Metadata = { title: "Escritório — Ponto Dativo" };
export const dynamic = "force-dynamic";

// Casca de todas as telas do escritório. O proxy já barrou quem não tem
// cookie válido; aqui se confirma que a conta existe e continua ativa.
export default async function LayoutDoEscritorio({ children }: { children: React.ReactNode }) {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar");

  return <AdvogadoProvider advogado={advogado}>
    <div className="pd-escritorio">
      <header className="pd-cabecalho">
        <Link href="/escritorio" className="pd-marca">Ponto <span>Dativo</span><small>escritório do advogado</small></Link>
        <Navegacao />
        <div className="pd-conta">
          <div><strong>{advogado.nome}</strong><small>{advogado.oab}</small></div>
          <BotaoSair />
        </div>
      </header>
      <section className="md-faixa" aria-label="Estado do ambiente">
        <span>Ambiente de demonstração</span>
        <p>Ambiente de demonstração do Hackathon. Use dados fictícios ou de casos que você pode tratar; nada aqui é sistema oficial da OAB.</p>
      </section>
      <main className="pd-conteudo">{children}</main>
    </div>
  </AdvogadoProvider>;
}
