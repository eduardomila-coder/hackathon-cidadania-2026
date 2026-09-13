import { redirect } from "next/navigation";
import { advogadoAtual } from "@/lib/sessao";
import { Projudi } from "./Projudi";
import "../certificado/certificado.css";

export const metadata = { title: "PROJUDI · Escritório Dativo" };
export const dynamic = "force-dynamic";

// Consulta ao PROJUDI pelo acesso do próprio advogado. Como no certificado, o
// servidor do escritório não participa: quem fala com o tribunal é o serviço
// que roda na máquina dele, e o navegador faz a ponte. Nenhuma credencial do
// tribunal passa por aqui.
export default async function PaginaDoProjudi() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/projudi");

  return <>
    <div className="page-head">
      <div>
        <div className="eyebrow">Tribunal</div>
        <h1>PROJUDI</h1>
        <p>Consulte os processos em que você é o procurador, com o seu próprio acesso ao tribunal. O escritório não guarda senha, PIN nem sessão: tudo acontece no seu computador.</p>
      </div>
    </div>
    <div className="notice" style={{ margin: "0 0 18px" }}>
      <strong>Onde o tribunal pede CAPTCHA, quem resolve é você.</strong> O Escritório Dativo não tem serviço de quebra de desafio: quando o PROJUDI exigir, ele avisa e manda você abrir o termo no seu navegador. A ferramenta assiste o advogado, não se passa por ele.
    </div>
    <Projudi />
  </>;
}
