import Link from "next/link";

export const metadata = { title: "Central OAB/PR · Escritório Dativo" };

export default function CentralOabPr() {
  return <section>
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">Institucional</p>
        <h1>Central OAB/PR indisponível</h1>
        <p className="pd-auxiliar">Esta demonstração não acessa sistemas, dados ou serviços da OAB/PR.</p>
      </div>
    </div>
    <section className="pd-cartao" aria-labelledby="oabpr-indisponivel">
      <div className="pd-cartao-cabeca"><h2 id="oabpr-indisponivel">Sem conexão institucional</h2><span className="pd-estado pd-estado-atencao">Indisponível</span></div>
      <div className="pd-cartao-corpo">
        <p className="pd-vazio"><strong>Não há integração com portais da OAB/PR.</strong>Esta tela não consulta nomeações, credenciais, agenda, pagamentos, tabelas ou qualquer informação institucional. Use os canais oficiais para confirmar atos, prazos e serviços.</p>
        <Link className="pd-botao pd-botao-secundario" href="/escritorio">Voltar aos casos</Link>
      </div>
    </section>
  </section>;
}
