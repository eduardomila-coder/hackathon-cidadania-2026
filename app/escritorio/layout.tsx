import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { advogadoAtual } from "@/lib/sessao";
import { listarCasos, listarNomeacoes, resumoDoEscritorio } from "@/lib/escritorio";
import { AdvogadoProvider } from "./Advogado";
import { Casca } from "./Navegacao";
import "./escritorio.css";

export const metadata: Metadata = { title: "Escritório · Escritório Dativo" };
export const dynamic = "force-dynamic";

// Casca de todas as telas do escritório, no desenho do protótipo: menu lateral
// fixo, topbar com breadcrumb e faixa de demonstração. O proxy já barrou quem
// não tem cookie válido; aqui se confirma que a conta existe e continua ativa.
export default async function LayoutDoEscritorio({ children }: { children: React.ReactNode }) {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar");

  const resumo = resumoDoEscritorio(advogado.id);
  // Nomeações em aberto: registros próprios abertos mais os casos de nomeação
  // ainda novos (os de antes da entidade própria existir).
  const nomeacoesAbertas = listarNomeacoes(advogado.id, { estado: "aberta" }).length
    + listarCasos(advogado.id).filter((caso) => caso.origem === "nomeacao" && caso.situacao === "novo").length;

  return <AdvogadoProvider advogado={advogado}>
    <Casca contagens={{ nomeacoes: nomeacoesAbertas, prazos: resumo.prazosProximos.length, mensagens: resumo.mensagensNovas }}>
      {children}
    </Casca>
  </AdvogadoProvider>;
}
