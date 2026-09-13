import Link from "next/link";

export const metadata = { title: "Formação · Escritório Dativo" };

export default function Formacao() {
  return <section>
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">Formação</p>
        <h1>Formação indisponível</h1>
        <p className="pd-auxiliar">Não há cursos, inscrições ou trilhas de capacitação conectados a este ambiente demonstrativo.</p>
      </div>
    </div>
    <section className="pd-cartao" aria-labelledby="formacao-indisponivel">
      <div className="pd-cartao-cabeca"><h2 id="formacao-indisponivel">Sem catálogo institucional</h2><span className="pd-estado pd-estado-atencao">Indisponível</span></div>
      <div className="pd-cartao-corpo">
        <p className="pd-vazio"><strong>Esta área não possui integração institucional.</strong>O Escritório Dativo não consulta oferta de cursos, presença, certificados ou dados de formação. Procure os canais oficiais da instituição responsável para essas informações.</p>
        <Link className="pd-botao pd-botao-secundario" href="/escritorio">Voltar aos casos</Link>
      </div>
    </section>
  </section>;
}
