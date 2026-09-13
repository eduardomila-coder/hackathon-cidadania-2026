"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

// O serviço de consulta roda na máquina do advogado, ao lado do conector de
// certificado, e escuta só em 127.0.0.1. O PIN, a senha e o código do
// autenticador vão deste navegador direto para lá: não passam pelo servidor do
// escritório, que nunca os vê nem os guarda.
const CONSULTA = "http://127.0.0.1:8767";

type Estado = { consulta: string; versao: string; autenticado: boolean };
type ProcessoNaCarteira = { numero?: string; classe?: string; orgao?: string; parte?: string; [chave: string]: unknown };

export function Projudi() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [procurando, setProcurando] = useState(true);
  const [modo, setModo] = useState<"a3" | "2fa">("a3");
  const [pin, setPin] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [totp, setTotp] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [carteira, setCarteira] = useState<ProcessoNaCarteira[] | null>(null);
  const [carregandoCarteira, setCarregandoCarteira] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const consultarEstado = useCallback(async () => {
    try {
      const resposta = await fetch(`${CONSULTA}/saude`).then((r) => r.json()) as Estado;
      setEstado(resposta);
    } catch {
      setEstado(null);
    } finally {
      setProcurando(false);
    }
  }, []);

  useEffect(() => {
    const marca = setTimeout(() => { void consultarEstado(); }, 0);
    return () => clearTimeout(marca);
  }, [consultarEstado]);

  async function entrar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      const corpo = modo === "a3" ? { modo, pin } : { modo, cpf, senha, totp };
      const resposta = await fetch(`${CONSULTA}/entrar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const dados = await resposta.json() as { autenticado?: boolean; erro?: string };
      if (!resposta.ok || !dados.autenticado) throw new Error(dados.erro ?? "Não entrou no PROJUDI.");
      // As credenciais somem da tela assim que a sessão existe: elas vivem no
      // serviço local, em memória, e não têm por que continuar aqui.
      setPin(""); setSenha(""); setTotp("");
      await consultarEstado();
      void puxarCarteira();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Não entrou no PROJUDI.");
    } finally {
      setEntrando(false);
    }
  }

  async function puxarCarteira() {
    setErro(null);
    setCarregandoCarteira(true);
    try {
      const dados = await fetch(`${CONSULTA}/carteira`).then((r) => r.json()) as { processos?: ProcessoNaCarteira[]; erro?: string };
      if (dados.erro) throw new Error(dados.erro);
      setCarteira(dados.processos ?? []);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler a carteira.");
    } finally {
      setCarregandoCarteira(false);
    }
  }

  return <>
    <section className="card">
      <div className="card-head">
        <h2>Serviço de consulta no seu computador</h2>
        <span className={`status ${estado ? (estado.autenticado ? "st-ok" : "st-warn") : "st-neutral"}`}>
          {procurando ? "Procurando" : estado ? (estado.autenticado ? "Conectado ao PROJUDI" : "Aguardando entrada") : "Não encontrado"}
        </span>
      </div>
      <div className="card-body">
        {!estado && !procurando && <>
          <div className="vazio">
            <strong>O serviço de consulta não está rodando nesta máquina.</strong>
            Ele usa o seu próprio acesso ao PROJUDI, no seu computador. O escritório não guarda senha, PIN nem sessão do tribunal.
          </div>
          <p className="tiny muted">Para ligar: <code className="mono">python3 consulta/servico.py</code>. As dependências ficam em <code className="mono">consulta/requirements.txt</code>.</p>
        </>}
        {estado && <p className="tiny muted">Serviço versão {estado.versao}. As credenciais vão deste navegador direto para o serviço local e ficam só na memória dele.</p>}
      </div>
    </section>

    {estado && !estado.autenticado && <section className="card">
      <div className="card-head"><h2>Entrar no PROJUDI</h2></div>
      <div className="card-body">
        <form onSubmit={entrar} className="cert-form">
          <label>
            <span>Como entrar</span>
            <select value={modo} onChange={(e) => setModo(e.target.value as "a3" | "2fa")}>
              <option value="a3">Certificado A3 no token</option>
              <option value="2fa">CPF, senha e código do autenticador</option>
            </select>
          </label>
          {modo === "a3" && <label>
            <span>PIN do token</span>
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="off" required />
          </label>}
          {modo === "2fa" && <>
            <label><span>CPF</span><input value={cpf} onChange={(e) => setCpf(e.target.value)} autoComplete="off" required /></label>
            <label><span>Senha do PROJUDI</span><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="off" required /></label>
            <label><span>Código do autenticador</span><input value={totp} onChange={(e) => setTotp(e.target.value)} autoComplete="off" inputMode="numeric" required /></label>
          </>}
          {erro && <p className="cert-erro">{erro}</p>}
          <button type="submit" className="btn btn-primary" disabled={entrando}>{entrando ? "Entrando…" : "Entrar"}</button>
        </form>
      </div>
    </section>}

    {estado?.autenticado && <section className="card">
      <div className="card-head">
        <h2>Sua carteira no PROJUDI</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void puxarCarteira()} disabled={carregandoCarteira}>
          {carregandoCarteira ? "Lendo…" : "Atualizar"}
        </button>
      </div>
      <div className="card-body">
        {erro && <p className="cert-erro">{erro}</p>}
        {carteira === null && !carregandoCarteira && <p className="tiny muted">Clique em atualizar para ler os processos em que você está habilitado.</p>}
        {carteira?.length === 0 && <div className="vazio"><strong>Nenhum processo veio na carteira.</strong>Pode ser filtro do tribunal ou habilitação pendente.</div>}
        {carteira?.map((processo, indice) => <div className="audit-row" key={String(processo.numero ?? indice)}>
          <span className="mono">{String(processo.numero ?? "—")}</span>
          <strong>{String(processo.classe ?? processo.parte ?? "Processo")}</strong>
          <span>{String(processo.orgao ?? "")}</span>
        </div>)}
        <p className="tiny muted">O que aparece aqui vem do seu acesso, com a sua identidade, aos processos em que você é o procurador. O escritório não guarda essa sessão.</p>
      </div>
    </section>}
  </>;
}
