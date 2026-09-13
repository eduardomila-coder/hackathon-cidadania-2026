"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import "../mensagens.css";

// Canal profissional: o advogado cadastra o próprio número, lê o QR e vê o
// estado da conexão. A lógica veio da página antiga do escritório; a
// instância na Evolution é `ponto-dativo-<usuario>` e a rota usa a sessão.

type ConexaoWhatsApp = { configurado: boolean; instancia: string | null; estado: string; numero: string | null; webhookPodeSerConfigurado: boolean };
const WHATSAPP_INICIAL: ConexaoWhatsApp = { configurado: false, instancia: null, estado: "carregando", numero: null, webhookPodeSerConfigurado: false };
const ESTADOS_WHATSAPP: Record<string, string> = {
  open: "conectado",
  connecting: "aguardando leitura do QR",
  close: "desconectado",
  sem_numero: "cadastre seu número",
  sem_instancia: "conexão perdida no servidor",
  nao_configurado: "integração desligada",
  indisponivel: "indisponível agora",
  carregando: "consultando",
};

// Estado sempre com cor mais texto: o selo do cabeçalho traz as duas coisas.
function classeDoEstado(estado: string) {
  if (estado === "open") return "pd-estado-ok";
  if (estado === "connecting") return "pd-estado-info";
  if (estado === "indisponivel" || estado === "sem_instancia") return "pd-estado-risco";
  return "pd-estado-atencao";
}

