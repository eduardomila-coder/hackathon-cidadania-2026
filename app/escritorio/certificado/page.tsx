import { redirect } from "next/navigation";
import { assinaturasDo, listarCasosComDetalhes } from "@/lib/escritorio";
import { advogadoAtual } from "@/lib/sessao";
import { Certificado } from "./Certificado";
import "./certificado.css";

export const metadata = { title: "Certificado digital · Escritório Dativo" };
export const dynamic = "force-dynamic";

// Certificado digital do advogado. A página não fala com o certificado: quem
// fala é o navegador dele, com o conector que roda na própria máquina. O
// servidor só recebe o texto, o hash e a assinatura pronta — nunca a chave nem
// o PIN. É o mesmo desenho que a advocacia já usa com o token A3.
export default async function PaginaDoCertificado() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/certificado");

  const casos = listarCasosComDetalhes(advogado.id);
  const assinaturas = assinaturasDo(advogado.id);

  return <>
    <div className="page-head">
      <div>
        <div className="eyebrow">Identidade profissional</div>
        <h1>Certificado digital</h1>
        <p>Assine documentos do escritório com o seu certificado, sem que a chave privada ou o PIN saiam do seu computador. O escritório recebe o texto, o hash e a assinatura; a chave fica no token.</p>
      </div>
    </div>
    <Certificado
      endereco={process.env.APP_URL ?? "http://127.0.0.1:3000"}
      advogado={{ nome: advogado.nome, oab: advogado.oab }}
      casos={casos.map((caso) => ({ id: caso.id, titulo: caso.cliente ? `${caso.cliente.nome} · ${caso.titulo}` : caso.titulo }))}
      assinaturas={assinaturas.map((assinatura) => ({
        id: assinatura.id,
        documento: assinatura.documento,
        certificado: assinatura.certificado,
        origem: assinatura.origem,
        hash: assinatura.hash,
        quando: assinatura.quando,
      }))}
    />
  </>;
}
