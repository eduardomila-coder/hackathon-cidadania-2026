"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { chamar, mensagemDeErro } from "../casos/api";
import { formatarMomento } from "../casos/formatos";

// O conector roda na máquina do advogado e escuta só em 127.0.0.1. Quem fala
// com ele é este navegador, nunca o servidor: por isso a chave e o PIN não
// atravessam a rede. Se o conector não estiver rodando, a tela diz como ligar.
const CONECTOR = "http://127.0.0.1:8766";

type Caso = { id: string; titulo: string };
type AssinaturaNaTela = { id: string; documento: string; certificado: string; origem: "a3" | "demonstracao"; hash: string; quando: string };
type CertificadoDisponivel = { id: string; titular: string; validade?: string | null; origem: "a3" | "demonstracao" };
type Saude = { conector: string; versao: string; modo: "a3" | "demonstracao" };

async function hashDe(texto: string) {
  const bytes = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function Certificado({ advogado, casos, assinaturas }: {
  advogado: { nome: string; oab: string };
  casos: Caso[];
  assinaturas: AssinaturaNaTela[];
}) {
  const router = useRouter();
  const [saude, setSaude] = useState<Saude | null>(null);
  const [procurando, setProcurando] = useState(true);
  const [disponiveis, setDisponiveis] = useState<CertificadoDisponivel[]>([]);
  const [escolhido, setEscolhido] = useState("");
  const [casoId, setCasoId] = useState(casos[0]?.id ?? "");
  const [documento, setDocumento] = useState("Declaração de atuação como advogado dativo");
  const [conteudo, setConteudo] = useState("");
  const [assinando, setAssinando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  // Sem `setState` no começo: quando isto roda dentro do efeito, mudar estado de
  // forma síncrona dispara renderização em cascata (o lint reclama, com razão).
  // O botão é que marca "procurando" antes de chamar.
  const procurarConector = useCallback(async () => {
    try {
      const estado = await fetch(`${CONECTOR}/saude`).then((r) => r.json()) as Saude;
      setSaude(estado);
      const lista = await fetch(`${CONECTOR}/certificados`).then((r) => r.json()) as { certificados: CertificadoDisponivel[] };
      setDisponiveis(lista.certificados ?? []);
      setEscolhido((lista.certificados ?? [])[0]?.id ?? "");
    } catch {
      setSaude(null);
      setDisponiveis([]);
    } finally {
      setProcurando(false);
    }
  }, []);

  // A procura sai do ciclo de renderização de propósito: o conector pode não
  // existir nesta máquina e a resposta demora o que a rede local demorar; o
  // React não deve ficar preso a isso nem renderizar em cascata por causa dele.
  useEffect(() => {
    const marca = setTimeout(() => { void procurarConector(); }, 0);
    return () => clearTimeout(marca);
  }, [procurarConector]);

  // O texto que vai ser assinado. Fica à vista, inteiro, antes de assinar:
  // ninguém assina o que não leu.
  const textoPadrao = () => {
    const caso = casos.find((item) => item.id === casoId);
    const data = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    return [
      `${advogado.nome}, inscrito na ${advogado.oab}, declara que atua como advogado dativo no caso a seguir.`,
      caso ? `Caso: ${caso.titulo}.` : "Caso não vinculado.",
      `Declaração emitida em ${data}, pelo Escritório Dativo.`,
      "O prazo e o ato processual permanecem sob responsabilidade do advogado, conferidos no processo oficial.",
    ].join("\n");
  };

  async function assinar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setRecado(null);
    const texto = conteudo.trim() || textoPadrao();
    setAssinando(true);
    try {
      const hash = await hashDe(texto);
      const resposta = await fetch(`${CONECTOR}/assinar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ certificadoId: escolhido, hash }),
      });
      const assinada = await resposta.json() as { assinatura?: string; origem?: "a3" | "demonstracao"; erro?: string };
      if (!resposta.ok || !assinada.assinatura) throw new Error(assinada.erro ?? "O conector não conseguiu assinar.");

      await chamar("/api/escritorio/assinaturas", {
        metodo: "POST",
        corpo: {
          casoId: casoId || null,
          documento,
          conteudo: texto,
          hash,
          assinatura: assinada.assinatura,
          certificado: disponiveis.find((item) => item.id === escolhido)?.titular ?? "Certificado do advogado",
          origem: assinada.origem ?? saude?.modo ?? "demonstracao",
        },
      });
      setRecado("Documento assinado e guardado no caso.");
      setConteudo("");
      router.refresh();
    } catch (e: unknown) {
      setErro(mensagemDeErro(e));
    } finally {
      setAssinando(false);
    }
  }

  const modoDemonstracao = saude?.modo === "demonstracao";

  return <>
    <section className="card">
      <div className="card-head">
        <h2>Conector no seu computador</h2>
        <span className={`status ${saude ? (modoDemonstracao ? "st-warn" : "st-ok") : "st-neutral"}`}>
          {procurando ? "Procurando" : saude ? (modoDemonstracao ? "Modo demonstração" : "Token A3 conectado") : "Não encontrado"}
        </span>
      </div>
      <div className="card-body">
        {!saude && !procurando && <>
          <div className="vazio">
            <strong>O conector não está rodando nesta máquina.</strong>
            Ele é um programa pequeno que fica ao lado do seu token e assina o que o escritório pedir. Sem ele, o escritório continua funcionando: só não assina.
          </div>
          <p className="tiny muted">Para ligar, na pasta do projeto: <code className="mono">node conector/conector.mjs</code>. Com token A3, aponte o driver: <code className="mono">PKCS11=/caminho/do/driver.so node conector/conector.mjs</code>.</p>
        </>}

        {saude && <>
          <div className="agg">
            <div className="agg-item"><label>Conector</label><strong>versão {saude.versao}</strong></div>
            <div className="agg-item"><label>Modo</label><strong>{modoDemonstracao ? "Demonstração" : "Token A3"}</strong></div>
            <div className="agg-item"><label>Certificados vistos</label><strong>{disponiveis.length}</strong></div>
          </div>
          {modoDemonstracao && <div className="notice">
            <strong>Este certificado é de demonstração.</strong> Ele foi criado pelo conector nesta máquina para a tela poder ser mostrada, e <strong>não tem fé pública</strong>: não é ICP-Brasil, não vale para protocolo em tribunal e não substitui o seu token. Com o token plugado e o driver informado, o mesmo fluxo passa a usar o certificado de verdade, sem mudar nada aqui.
          </div>}
          <ul className="cert-lista">
            {disponiveis.map((certificado) => <li key={certificado.id}>
              <strong>{certificado.titular}</strong>
              {certificado.validade && <span className="tiny muted"> · vence em {certificado.validade}</span>}
            </li>)}
          </ul>
        </>}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setProcurando(true); setErro(null); void procurarConector(); }} disabled={procurando}>
          {procurando ? "Procurando…" : "Procurar de novo"}
        </button>
      </div>
    </section>

    <section className="card">
      <div className="card-head"><h2>Assinar um documento do escritório</h2></div>
      <div className="card-body">
        <form onSubmit={assinar} className="cert-form">
          <label>
            <span>Caso</span>
            <select value={casoId} onChange={(e) => setCasoId(e.target.value)}>
              <option value="">Sem vínculo com caso</option>
              {casos.map((caso) => <option key={caso.id} value={caso.id}>{caso.titulo}</option>)}
            </select>
          </label>
          <label>
            <span>O que está sendo assinado</span>
            <input value={documento} onChange={(e) => setDocumento(e.target.value)} maxLength={200} required />
          </label>
          <label>
            <span>Texto (em branco usa a declaração padrão, mostrada abaixo)</span>
            <textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={5} placeholder={textoPadrao()} />
          </label>
          {erro && <p className="cert-erro">{erro}</p>}
          {recado && <p className="cert-ok">{recado}</p>}
          <button type="submit" className="btn btn-primary" disabled={!saude || assinando || !escolhido}>
            {assinando ? "Assinando no seu computador…" : "Assinar com o certificado"}
          </button>
        </form>
        <p className="tiny muted">O escritório calcula o hash do texto aqui no navegador, manda só o hash para o conector e guarda a assinatura que volta. A chave privada não passa pela rede e o servidor nunca a recebe.</p>
      </div>
    </section>

    <section className="card">
      <div className="card-head"><h2>Assinaturas feitas</h2><span className="status st-info">{assinaturas.length}</span></div>
      <div className="card-body">
        {assinaturas.length === 0 && <div className="vazio"><strong>Nada assinado ainda.</strong>O que você assinar aparece aqui e no histórico do caso.</div>}
        {assinaturas.map((assinatura) => <div className="audit-row" key={assinatura.id}>
          <span className="mono">{formatarMomento(assinatura.quando, { comAno: false })}</span>
          <strong>{assinatura.documento}</strong>
          <span className={`status ${assinatura.origem === "a3" ? "st-ok" : "st-warn"}`}>{assinatura.origem === "a3" ? "Token A3" : "Demonstração"}</span>
        </div>)}
        {assinaturas.length > 0 && <p className="tiny muted">Cada assinatura guarda o texto e o hash, para conferência depois. Validar a cadeia ICP-Brasil é trabalho de quem recebe a peça; o escritório não afirma validade que não pode conferir.</p>}
      </div>
    </section>
  </>;
}
