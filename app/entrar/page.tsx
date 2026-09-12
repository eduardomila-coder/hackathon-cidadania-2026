import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { advogadoAtual } from "@/lib/sessao";
import { Formulario } from "./Formulario";
import "../escritorio/escritorio.css";

export const metadata: Metadata = { title: "Entrar — Ponto Dativo" };
export const dynamic = "force-dynamic";

// Só aceita voltar para um caminho deste site. Qualquer outra coisa (outro
// domínio, "//", vazio) cai no painel.
function destinoSeguro(voltar: string | string[] | undefined) {
  const valor = Array.isArray(voltar) ? voltar[0] : voltar;
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return "/escritorio";
  return valor;
}

export default async function Entrar({ searchParams }: { searchParams: Promise<{ voltar?: string | string[] }> }) {
  const { voltar } = await searchParams;
  const destino = destinoSeguro(voltar);
  if (await advogadoAtual()) redirect(destino);

  return <main className="pd-entrar">
    <section className="pd-entrar-caixa" aria-labelledby="entrar-titulo">
      <p className="md-eyebrow">Ponto Dativo · escritório do advogado</p>
      <h1 id="entrar-titulo">Entrar</h1>
      <p className="pd-entrar-intro">Use o usuário e a senha que a equipe do Hackathon passou para você.</p>
      <Formulario destino={destino} />
      <p className="pd-entrar-aviso">Ambiente de demonstração do Hackathon. Use dados fictícios ou de casos que você pode tratar; nada aqui é sistema oficial da OAB.</p>
      <Link href="/" className="pd-entrar-voltar">← Voltar ao site</Link>
    </section>
  </main>;
}
