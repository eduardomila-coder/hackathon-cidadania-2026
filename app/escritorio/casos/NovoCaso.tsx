"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Caso, Cliente, Origem } from "@/lib/escritorio";
import { chamar, mensagemDeErro } from "./api";
import { formatarTelefone, NOMES_DA_ORIGEM, ORIGENS } from "./formatos";

type Props = { clientes: Cliente[]; aoFechar: () => void };

// Formulário de caso novo, na própria página do painel. Só o título é
// obrigatório: o resto o advogado completa na página do caso.
export function NovoCaso({ clientes, aoFechar }: Props) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [origem, setOrigem] = useState<Origem>("particular");
  const [modoCliente, setModoCliente] = useState<"novo" | "existente">(clientes.length > 0 ? "existente" : "novo");
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [processo, setProcesso] = useState("");
  const [orgao, setOrgao] = useState("");
  const [ato, setAto] = useState("");
  const [prazo, setPrazo] = useState("");
  const [relato, setRelato] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function abrir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const clienteInline = modoCliente === "novo" && (nome.trim() || telefone.trim()) ? { nome: nome.trim(), telefone: telefone.trim(), email: email.trim() || null } : undefined;
      const caso = await chamar<Caso>("/api/escritorio/casos", {
        metodo: "POST",
        corpo: {
          titulo: titulo.trim(),
          origem,
          clienteId: modoCliente === "existente" && clienteId ? clienteId : null,
          cliente: clienteInline,
          processo: processo.trim() || null,
          orgao: orgao.trim() || null,
          ato: ato.trim() || null,
          prazo: prazo || null,
          relato: relato.trim(),
        },
      });
      router.push(`/escritorio/casos/${caso.id}`);
    } catch (e) {
      setErro(mensagemDeErro(e));
      setEnviando(false);
    }
  }

  return <form className="pd-cartao pdc-formulario" onSubmit={abrir} aria-label="Novo caso">
    <div className="md-titulo-linha">
      <div><p className="md-eyebrow">Novo caso</p><h2>Abrir um caso</h2></div>
      <button type="button" className="md-link-botao" onClick={aoFechar}>Fechar</button>
    </div>
    <p className="pdc-formulario-intro">Só o título é obrigatório. O resto você completa na página do caso, com calma.</p>

    <div className="pdc-grade">
      <label className="pdc-campo pdc-campo-largo">
        <span>Título do caso</span>
        <input value={titulo} onChange={(evento) => setTitulo(evento.target.value)} maxLength={200} placeholder="Ex.: Cobrança indevida na conta de luz" required autoFocus />
      </label>
      <label className="pdc-campo">
        <span>Origem</span>
        <select value={origem} onChange={(evento) => setOrigem(evento.target.value as Origem)}>
          {ORIGENS.map((opcao) => <option key={opcao} value={opcao}>{NOMES_DA_ORIGEM[opcao]}</option>)}
        </select>
      </label>
      <label className="pdc-campo">
        <span>Prazo <small>se já souber</small></span>
        <input type="date" value={prazo} onChange={(evento) => setPrazo(evento.target.value)} />
      </label>

      <fieldset className="pdc-cliente pdc-campo-largo">
        <legend>Cliente</legend>
        {clientes.length > 0 && <div className="pdc-alternar" role="radiogroup" aria-label="Cliente novo ou já cadastrado">
          <label><input type="radio" name="modo-cliente" checked={modoCliente === "existente"} onChange={() => setModoCliente("existente")} /> Já cadastrado</label>
          <label><input type="radio" name="modo-cliente" checked={modoCliente === "novo"} onChange={() => setModoCliente("novo")} /> Cliente novo</label>
        </div>}
        {modoCliente === "existente" && clientes.length > 0
          ? <label className="pdc-campo"><span>Quem é o cliente</span>
            <select value={clienteId} onChange={(evento) => setClienteId(evento.target.value)}>
              <option value="">Sem cliente por enquanto</option>
              {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome} · {formatarTelefone(cliente.telefone)}</option>)}
            </select>
          </label>
          : <div className="pdc-grade pdc-grade-interna">
            <label className="pdc-campo"><span>Nome</span><input value={nome} onChange={(evento) => setNome(evento.target.value)} maxLength={200} placeholder="Nome do cliente" /></label>
            <label className="pdc-campo"><span>Telefone <small>WhatsApp, com DDD</small></span><input value={telefone} onChange={(evento) => setTelefone(evento.target.value)} inputMode="tel" placeholder="(41) 99999-9999" /></label>
            <label className="pdc-campo"><span>E-mail <small>opcional</small></span><input type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} placeholder="cliente@exemplo.com" /></label>
            <p className="md-texto-auxiliar pdc-campo-largo">Deixe em branco para cadastrar o cliente depois, na página do caso.</p>
          </div>}
      </fieldset>

      <label className="pdc-campo"><span>Processo <small>número CNJ, se houver</small></span><input value={processo} onChange={(evento) => setProcesso(evento.target.value)} inputMode="numeric" placeholder="0000000-00.0000.8.16.0000" /></label>
      <label className="pdc-campo"><span>Órgão</span><input value={orgao} onChange={(evento) => setOrgao(evento.target.value)} maxLength={300} placeholder="Ex.: 2º Juizado Especial Cível de Curitiba" /></label>
      <label className="pdc-campo"><span>Ato</span><input value={ato} onChange={(evento) => setAto(evento.target.value)} maxLength={300} placeholder="Ex.: audiência de conciliação" /></label>
      <label className="pdc-campo pdc-campo-largo">
        <span>Relato do cliente <small>pode preencher depois</small></span>
        <textarea value={relato} onChange={(evento) => setRelato(evento.target.value)} maxLength={20000} rows={5} placeholder="O que o cliente contou, com as palavras dele. É o texto que a triagem vai ler." />
      </label>
    </div>

    {erro && <p role="alert" className="pdc-erro">{erro}</p>}
    <div className="md-acoes">
      <button type="submit" className="md-botao-primario" disabled={enviando || !titulo.trim()}>{enviando ? "Abrindo…" : "Abrir caso"}</button>
      <button type="button" className="md-botao-secundario" onClick={aoFechar} disabled={enviando}>Cancelar</button>
    </div>
  </form>;
}
