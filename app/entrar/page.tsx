import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { advogadoAtual } from "@/lib/sessao";
import { Formulario } from "./Formulario";
import "../escritorio/escritorio.css";

export const metadata: Metadata = { title: "Entrar · Escritório Dativo" };
export const dynamic = "force-dynamic";

// Só aceita voltar para um caminho deste site. Qualquer outra coisa (outro
// domínio, "//", vazio) cai no painel.
function destinoSeguro(voltar: string | string[] | undefined) {
  const valor = Array.isArray(voltar) ? voltar[0] : voltar;
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return "/escritorio";
  return valor;
}

// Entrada no escritório, no desenho do protótipo: painel institucional à
// esquerda e o acesso profissional à direita. Diferente do protótipo, o acesso
// aqui é por usuário e senha criados para o evento; não há SSO com a OAB/PR, e
// a tela não finge que existe.
export default async function Entrar({ searchParams }: { searchParams: Promise<{ voltar?: string | string[] }> }) {
  const { voltar } = await searchParams;
  const destino = destinoSeguro(voltar);
  if (await advogadoAtual()) redirect(destino);

  return <main className="pd-login">
    <aside className="pd-login-lateral">
      <div className="pd-oab-lockup">
        <span className="pd-oab-marca"><b>OAB</b>PR</span>
        <span className="pd-oab-texto"><strong>OAB Paraná</strong><small>Advocacia Dativa</small></span>
      </div>
      <div className="pd-login-produto">
        <p className="pd-login-kicker">OAB Paraná · Advocacia Dativa</p>
        <h1>Escritório Dativo</h1>
        <p>Ambiente de trabalho para organização das nomeações, casos, comunicações e honorários da advocacia dativa.</p>
      </div>
      <p className="pd-login-rodape">Escritório Dativo · ambiente de demonstração · dados fictícios</p>
    </aside>

    <section className="pd-login-principal">
      <div className="pd-login-caixa">
        <p className="pd-eyebrow">Acesso profissional</p>
        <h2>Entrar no Escritório Dativo</h2>
        <p className="pd-login-intro">Ambiente profissional da Advocacia Dativa, destinado a advogados habilitados no programa.</p>

        <div className="pd-login-identidade">
          <strong>Acesso do escritório</strong>
          <p>Nesta demonstração, o usuário e a senha foram criados para o evento. A validação de habilitação perante a OAB/PR ainda não existe e não é simulada.</p>
        </div>

        <Formulario destino={destino} />

        <div className="pd-login-seguranca">
          <div><strong>Conta única</strong>Perfil vinculado ao usuário do evento.</div>
          <div><strong>Segredo profissional</strong>Casos isolados por advogado.</div>
          <div><strong>Rastreabilidade</strong>Ações relevantes ficam registradas.</div>
        </div>

        <p className="pd-login-aviso">Ambiente de demonstração. Use dados fictícios ou casos que você pode tratar. Não é um sistema oficial.</p>
        <Link href="/" className="pd-login-voltar">← Voltar ao site</Link>
      </div>
    </section>
  </main>;
}
