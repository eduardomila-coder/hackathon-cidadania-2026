import Link from "next/link";

export const metadata = { title: "Honorários · Ponto Dativo" };

export default function Honorarios() {
  return <section>
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">Financeiro</p>
        <h1>Honorários</h1>
        <p className="pd-auxiliar">Controle de informações que precisam de fonte e tabela aplicável.</p>
      </div>
    </div>
    <section className="pd-cartao" aria-labelledby="honorarios-vazio">
      <div className="pd-cartao-cabeca"><h2 id="honorarios-vazio">Ainda não calculado</h2><span className="pd-estado pd-estado-atencao">Sem tabela cadastrada</span></div>
      <div className="pd-cartao-corpo">
        <div className="pd-vazio">
          <strong>Não há valores para exibir.</strong>
          O escritório ainda não possui tabela de honorários nem integração institucional. Para não induzir erro, nenhum valor é estimado aqui.
          <br /><Link href="/escritorio">Voltar aos casos</Link>
        </div>
      </div>
    </section>
  </section>;
}
