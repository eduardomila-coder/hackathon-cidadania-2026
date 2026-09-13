import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { advogadoAtual } from "@/lib/sessao";
import { Formulario } from "./Formulario";

export const metadata: Metadata = { title: "Entrar · Escritório Dativo" };
export const dynamic = "force-dynamic";

// Só aceita voltar para um caminho deste site. Qualquer outra coisa (outro
// domínio, "//", vazio) cai no painel.
function destinoSeguro(voltar: string | string[] | undefined) {
  const valor = Array.isArray(voltar) ? voltar[0] : voltar;
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return "/escritorio";
  return valor;
}

// Entrada no escritório, com a marcação do protótipo: painel institucional à
// esquerda e o acesso profissional à direita. Diferente do protótipo, o acesso
// é por usuário e senha criados para o evento: não há SSO com a OAB/PR, e a
// caixa diz isso em vez de fingir.
export default async function Entrar({ searchParams }: { searchParams: Promise<{ voltar?: string | string[] }> }) {
  const { voltar } = await searchParams;
  const destino = destinoSeguro(voltar);
  if (await advogadoAtual()) redirect(destino);

  return <div className="login">
    <aside className="login-aside">
      <div className="oab-lockup">
        <div className="oab-word"><span>OAB</span>PR</div>
        <div className="oab-text"><strong>OAB Paraná</strong><small>Advocacia Dativa</small></div>
      </div>
      <div className="product-lockup">
        <div className="product-kicker">OAB Paraná · Advocacia Dativa</div>
        <h1>Escritório Dativo</h1>
        <p>Ambiente de trabalho para organização das nomeações, casos, comunicações e honorários da advocacia dativa.</p>
      </div>
      <div className="login-foot">Escritório Dativo · ambiente de demonstração · dados fictícios</div>
    </aside>
    <main className="login-main">
      <div className="login-box">
        <div className="eyebrow">Acesso profissional</div>
        <h1>Entrar no Escritório Dativo</h1>
        <p className="small muted">Ambiente profissional da Advocacia Dativa, destinado a advogados habilitados no programa.</p>
        <div className="sso-box">
          <div className="sso-title">Acesso do escritório</div>
          <div className="small muted">Nesta demonstração, o usuário e a senha foram criados para o evento. A validação de habilitação perante a OAB/PR ainda não existe e não é simulada.</div>
          <Formulario destino={destino} />
        </div>
        <div className="security-row">
          <div className="security-mini"><strong>Conta única</strong>Perfil vinculado ao usuário do evento.</div>
          <div className="security-mini"><strong>Segredo profissional</strong>Casos isolados por advogado.</div>
          <div className="security-mini"><strong>Rastreabilidade</strong>Ações relevantes ficam registradas.</div>
        </div>
        <Link href="/" className="login-voltar">← Voltar ao site</Link>
      </div>
    </main>
  </div>;
}
