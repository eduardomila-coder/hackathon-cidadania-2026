import { redirect } from "next/navigation";
import { listarCasos } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { Honorarios } from "./Honorarios";
import "./honorarios.css";

export const metadata = { title: "Honorários · Escritório Dativo" };
export const dynamic = "force-dynamic";

export default async function PaginaDeHonorarios() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/honorarios");

  const casos = listarCasos(advogado.id).map((caso) => ({ id: caso.id, titulo: caso.titulo }));
  return <Honorarios casos={casos} />;
}
