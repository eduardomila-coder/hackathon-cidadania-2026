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
  sem_instancia: "instância perdida",
  nao_configurado: "servidor sem Evolution",
  indisponivel: "indisponível",
  carregando: "…",
};

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
    if (acao === "remover" && !window.confirm("Remover o número apaga a sessão do seu WhatsApp neste servidor. As mensagens já guardadas continuam na sua conta. Continuar?")) return;
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
        setAviso(dados.conectado ? "O WhatsApp já está conectado." : dados.imagem ? "Leia o QR no WhatsApp do celular: Configurações → Aparelhos conectados → Conectar aparelho." : "A Evolution não devolveu um QR agora. Tente de novo em alguns segundos.");
        if (acao === "cadastrar" && dados.webhookRegistrado === false) setAviso("Número cadastrado, mas o webhook não foi registrado: falta APP_URL ou EVOLUTION_WEBHOOK_SECRET no servidor. Sem ele, as mensagens não chegam à tela.");
      }
      if (acao === "desconectar") setAviso("WhatsApp desconectado. O número continua cadastrado; gere um QR para voltar.");
      if (acao === "remover") { setNumeroWhatsApp(""); setAviso("Número e sessão do WhatsApp removidos do servidor."); }
      await atualizarWhatsApp();
    } catch (e) {
      setAviso(e instanceof Error && e.message ? e.message : "Não consegui configurar o WhatsApp agora.");
    } finally { setCarregandoWhatsApp(false); }
  }

  const semNumero = whatsApp.estado === "sem_numero" || whatsApp.estado === "sem_instancia";

  return <section className="pd-whatsapp">
    {aviso && <p className="md-status" role="status" aria-live="polite">{aviso}</p>}

    <section className="md-whatsapp md-cartao" aria-labelledby="whatsapp-titulo">
      <div className="md-titulo-linha">
        <div><p className="md-eyebrow">Canal profissional</p><h2 id="whatsapp-titulo">WhatsApp conectado ao seu escritório, sem piloto automático.</h2></div>
        <span className={`md-whatsapp-estado estado-${whatsApp.estado}`}>{ESTADOS_WHATSAPP[whatsApp.estado] ?? whatsApp.estado}</span>
      </div>
      <div className="md-whatsapp-corpo">
        <div>
          <p>Você conecta o seu próprio número. O que os clientes mandam aparece em <Link href="/escritorio/mensagens">Mensagens</Link> e na página do caso; o assistente sugere a resposta e só você envia.</p>
          <ul>
            <li>Conexão por QR Code, com uma instância só sua</li>
            <li>Chegam texto e avisos de mídia; nenhum arquivo é baixado</li>
            <li>Nenhuma mensagem sai sem o seu clique</li>
          </ul>
        </div>
        <aside>
          {!whatsApp.configurado && whatsApp.estado !== "carregando" ? <>
            <strong>Servidor sem Evolution</strong>
            <small>Defina EVOLUTION_API_URL e EVOLUTION_API_KEY no ambiente do servidor. As chaves nunca passam pela tela.</small>
          </> : whatsApp.estado === "carregando" ? <>
            <strong>Consultando…</strong>
            <small>Verificando o estado da sua conexão.</small>
          </> : semNumero ? <>
            <strong>Cadastre o seu WhatsApp</strong>
            <small>O número fica ligado ao seu login do escritório. Depois do cadastro, o QR aparece aqui para ler no celular.</small>
            <div className="md-adicionar md-numero-whatsapp">
              <label htmlFor="numero-whatsapp">Número com DDD</label>
              <div>
                <input id="numero-whatsapp" value={numeroWhatsApp} onChange={(evento) => setNumeroWhatsApp(evento.target.value)} inputMode="tel" autoComplete="tel" maxLength={20} placeholder="(41) 99999-9999" />
                <button type="button" className="md-botao-primario" onClick={() => acionarWhatsApp("cadastrar")} disabled={carregandoWhatsApp || numeroWhatsApp.replace(/\D/g, "").length < 10}>{carregandoWhatsApp ? "Cadastrando…" : "Cadastrar e gerar QR"}</button>
              </div>
            </div>
            {whatsApp.estado === "sem_instancia" && <small>O cadastro anterior ({whatsApp.numero}) perdeu a instância no servidor. Cadastre de novo para recriá-la.</small>}
          </> : <>
            <strong>{whatsApp.estado === "open" ? "Conectado" : "Número cadastrado"}</strong>
            <small>{whatsApp.numero} · instância {whatsApp.instancia}</small>
            <div className="md-acoes">
              {whatsApp.estado !== "open" && <button type="button" className="md-botao-primario" onClick={() => acionarWhatsApp("conectar")} disabled={carregandoWhatsApp}>{carregandoWhatsApp ? "Gerando…" : imagemConexao ? "Gerar novo QR" : "Gerar QR de conexão"}</button>}
              {whatsApp.estado === "open" && <button type="button" className="md-botao-secundario" onClick={() => acionarWhatsApp("desconectar")} disabled={carregandoWhatsApp}>Desconectar</button>}
              <button type="button" className="md-botao-secundario" onClick={() => acionarWhatsApp("remover")} disabled={carregandoWhatsApp}>Remover número</button>
            </div>
            {imagemConexao && whatsApp.estado !== "open" && <>
              <Image className="md-qr-conexao" src={imagemConexao} alt="QR Code para conectar o seu WhatsApp" width={240} height={240} unoptimized />
              <small>Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho. O QR expira sozinho; se passar, gere outro.</small>
            </>}
            {codigoConexao && whatsApp.estado !== "open" && <code className="md-codigo-conexao">Código de pareamento: {codigoConexao}</code>}
            {whatsApp.estado === "open" && <small className="pd-whatsapp-dica">Tudo pronto. As conversas aparecem em <Link href="/escritorio/mensagens">Mensagens</Link>.</small>}
          </>}
        </aside>
      </div>
    </section>

    <p className="pd-whatsapp-limite">
      Ambiente de demonstração: use um número seu ou de teste. A URL da Evolution e as chaves ficam só no servidor; a tela nunca as mostra.
    </p>
  </section>;
}
