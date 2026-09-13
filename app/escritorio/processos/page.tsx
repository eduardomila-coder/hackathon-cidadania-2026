import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dataJudConfigurado } from "@/lib/datajud";
import { listarCasos, processosDo } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { Processos } from "./Processos";
import "../processos.css";

export const metadata: Metadata = { title: "Processos · Ponto Dativo" };
export const dynamic = "force-dynamic";

// Processos do advogado logado, com o último andamento público que o DataJud
// devolveu e o caso a que cada um está vinculado. A lista vem do servidor;
// o componente cliente cuida da consulta e recarrega a lista ao terminar.
export default async function PaginaDeProcessos() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/processos");

  const processos = processosDo(advogado.id);
  const casos = listarCasos(advogado.id).map((caso) => ({ id: caso.id, titulo: caso.titulo, processo: caso.processo }));

  return <div className="pd-processos">
    <section className="pd-cartao pd-processos-cabeca">
      <p className="md-eyebrow">Processos</p>
      <h1>Andamento público dos seus processos</h1>
      <p>Consulta pontual ao DataJud público do CNJ, base do TJPR, pelo número do processo. Mostra classe, órgão julgador e o último andamento disponível, e guarda o resultado aqui para você.</p>
      <p>Não é intimação nem fonte de prazo: o prazo se confere no processo oficial. Processos em segredo de justiça não aparecem.</p>
    </section>
    <Processos processos={processos} casos={casos} configurado={dataJudConfigurado()} />
  </div>;
}
