"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Documento = { id: number; nome: string; detalhe: string; recebido: boolean; essencial?: boolean };
type Tarefa = { id: number; titulo: string; prazo: string; concluida: boolean };
type Atendimento = { id: number; resumo: string; momento: string; tipo: "registro" | "mila" | "humano" };
type ConexaoWhatsApp = { configurado: boolean; instancia: string | null; estado: string; webhookPodeSerConfigurado: boolean };
type ConsultaProcesso = { encontrado: boolean; numero: string; classe?: string; orgao?: string; ultimoMovimento?: string; dataMovimento?: string | null };
type Nomeacao = { processo: string; orgao: string; ato: string; prazo: string; situacao: string; resumo: string };

const DOCUMENTOS_INICIAIS: Documento[] = [
  { id: 1, nome: "Documento de identificação", detalhe: "Confirmar dados no atendimento", recebido: false, essencial: true },
  { id: 2, nome: "Comprovante de endereço", detalhe: "Arquivo de demonstração", recebido: true },
  { id: 3, nome: "Contrato ou proposta", detalhe: "Ajuda a reconstruir os fatos", recebido: false, essencial: true },
  { id: 4, nome: "Conversas e comprovantes", detalhe: "Separar o que ajuda a provar o relato", recebido: false },
];

const TAREFAS_INICIAIS: Tarefa[] = [
  { id: 1, titulo: "Confirmar preferência de contato", prazo: "hoje · 15h", concluida: false },
  { id: 2, titulo: "Conferir documentos recebidos", prazo: "hoje · 16h", concluida: false },
  { id: 3, titulo: "Triar relato com fontes", prazo: "próximo atendimento", concluida: false },
];

const ATENDIMENTOS_INICIAIS: Atendimento[] = [
  { id: 1, resumo: "Cadastro iniciado no ambiente demonstrativo.", momento: "hoje · 14h20", tipo: "registro" },
  { id: 2, resumo: "O assistente apontou documentos que ainda precisam de conferência humana.", momento: "hoje · 14h25", tipo: "mila" },
];

const NOMEACAO_DEMONSTRATIVA: Nomeacao = {
  processo: "0000000-00.0000.8.16.0000",
  orgao: "Vara demonstrativa · TJPR",
  ato: "Apresentar contestação",
  prazo: "7 dias úteis · confirmar no ato judicial",
  situacao: "Aguardando leitura e confirmação do advogado",
  resumo: "Nomeação demonstrativa para apresentar defesa. A ficha reúne o ato indicado, a fase processual e o que precisa ser conferido antes de qualquer peça.",
};

