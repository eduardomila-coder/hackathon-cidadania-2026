import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { dossieDoCaso } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { PaginaDoCaso } from "./Caso";
import "../../casos.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const advogado = await advogadoAtual();
  const dossie = advogado ? dossieDoCaso(advogado.id, id) : null;
  return { title: dossie ? `${dossie.caso.titulo} — Ponto Dativo` : "Caso — Ponto Dativo" };
}

// A página do caso lê o dossiê inteiro no servidor; o componente cliente
// cuida das edições e recarrega pela API quando precisa. Caso de outro
// advogado (ou inexistente) é 404: para quem não é dono, não existe.
export default async function Pagina({ params }: Props) {
  const { id } = await params;
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar");
  const dossie = dossieDoCaso(advogado.id, id);
  if (!dossie) notFound();
  return <PaginaDoCaso inicial={dossie} />;
}