export default function WhatsApp() {
  const [whatsApp, setWhatsApp] = useState<ConexaoWhatsApp>(WHATSAPP_INICIAL);
  const [numeroWhatsApp, setNumeroWhatsApp] = useState("");
  const [codigoConexao, setCodigoConexao] = useState<string | null>(null);
  const [imagemConexao, setImagemConexao] = useState<string | null>(null);
  const [carregandoWhatsApp, setCarregandoWhatsApp] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function atualizarWhatsApp() {
    try {
      const resposta = await fetch("/api/whatsapp/conexao", { cache: "no-store" });
      const dados = await resposta.json() as ConexaoWhatsApp & { erro?: string };
      if (!resposta.ok) throw new Error(dados.erro);
      setWhatsApp(dados);
      if (dados.estado === "open") { setImagemConexao(null); setCodigoConexao(null); }
    } catch {
      setWhatsApp({ ...WHATSAPP_INICIAL, estado: "indisponivel" });
    }
  }

  // Consulta o estado ao abrir e, enquanto um QR está na tela, a cada 4 s:
  // assim a página vira "conectado" sozinha quando o advogado lê o código.
  useEffect(() => {
    let ativo = true;
    const consultar = () => { if (ativo) void atualizarWhatsApp(); };
    consultar();
    const intervalo = setInterval(consultar, imagemConexao ? 4000 : 30000);
    return () => { ativo = false; clearInterval(intervalo); };
  }, [imagemConexao]);

  async function acionarWhatsApp(acao: "cadastrar" | "conectar" | "desconectar" | "remover") {
    if (acao === "remover" && !window.confirm("Remover o número apaga a conexão do seu WhatsApp neste servidor. As mensagens já guardadas continuam na sua conta. Continuar?")) return;
    setCarregandoWhatsApp(true);
    if (acao !== "conectar") { setCodigoConexao(null); setImagemConexao(null); }
    try {
      const corpo = acao === "cadastrar" ? { acao, numero: numeroWhatsApp } : { acao };
      const resposta = await fetch("/api/whatsapp/conexao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const dados = await resposta.json() as { conectado?: boolean; codigo?: string | null; imagem?: string | null; webhookRegistrado?: boolean; erro?: string };
      if (!resposta.ok) throw new Error(dados.erro);
      if (acao === "cadastrar" || acao === "conectar") {
        setCodigoConexao(dados.codigo ?? null);
        setImagemConexao(dados.imagem ?? null);
        setAviso(dados.conectado ? "O WhatsApp já está conectado." : dados.imagem ? "Leia o QR no WhatsApp do celular: Aparelhos conectados, Conectar aparelho." : "O servidor não devolveu um QR agora. Tente de novo em alguns segundos.");
        if (acao === "cadastrar" && dados.webhookRegistrado === false) setAviso("Número cadastrado, mas o aviso de mensagem nova não foi ligado no servidor. Sem ele, as mensagens não chegam à tela de Mensagens.");
      }
      if (acao === "desconectar") setAviso("WhatsApp desconectado. O número continua cadastrado; gere um QR para voltar.");
      if (acao === "remover") { setNumeroWhatsApp(""); setAviso("Número e conexão do WhatsApp removidos do servidor."); }
      await atualizarWhatsApp();
    } catch (e) {
      setAviso(e instanceof Error && e.message ? e.message : "Não consegui configurar o WhatsApp agora.");
    } finally { setCarregandoWhatsApp(false); }
  }

  const semNumero = whatsApp.estado === "sem_numero" || whatsApp.estado === "sem_instancia";

  return <section className="pd-whatsapp">
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">Canal profissional</p>
        <h1>WhatsApp do escritório</h1>
        <p className="pd-auxiliar">Você conecta o seu próprio número. O que o cliente manda aparece em Mensagens e na página do caso. O assistente escreve o rascunho; o envio é seu, salvo nas conversas em que você liga o estagiário virtual.</p>
      </div>
      <div className="pd-pagina-acoes">
        <span className={`pd-estado ${classeDoEstado(whatsApp.estado)}`}>{ESTADOS_WHATSAPP[whatsApp.estado] ?? whatsApp.estado}</span>
      </div>
    </div>

    {aviso && <p className="pd-aviso" role="status" aria-live="polite">{aviso}</p>}

    <section className="pd-cartao" aria-labelledby="whatsapp-titulo">
      <header className="pd-cartao-cabeca">
        <h2 id="whatsapp-titulo">Conexão do número</h2>
      </header>
      <div className="pd-cartao-corpo pd-whatsapp-corpo">
        <div className="pd-whatsapp-bloco">
          <p>O número fica ligado ao seu login do escritório, com uma conexão só sua. Nenhum arquivo é baixado: chegam o texto e o aviso de que existe mídia.</p>
          <ol className="pd-whatsapp-passos">
            <li><b>1</b><span>Cadastre o número com DDD. Use um número seu ou de teste, nunca o de um cliente real.</span></li>
            <li><b>2</b><span>Gere o QR e leia no celular, em Aparelhos conectados, Conectar aparelho.</span></li>
            <li><b>3</b><span>As conversas passam a aparecer em <Link href="/escritorio/mensagens">Mensagens</Link>. Nada sai para o cliente sem o seu clique, salvo nas conversas em que você liga o estagiário virtual.</span></li>
          </ol>
        </div>

        <aside className="pd-whatsapp-lado">
          {!whatsApp.configurado && whatsApp.estado !== "carregando" ? <>
            <strong>Integração desligada neste servidor</strong>
            <small>A equipe precisa ligar a integração do WhatsApp no ambiente de demonstração. As chaves ficam só no servidor e nunca passam pela tela.</small>
          </> : whatsApp.estado === "carregando" ? <>
            <strong>Consultando o estado</strong>
            <small>Verificando a sua conexão com o WhatsApp.</small>
          </> : semNumero ? <>
            <strong>Cadastre o seu WhatsApp</strong>
            <small>Depois do cadastro, o QR aparece aqui para ler no celular.</small>
            <div className="pd-campo">
              <label htmlFor="numero-whatsapp">Número com DDD</label>
              <input
                id="numero-whatsapp"
                className="pd-entrada"
                value={numeroWhatsApp}
                onChange={(evento) => setNumeroWhatsApp(evento.target.value)}
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                placeholder="(41) 99999-9999"
              />
            </div>
            <button type="button" className="pd-botao pd-botao-primario pd-botao-bloco" onClick={() => acionarWhatsApp("cadastrar")} disabled={carregandoWhatsApp || numeroWhatsApp.replace(/\D/g, "").length < 10}>{carregandoWhatsApp ? "Cadastrando…" : "Cadastrar e gerar QR"}</button>
            {whatsApp.estado === "sem_instancia" && <small>O cadastro anterior ({whatsApp.numero}) não foi encontrado no servidor. Cadastre de novo para recriar a conexão.</small>}
          </> : <>
            <strong>{whatsApp.estado === "open" ? "Conectado" : "Número cadastrado"}</strong>
            <dl className="pd-dados">
              <div className="pd-dado"><dt>Número</dt><dd>{whatsApp.numero}</dd></div>
              <div className="pd-dado"><dt>Situação</dt><dd>{ESTADOS_WHATSAPP[whatsApp.estado] ?? whatsApp.estado}</dd></div>
            </dl>
            <div className="pd-linha-campos">
              {whatsApp.estado !== "open" && <button type="button" className="pd-botao pd-botao-primario" onClick={() => acionarWhatsApp("conectar")} disabled={carregandoWhatsApp}>{carregandoWhatsApp ? "Gerando…" : imagemConexao ? "Gerar novo QR" : "Gerar QR de conexão"}</button>}
              {whatsApp.estado === "open" && <button type="button" className="pd-botao pd-botao-secundario" onClick={() => acionarWhatsApp("desconectar")} disabled={carregandoWhatsApp}>Desconectar</button>}
              <button type="button" className="pd-botao pd-botao-perigo" onClick={() => acionarWhatsApp("remover")} disabled={carregandoWhatsApp}>Remover número</button>
            </div>
            {imagemConexao && whatsApp.estado !== "open" && <>
              <Image className="pd-qr" src={imagemConexao} alt="QR Code para conectar o seu WhatsApp" width={240} height={240} unoptimized />
              <small>O QR expira sozinho. Se passar da tela, gere outro.</small>
            </>}
            {codigoConexao && whatsApp.estado !== "open" && <code className="pd-codigo-conexao">Código de pareamento: {codigoConexao}</code>}
            {whatsApp.estado === "open" && <small>Está tudo pronto. As conversas aparecem em <Link href="/escritorio/mensagens">Mensagens</Link>.</small>}
          </>}
        </aside>
      </div>
    </section>

    <p className="pd-whatsapp-limite">
      Ambiente de demonstração: use um número seu ou de teste. A integração roda no servidor da equipe; as chaves nunca aparecem nesta tela.
    </p>
  </section>;
}
