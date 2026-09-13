import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listarCasosComDetalhes, listarClientes } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { RegistrarNomeacao } from "../RegistrarNomeacao";
import { ListaDeCasos } from "./ListaDeCasos";

export const metadata: Metadata = { title: "Casos · Escritório Dativo" };
export const dynamic = "force-dynamic";

// Todos os casos do advogado, por situação. O caso é o objeto principal da
// plataforma: daqui se entra no workspace de cada um.
export default async function PaginaDeCasos() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/casos");

  const casos = listarCasosComDetalhes(advogado.id);
  const clientes = listarClientes(advogado.id);

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Casos</div><h1>Casos</h1><p>Cada caso reúne processo, pessoa assistida, providências, documentos, mensagens e histórico. A situação é a que você marcou; o prazo é o informado, a conferir no processo oficial.</p></div>
      <div className="inline">
        <Link href="/escritorio/processos" className="btn btn-quiet">Consultar processo</Link>
        <RegistrarNomeacao clientes={clientes} />
      </div>
    </div>
    <ListaDeCasos casos={casos.map((caso) => ({
      id: caso.id,
      titulo: caso.titulo,
      cliente: caso.cliente?.nome ?? null,
      origem: caso.origem,
      processo: caso.processo,
      orgao: caso.orgao,
      prazo: caso.prazo,
      situacao: caso.situacao,
      ultimo: caso.ultimoRegistro ? { texto: caso.ultimoRegistro.texto, quando: caso.ultimoRegistro.quando } : null,
    }))} />
  </>;
}
