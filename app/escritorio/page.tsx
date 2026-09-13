import { redirect } from "next/navigation";
import { listarCasosComDetalhes, listarClientes, resumoDoEscritorio } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { Painel } from "./casos/Painel";
import "./lista.css";

export const dynamic = "force-dynamic";

// Painel do advogado: lê tudo no servidor (arquivos em data/) e entrega ao
// componente cliente, que cuida de filtro, formulários e do estado do
// WhatsApp (esse vem pela API para não travar a página se a Evolution demorar).
export default async function PaginaDoPainel() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar");

  return <Painel
    resumo={resumoDoEscritorio(advogado.id)}
    casos={listarCasosComDetalhes(advogado.id)}
    clientes={listarClientes(advogado.id)}
  />;
}