export default function Escritorio() {
  const [documentos, setDocumentos] = useState(DOCUMENTOS_INICIAIS);
  const [tarefas, setTarefas] = useState(TAREFAS_INICIAIS);
  const [atendimentos, setAtendimentos] = useState(ATENDIMENTOS_INICIAIS);
  const [novoAtendimento, setNovoAtendimento] = useState("");
  const [novaTarefa, setNovaTarefa] = useState("");
  const [aviso, setAviso] = useState("Pronto para organizar o próximo atendimento.");
  const [mensagemDocumentos, setMensagemDocumentos] = useState<string | null>(null);
  const [whatsApp, setWhatsApp] = useState<ConexaoWhatsApp>({ configurado: false, instancia: null, estado: "carregando", webhookPodeSerConfigurado: false });
  const [codigoConexao, setCodigoConexao] = useState<string | null>(null);
  const [imagemConexao, setImagemConexao] = useState<string | null>(null);
  const [carregandoWhatsApp, setCarregandoWhatsApp] = useState(false);
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [consultaProcesso, setConsultaProcesso] = useState<ConsultaProcesso | null>(null);
  const [carregandoProcesso, setCarregandoProcesso] = useState(false);
  const [nomeacaoConferida, setNomeacaoConferida] = useState(false);
  const [planoNomeacao, setPlanoNomeacao] = useState(false);

  const pendentes = useMemo(() => documentos.filter((item) => !item.recebido), [documentos]);
  const concluidas = tarefas.filter((item) => item.concluida).length;

  async function atualizarWhatsApp() {
    try {
      const resposta = await fetch("/api/whatsapp/conexao", { cache: "no-store" });
      const dados = await resposta.json() as ConexaoWhatsApp & { erro?: string };
      if (!resposta.ok) throw new Error(dados.erro);
      setWhatsApp(dados);
    } catch {
      setWhatsApp({ configurado: false, instancia: null, estado: "indisponivel", webhookPodeSerConfigurado: false });
    }
  }

  useEffect(() => {
    let ativo = true;
    void fetch("/api/whatsapp/conexao", { cache: "no-store" })
      .then(async (resposta) => ({ resposta, dados: await resposta.json() as ConexaoWhatsApp & { erro?: string } }))
      .then(({ resposta, dados }) => {
        if (!ativo) return;
        setWhatsApp(resposta.ok ? dados : { configurado: false, instancia: null, estado: "indisponivel", webhookPodeSerConfigurado: false });
      })
      .catch(() => { if (ativo) setWhatsApp({ configurado: false, instancia: null, estado: "indisponivel", webhookPodeSerConfigurado: false }); });
    return () => { ativo = false; };
  }, []);

  async function acionarWhatsApp(acao: "conectar" | "webhook") {
    setCarregandoWhatsApp(true); setCodigoConexao(null); setImagemConexao(null);
    try {
      const resposta = await fetch("/api/whatsapp/conexao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao }) });
      const dados = await resposta.json() as { codigo?: string | null; imagem?: string | null; erro?: string };
      if (!resposta.ok) throw new Error(dados.erro);
      if (acao === "conectar") {
        setCodigoConexao(dados.codigo ?? null);
        setImagemConexao(dados.imagem ?? null);
      }
      setAviso(acao === "conectar" ? "Código de conexão solicitado. Nenhuma mensagem foi enviada." : "Webhook registrado para receber eventos mínimos e aguardar revisão humana.");
      await atualizarWhatsApp();
    } catch (e) {
      setAviso(e instanceof Error && e.message ? e.message : "Não consegui configurar o WhatsApp agora.");
    } finally { setCarregandoWhatsApp(false); }
  }

  async function consultarProcesso() {
    setCarregandoProcesso(true); setConsultaProcesso(null);
    try {
      const resposta = await fetch("/api/processos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numero: numeroProcesso }) });
      const dados = await resposta.json() as ConsultaProcesso & { erro?: string };
      if (!resposta.ok) throw new Error(dados.erro);
      setConsultaProcesso(dados);
      setAviso(dados.encontrado ? "Movimentação pública consultada sem registrar o processo nesta demonstração." : "Não encontrei metadados públicos para esse número no índice do TJPR.");
    } catch (e) {
      setAviso(e instanceof Error && e.message ? e.message : "Não consegui consultar o processo agora.");
    } finally { setCarregandoProcesso(false); }
  }

  function alterarDocumento(id: number) {
    setDocumentos((itens) => itens.map((item) => item.id === id ? { ...item, recebido: !item.recebido } : item));
    setAviso("Lista de documentos atualizada neste navegador.");
  }

  function alterarTarefa(id: number) {
    setTarefas((itens) => itens.map((item) => item.id === id ? { ...item, concluida: !item.concluida } : item));
    setAviso("Agenda do caso atualizada neste navegador.");
  }

  function registrarAtendimento() {
    const resumo = novoAtendimento.trim();
    if (!resumo) return;
    setAtendimentos((itens) => [{ id: Date.now(), resumo, momento: "agora", tipo: "registro" }, ...itens]);
    setNovoAtendimento("");
    setAviso("Atendimento registrado só nesta sessão demonstrativa.");
  }

  function criarTarefa() {
    const titulo = novaTarefa.trim();
    if (!titulo) return;
    setTarefas((itens) => [...itens, { id: Date.now(), titulo, prazo: "sem prazo", concluida: false }]);
    setNovaTarefa("");
    setAviso("Novo próximo passo adicionado à agenda local.");
  }

  function encaminharHumano() {
    setAtendimentos((itens) => [{ id: Date.now(), resumo: "Encaminhamento para decisão do advogado marcado.", momento: "agora", tipo: "humano" }, ...itens]);
    setAviso("Encaminhamento humano marcado. O assistente não responde por conta própria a estratégia, negociação, urgência real ou situação sensível.");
  }

  function confirmarNomeacao() {
    setNomeacaoConferida(true);
    setAviso("Leitura da nomeação registrada nesta demonstração. O prazo continua sujeito à conferência no ato judicial.");
  }

  function montarPlanoDaNomeacao() {
    setPlanoNomeacao(true);
    setAviso("Roteiro inicial da nomeação preparado. Nenhuma contestação foi redigida ou enviada.");
  }

  function prepararPedidoDocumentos() {
    const nomes = pendentes.map((item) => item.nome.toLowerCase());
    setMensagemDocumentos(nomes.length
      ? `Olá! Para prepararmos o próximo atendimento, poderia separar: ${nomes.join(", ")}? Se tiver dúvida, avise para combinarmos com o advogado.`
      : "Os itens deste checklist foram marcados como recebidos. Antes de concluir, o advogado ainda deve conferir o conteúdo.");
    setAviso("Rascunho preparado. Ele não foi enviado a ninguém.");
  }

  return <main className="md-app">
    <header className="md-cabecalho">
      <Link href="/" className="md-marca">Ponto <span>Dativo</span><small>escritório de apoio</small></Link>
      <nav aria-label="Navegação do escritório">
        <a href="#nomeacao">Nomeação</a><a href="#caso">Caso</a><a href="#whatsapp">WhatsApp</a><a href="#processos">Processos</a><a href="#atendimentos">Atendimentos</a><a href="#documentos">Documentos</a><a href="#agenda">Agenda</a>
      </nav>
      <Link href="/" className="md-voltar">Organizar relato ↗</Link>
    </header>

    <section className="md-faixa" aria-label="Estado do ambiente">
      <span>Ambiente demonstrativo</span>
      <p>Fluxo inspirado na advocacia dativa da OAB/PR. Dados fictícios, sem marca oficial e sem integração institucional ativada.</p>
    </section>

    <div className="md-shell">
      <section className="md-hero" id="caso">
        <div>
          <p className="md-eyebrow">Atuação dativa, com o profissional no controle</p>
          <h1>O caso atende melhor quando o escritório inteiro cabe em um lugar.</h1>
          <p>Atendimentos, documentos, prazos, WhatsApp profissional e apoio de organização em um fluxo só. Este é um protótipo voltado à rotina do advogado dativo, não um sistema oficial da OAB.</p>
        </div>
        <aside className="md-cartao md-identidade">
          <span className="md-avatar" aria-hidden="true">CD</span>
          <div><p>Cliente demonstrativo</p><strong>Caso sem identificação</strong><small>Triagem inicial · atendimento em andamento</small></div>
          <dl><div><dt>Próximo ato</dt><dd>Confirmar documentos</dd></div><div><dt>Responsável</dt><dd>Advogado dativo</dd></div></dl>
        </aside>
      </section>

      <p className="md-status" role="status" aria-live="polite">{aviso}</p>

      <section className="md-nomeacao md-cartao" id="nomeacao" aria-labelledby="nomeacao-titulo">
        <div className="md-titulo-linha"><div><p className="md-eyebrow">Entrada da nomeação</p><h2 id="nomeacao-titulo">A nomeação vira um plano de trabalho antes de virar uma peça.</h2></div><span className={`md-selo ${nomeacaoConferida ? "md-selo-conferido" : ""}`}>{nomeacaoConferida ? "leitura registrada" : "nova nomeação"}</span></div>
        <p className="md-nomeacao-intro">Quando o advogado dativo recebe uma intimação de nomeação, o escritório deve abrir a ficha, identificar o ato pedido e avisar o responsável. Este exemplo é fictício: a entrada real só pode vir de uma fonte autorizada pelo advogado e pela OAB/PR.</p>
        <div className="md-nomeacao-grade">
          <article><p className="md-eyebrow">Resumo do ato</p><strong>{NOMEACAO_DEMONSTRATIVA.ato}</strong><dl><div><dt>Processo</dt><dd>{NOMEACAO_DEMONSTRATIVA.processo}</dd></div><div><dt>Órgão</dt><dd>{NOMEACAO_DEMONSTRATIVA.orgao}</dd></div><div><dt>Prazo informado</dt><dd>{NOMEACAO_DEMONSTRATIVA.prazo}</dd></div><div><dt>Situação</dt><dd>{NOMEACAO_DEMONSTRATIVA.situacao}</dd></div></dl><p>{NOMEACAO_DEMONSTRATIVA.resumo}</p></article>
          <article className="md-fundamentos"><p className="md-eyebrow">Roteiro para o advogado</p><h3>Fundamentos a avaliar, não conclusões prontas.</h3><ol><li><b>1</b><span>Conferir a íntegra da intimação, a data de ciência, a fase e o prazo no processo oficial.</span></li><li><b>2</b><span>Separar os fatos controvertidos, documentos existentes e provas que ainda precisam ser produzidas.</span></li><li><b>3</b><span>Pesquisar preliminares, mérito e precedentes apenas compatíveis com os fatos confirmados.</span></li><li><b>4</b><span>Montar a contestação e revisar estratégia, pedidos e prazo sob responsabilidade do advogado.</span></li></ol><div className="md-acoes"><button type="button" className="md-botao-primario" onClick={confirmarNomeacao} disabled={nomeacaoConferida}>{nomeacaoConferida ? "Leitura confirmada" : "Registrar leitura do advogado"}</button><button type="button" className="md-botao-secundario" onClick={montarPlanoDaNomeacao}>Criar roteiro de defesa</button></div>{planoNomeacao && <p className="md-rascunho"><b>Roteiro inicial, não protocolado</b>Conferir intimação e prazo · ler peças e documentos · definir teses com fontes · revisar a contestação antes do protocolo.</p>}</article>
        </div>
        <p className="md-nomeacao-limite">A automação pode registrar e avisar; não pode considerar a nomeação aceita, calcular prazo, decidir tese ou protocolar em nome do advogado.</p>
      </section>

      <section className="md-resumo" aria-label="Resumo do caso">
        <article><strong>{pendentes.length}</strong><span>documentos a conferir</span></article>
        <article><strong>{tarefas.length - concluidas}</strong><span>próximos passos abertos</span></article>
        <article><strong>{atendimentos.length}</strong><span>registros nesta sessão</span></article>
        <article className="md-resumo-verde"><strong>Humano</strong><span>decide e assina</span></article>
      </section>

      <section className="md-grade-principal">
        <article className="md-cartao md-mila" aria-labelledby="mila-titulo">
          <div className="md-titulo-linha"><div><p className="md-eyebrow">Assistente do escritório</p><h2 id="mila-titulo">Organização antes da decisão.</h2></div><span className="md-selo">apoio, não parecer</span></div>
          <p>Organize o relato, levante documentos e confira a fonte jurídica. Funciona como um estagiário virtual: prepara a base, aponta pendências e registra o próximo passo. Estratégia, negociação, prazo específico ou situação delicada sempre voltam para o advogado.</p>
          <div className="md-acoes">
            <Link href="/#inicio" className="md-botao-primario">Organizar relato com fontes <span>→</span></Link>
            <button type="button" className="md-botao-secundario" onClick={encaminharHumano}>Marcar decisão humana</button>
          </div>
          <div className="md-limite"><b>Limite de segurança</b><span>Nenhuma mensagem é enviada automaticamente. Antes do uso com clientes reais, é necessário formalizar a operação, a base legal, os controles de acesso e a relação com os fornecedores de tecnologia.</span></div>
        </article>

        <article className="md-cartao md-proximo">
          <p className="md-eyebrow">Próximo atendimento</p><h2>Deixar o cliente pronto para conversar.</h2>
          <ol><li><b>1</b><span>Conferir os documentos que chegaram.</span></li><li><b>2</b><span>Usar a triagem como rascunho organizado.</span></li><li><b>3</b><span>Definir o próximo ato com o advogado.</span></li></ol>
          <button type="button" className="md-link-botao" onClick={prepararPedidoDocumentos}>Preparar pedido de documentos →</button>
          {mensagemDocumentos && <p className="md-rascunho"><b>Rascunho, não enviado</b>{mensagemDocumentos}</p>}
        </article>
      </section>

      <section className="md-whatsapp md-cartao" id="whatsapp" aria-labelledby="whatsapp-titulo">
        <div className="md-titulo-linha"><div><p className="md-eyebrow">Canal profissional</p><h2 id="whatsapp-titulo">WhatsApp conectado ao caso, sem piloto automático.</h2></div><span className={`md-whatsapp-estado estado-${whatsApp.estado}`}>{whatsApp.estado === "open" ? "conectado" : whatsApp.estado === "nao_configurado" ? "a configurar" : whatsApp.estado}</span></div>
        <div className="md-whatsapp-corpo">
          <div><p>O advogado conecta a própria instância via Evolution API. O webhook recebe apenas novas mensagens e alterações de conexão, sem mídia em base64 e sem resposta automática. A triagem fica sob revisão humana antes de qualquer retorno ao cliente.</p><ul><li>Conexão por QR Code da instância do advogado</li><li>Eventos mínimos: nova mensagem e estado da conexão</li><li>Estratégia e envio sempre aprovados pelo advogado</li></ul></div>
          <aside>{whatsApp.configurado ? <><strong>Instância preparada</strong><small>{whatsApp.instancia}</small><div className="md-acoes"><button type="button" className="md-botao-primario" onClick={() => acionarWhatsApp("conectar")} disabled={carregandoWhatsApp}>{carregandoWhatsApp ? "Conectando…" : "Gerar QR de conexão"}</button><button type="button" className="md-botao-secundario" onClick={() => acionarWhatsApp("webhook")} disabled={carregandoWhatsApp || !whatsApp.webhookPodeSerConfigurado}>Ativar webhook seguro</button></div>{imagemConexao && <Image className="md-qr-conexao" src={imagemConexao} alt="QR Code para conectar o WhatsApp da instância" width={240} height={240} unoptimized />}{codigoConexao && <code className="md-codigo-conexao">{codigoConexao}</code>}</> : <><strong>Configuração do servidor necessária</strong><small>As chaves da Evolution ficam somente no ambiente do servidor. Cada advogado precisará de identidade própria, controle de acesso e cofre de credenciais antes de uma operação multiusuário.</small></>}</aside>
        </div>
      </section>

      <section className="md-processos" id="processos" aria-labelledby="processos-titulo">
        <article className="md-cartao md-consulta-processo">
          <p className="md-eyebrow">Acompanhamento processual</p><h2 id="processos-titulo">Consultar um processo do TJPR pelo número CNJ.</h2>
          <p>O primeiro conector usa a API pública do DataJud/CNJ para consultar metadados e movimentações públicas pontualmente. Não busca por nome, não varre portais e não acessa processos em sigilo.</p>
          <div className="md-adicionar"><label htmlFor="numero-processo">Número do processo</label><div><input id="numero-processo" value={numeroProcesso} onChange={(evento) => setNumeroProcesso(evento.target.value)} inputMode="numeric" maxLength={25} placeholder="0000000-00.0000.8.16.0000" /><button type="button" onClick={consultarProcesso} disabled={carregandoProcesso || numeroProcesso.replace(/\D/g, "").length !== 20}>{carregandoProcesso ? "Consultando…" : "Consultar"}</button></div></div>
          <small className="md-processo-limite">Use somente um processo que você esteja autorizado a acompanhar. O resultado não substitui a consulta oficial do tribunal, nem conta prazo processual.</small>
          {consultaProcesso && <div className="md-retorno-processo">{consultaProcesso.encontrado ? <><strong>{consultaProcesso.numero}</strong><span>{consultaProcesso.classe}</span><span>{consultaProcesso.orgao}</span><b>Último andamento público</b><p>{consultaProcesso.ultimoMovimento}</p>{consultaProcesso.dataMovimento && <small>{new Date(consultaProcesso.dataMovimento).toLocaleString("pt-BR")}</small>}</> : <p>Nenhum metadado público foi encontrado para o número informado.</p>}</div>}
        </article>
        <aside className="md-cartao md-fluxo-dativo"><p className="md-eyebrow">Fluxo dativo OAB/PR</p><h2>O que o escritório precisa deixar à mão.</h2><ol><li><b>1</b><div><strong>Convite de plantão</strong><span>Aceitar dentro de 24 horas no Portal da Advocacia Dativa.</span></div></li><li><b>2</b><div><strong>Nomeação e processo</strong><span>Organizar contato, documentos, movimentações e o próximo ato.</span></div></li><li><b>3</b><div><strong>Certidão e honorários</strong><span>Guardar a certidão judicial e acompanhar o requerimento administrativo.</span></div></li></ol><a href="https://advocaciadativa.oabpr.org.br/subsidios" target="_blank" rel="noreferrer">Abrir orientações oficiais da OAB/PR ↗</a></aside>
      </section>

      <section className="md-grade-dados">
        <article className="md-cartao" id="atendimentos">
          <div className="md-titulo-linha"><div><p className="md-eyebrow">Atendimentos</p><h2>Histórico de contato</h2></div><span className="md-contador">{atendimentos.length}</span></div>
          <p className="md-texto-auxiliar">Registre somente o essencial nesta demonstração. O conteúdo se perde ao atualizar a página.</p>
          <div className="md-campo"><label htmlFor="novo-atendimento">Novo registro</label><textarea id="novo-atendimento" value={novoAtendimento} onChange={(evento) => setNovoAtendimento(evento.target.value)} maxLength={280} placeholder="Ex.: cliente pediu retorno após reunir os comprovantes" /><button type="button" onClick={registrarAtendimento} disabled={!novoAtendimento.trim()}>Adicionar registro</button></div>
          <ul className="md-linha-tempo">{atendimentos.map((item) => <li key={item.id} className={`md-evento-${item.tipo}`}><i aria-hidden="true" /><div><strong>{item.resumo}</strong><small>{item.momento}{item.tipo === "mila" ? " · assistente do escritório" : item.tipo === "humano" ? " · atenção humana" : ""}</small></div></li>)}</ul>
        </article>

        <article className="md-cartao" id="documentos">
          <div className="md-titulo-linha"><div><p className="md-eyebrow">Documentos</p><h2>Checklist do caso</h2></div><span className="md-contador">{documentos.filter((item) => item.recebido).length}/{documentos.length}</span></div>
          <p className="md-texto-auxiliar">Marcar como recebido não substitui a conferência do conteúdo pelo profissional.</p>
          <ul className="md-checklist">{documentos.map((item) => <li key={item.id}><button type="button" aria-pressed={item.recebido} aria-label={`${item.recebido ? "Desmarcar" : "Marcar"} ${item.nome} como recebido`} onClick={() => alterarDocumento(item.id)}><span aria-hidden="true">{item.recebido ? "✓" : ""}</span></button><div><strong>{item.nome}{item.essencial && <em>essencial</em>}</strong><small>{item.detalhe}</small></div><b>{item.recebido ? "recebido" : "pendente"}</b></li>)}</ul>
        </article>
      </section>

      <section className="md-cartao md-agenda" id="agenda">
        <div className="md-titulo-linha"><div><p className="md-eyebrow">Agenda do caso</p><h2>Todo próximo passo tem responsável.</h2></div><span>{concluidas} concluída{concluidas === 1 ? "" : "s"}</span></div>
        <div className="md-adicionar"><label htmlFor="nova-tarefa">Adicionar próximo passo</label><div><input id="nova-tarefa" value={novaTarefa} onChange={(evento) => setNovaTarefa(evento.target.value)} maxLength={120} placeholder="Ex.: confirmar retorno por telefone" /><button type="button" onClick={criarTarefa} disabled={!novaTarefa.trim()}>Adicionar</button></div></div>
        <ul>{tarefas.map((item) => <li key={item.id}><button type="button" aria-pressed={item.concluida} aria-label={`${item.concluida ? "Reabrir" : "Concluir"} tarefa: ${item.titulo}`} onClick={() => alterarTarefa(item.id)}><span aria-hidden="true">{item.concluida ? "✓" : ""}</span></button><strong>{item.titulo}</strong><small>{item.prazo}</small><b>{item.concluida ? "concluída" : "aberta"}</b></li>)}</ul>
      </section>

      <section className="md-rodape">
        <div><p className="md-eyebrow">Ponto Dativo</p><h2>Mais qualidade no atendimento, sem tirar a responsabilidade de quem advoga.</h2></div>
        <p>Protótipo da equipe Habeas Titas orientado ao fluxo da advocacia dativa no Paraná. Marca, integração institucional e acesso ao Portal da Advocacia Dativa dependem de autorização e convênio com a OAB/PR.</p>
      </section>
    </div>
  </main>;
}
