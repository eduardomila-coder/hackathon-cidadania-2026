import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { nomeacaoPorId } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { PaginaDaNomeacao } from "./Nomeacao";
import "../nomeacoes.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const advogado = await advogadoAtual();
  const nomeacao = advogado ? nomeacaoPorId(advogado.id, id) : null;
  return { title: nomeacao ? `Nomeação · ${nomeacao.camposExtraidos.ato ?? "Escritório Dativo"}` : "Nomeação · Escritório Dativo" };
}

// O registro é lido no servidor para manter o isolamento por advogado. As
// mudanças de checklist e de estado seguem pela API no componente cliente.
export default async function Pagina({ params }: Props) {
  const { id } = await params;
  const advogado = await advogadoAtual();
  if (!advogado) redirect(`/entrar?voltar=/escritorio/nomeacoes/${id}`);
  const nomeacao = nomeacaoPorId(advogado.id, id);
  if (!nomeacao) notFound();
  return <PaginaDaNomeacao inicial={nomeacao} />;
}
