"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { chamar, mensagemDeErro } from "../casos/api";
import { formatarMomento } from "../casos/formatos";
import { estadoDoConector, gerarChave, pedirAoConector, type Caminho } from "../conector";

type Caso = { id: string; titulo: string };
type AssinaturaNaTela = { id: string; documento: string; certificado: string; origem: "a3" | "demonstracao"; hash: string; quando: string };
type CertificadoDisponivel = { id: string; titular: string; validade?: string | null; origem: "a3" | "demonstracao" };

async function hashDe(texto: string) {
  const bytes = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function Certificado({ advogado, casos, assinaturas, endereco }: {
  advogado: { nome: string; oab: string };
  casos: Caso[];
  assinaturas: AssinaturaNaTela[];
  endereco: string;
}) {
  const router = useRouter();
  const [pareamento, setPareamento] = useState<{ criadoEm: string; ultimoContato: string | null } | null>(null);
  const [chaveNova, setChaveNova] = useState<string | null>(null);
  const [disponiveis, setDisponiveis] = useState<CertificadoDisponivel[]>([]);
  const [caminho, setCaminho] = useState<Caminho | null>(null);
  const [escolhido, setEscolhido] = useState("");
  const [procurando, setProcurando] = useState(true);
  const [casoId, setCasoId] = useState(casos[0]?.id ?? "");
  const [documento, setDocumento] = useState("Declaração de atuação como advogado dativo");
  const [conteudo, setConteudo] = useState("");
  const [assinando, setAssinando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const procurarCertificados = useCallback(async () => {
    try {
      setPareamento(await estadoDoConector());
      const { resultado, caminho: porOnde } = await pedirAoConector("certificados", {}, 8000);
      const lista = (resultado as { certificados?: CertificadoDisponivel[] }).certificados ?? [];
      setDisponiveis(lista);
      setEscolhido(lista[0]?.id ?? "");
      setCaminho(porOnde);
    } catch {
      setDisponiveis([]);
      setCaminho(null);
    } finally {
      setProcurando(false);
    }
  }, []);

  // Fora do ciclo de renderização: o conector pode não existir e a espera é da
  // rede, não do React.
  useEffect(() => {
    const marca = setTimeout(() => { void procurarCertificados(); }, 0);
    return () => clearTimeout(marca);
  }, [procurarCertificados]);

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

  async function ligarEsteComputador() {
    setErro(null);
    try {
      setChaveNova(await gerarChave());
      setPareamento(await estadoDoConector());
    } catch (e: unknown) {
      setErro(mensagemDeErro(e));
    }
  }

  async function assinar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setRecado(null);
    const texto = conteudo.trim() || textoPadrao();
    setAssinando(true);
    try {
      const hash = await hashDe(texto);
      const { resultado } = await pedirAoConector("assinar", { certificadoId: escolhido || "demonstracao", hash });
      const assinada = resultado as { assinatura?: string; origem?: "a3" | "demonstracao" };
      if (!assinada.assinatura) throw new Error("O conector não devolveu a assinatura.");

      await chamar("/api/escritorio/assinaturas", {
        metodo: "POST",
        corpo: {
          casoId: casoId || null,
          documento,
          conteudo: texto,
          hash,
          assinatura: assinada.assinatura,
          certificado: disponiveis.find((item) => item.id === escolhido)?.titular ?? "Certificado do advogado",
          origem: assinada.origem ?? "demonstracao",
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

  const achou = disponiveis.length > 0;
  const modoDemonstracao = disponiveis.some((item) => item.origem === "demonstracao");
  const comando = `ESCRITORIO=${endereco} CHAVE=${chaveNova ?? ""} node conector/conector.mjs`;

  return <>
    <section className="card">
      <div className="card-head">
        <h2>Conector no seu computador</h2>
        <span className={`status ${achou ? (modoDemonstracao ? "st-warn" : "st-ok") : "st-neutral"}`}>
          {procurando ? "Procurando" : achou ? (modoDemonstracao ? "Modo demonstração" : "Token A3 conectado") : "Não encontrado"}
        </span>
      </div>
      <div className="card-body">
        {!achou && !procurando && <>
          <div className="vazio">
            <strong>Nenhum conector respondeu.</strong>
            Ele é um programa pequeno que fica ao lado do seu token e assina o que o escritório pedir. Sem ele, o escritório continua funcionando: só não assina.
          </div>
          <p className="tiny muted">Nesta máquina basta <code className="mono">node conector/conector.mjs</code>. Abrindo o escritório pelo endereço público, o navegador não alcança o seu computador — aí ligue o conector à sua conta, no botão abaixo.</p>
        </>}

        {achou && <>
          <div className="agg">
            <div className="agg-item"><label>Certificados vistos</label><strong>{disponiveis.length}</strong></div>
            <div className="agg-item"><label>Modo</label><strong>{modoDemonstracao ? "Demonstração" : "Token A3"}</strong></div>
            <div className="agg-item"><label>Caminho</label><strong>{caminho === "local" ? "Direto nesta máquina" : "Pela sua conta"}</strong></div>
          </div>
          {modoDemonstracao && <div className="notice">
            <strong>Este certificado é de demonstração.</strong> Ele foi criado pelo conector na sua máquina para a tela poder ser mostrada, e <strong>não tem fé pública</strong>: não é ICP-Brasil, não vale para protocolo em tribunal e não substitui o seu token. Com o token plugado e o driver informado, o mesmo fluxo passa a usar o certificado de verdade, sem mudar nada aqui.
          </div>}
          <ul className="cert-lista">
            {disponiveis.map((certificado) => <li key={certificado.id}>
              <strong>{certificado.titular}</strong>
              {certificado.validade && <span className="tiny muted"> · vence em {certificado.validade}</span>}
            </li>)}
          </ul>
        </>}

        <div className="cert-acoes">
          <a className="btn btn-secondary btn-sm" href="/api/escritorio/conector/download">
            Baixar conector para Windows e macOS
          </a>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setProcurando(true); setErro(null); void procurarCertificados(); }} disabled={procurando}>
            {procurando ? "Procurando…" : "Procurar de novo"}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void ligarEsteComputador()}>
            {pareamento ? "Gerar chave nova" : "Ligar este computador"}
          </button>
          {pareamento && <span className="tiny muted">
            Ligado em {formatarMomento(pareamento.criadoEm, { comAno: false })}
            {pareamento.ultimoContato ? ` · último contato ${formatarMomento(pareamento.ultimoContato, { comAno: false })}` : " · ainda não falou"}
          </span>}
        </div>

        {chaveNova && <div className="notice" style={{ marginTop: 12 }}>
          <strong>Chave gerada. Ela aparece uma vez só.</strong> No seu computador, na pasta do projeto, rode:
          <code className="mono cert-comando">{comando}</code>
          A chave fica guardada aqui apenas como impressão digital: se vazar do servidor, não serve para nada. Gerar outra desliga o conector anterior.
        </div>}
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
          <button type="submit" className="btn btn-primary" disabled={!achou || assinando}>
            {assinando ? "Assinando no seu computador…" : "Assinar com o certificado"}
          </button>
        </form>
        <p className="tiny muted">O escritório calcula o hash do texto aqui no navegador, manda só o hash ao conector e guarda a assinatura que volta. A chave privada não passa pela rede e o servidor nunca a recebe.</p>
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
