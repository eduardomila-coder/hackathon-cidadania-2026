"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { pedirAoConector } from "../conector";

// Quem fala com o PROJUDI é o serviço de consulta que roda na máquina do
// advogado; quem leva o pedido até lá é o conector dele. O servidor do
// escritório só encaminha: PIN, senha e código do autenticador atravessam
// cifrados até o computador do advogado e não são guardados em lugar nenhum.
// O tribunal continua vendo o acesso do advogado, com a identidade dele.

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
      // O serviço diz de si mesmo se já entrou no tribunal. Antes a tela
      // adivinhava pelo texto do erro e errava: "Ainda não entrou no PROJUDI"
      // não casava com o que ela procurava, e um serviço vivo aparecia como
      // ausente.
      const { resultado } = await pedirAoConector("projudi-saude", {}, 8000);
      const saude = resultado as { versao?: string; autenticado?: boolean };
      setEstado({ consulta: "projudi", versao: saude.versao ?? "1.0.0", autenticado: Boolean(saude.autenticado) });
      if (saude.autenticado) void puxarCarteira();
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
      const { resultado } = await pedirAoConector("projudi-entrar", corpo);
      const dados = resultado as { autenticado?: boolean };
      if (!dados.autenticado) throw new Error("Não entrou no PROJUDI.");
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
      const { resultado } = await pedirAoConector("projudi-carteira");
      setCarteira((resultado as { processos?: ProcessoNaCarteira[] }).processos ?? []);
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
          <p className="tiny muted">Para ligar: <code className="mono">python3 consulta/servico.py</code> (dependências em <code className="mono">consulta/requirements.txt</code>), com o conector da tela <strong>Certificado digital</strong> ligado à sua conta — é ele que leva os pedidos até o serviço.</p>
        </>}
        {estado && <p className="tiny muted">As credenciais atravessam cifradas até o seu computador e ficam só na memória do serviço, enquanto ele estiver aberto. O servidor do escritório não as guarda.</p>}
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
