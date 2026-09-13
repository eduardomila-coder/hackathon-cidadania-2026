"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Caso, Cliente, Origem } from "@/lib/escritorio";
import { chamar, mensagemDeErro } from "./api";
import { formatarTelefone, NOMES_DA_ORIGEM, ORIGENS } from "./formatos";

type Props = { clientes: Cliente[]; aoFechar: () => void };

// Formulário de caso novo, na própria mesa de trabalho. Só o título é
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

  return <form className="pd-cartao pdl-formulario" onSubmit={abrir} aria-label="Novo caso">
    <div className="pd-cartao-cabeca">
      <div><p className="pd-eyebrow">Novo caso</p><h2>Abrir um caso</h2></div>
      <button type="button" className="pd-botao pd-botao-quieto pd-botao-pequeno" onClick={aoFechar}>Fechar</button>
    </div>
    <div className="pd-cartao-corpo">
      <p className="pd-auxiliar pdl-formulario-intro">Só o título é obrigatório. O resto você completa na página do caso, com calma.</p>

      <div className="pdl-grade">
        <div className="pd-campo pdl-largo">
          <label htmlFor="nc-titulo">Título do caso</label>
          <input id="nc-titulo" className="pd-entrada" value={titulo} onChange={(evento) => setTitulo(evento.target.value)} maxLength={200} placeholder="Ex.: Cobrança indevida na conta de luz" required autoFocus />
        </div>
        <div className="pd-campo">
          <label htmlFor="nc-origem">Origem</label>
          <select id="nc-origem" className="pd-selecao" value={origem} onChange={(evento) => setOrigem(evento.target.value as Origem)}>
            {ORIGENS.map((opcao) => <option key={opcao} value={opcao}>{NOMES_DA_ORIGEM[opcao]}</option>)}
          </select>
        </div>
        <div className="pd-campo">
          <label htmlFor="nc-prazo">Prazo <small>se já souber</small></label>
          <input id="nc-prazo" className="pd-entrada" type="date" value={prazo} onChange={(evento) => setPrazo(evento.target.value)} />
        </div>

        <fieldset className="pdl-grupo-cliente">
          <legend>Cliente</legend>
          {clientes.length > 0 && <div className="pdl-alternar" role="radiogroup" aria-label="Cliente novo ou já cadastrado">
            <label htmlFor="nc-cliente-existente"><input id="nc-cliente-existente" type="radio" name="modo-cliente" checked={modoCliente === "existente"} onChange={() => setModoCliente("existente")} /> Já cadastrado</label>
            <label htmlFor="nc-cliente-novo"><input id="nc-cliente-novo" type="radio" name="modo-cliente" checked={modoCliente === "novo"} onChange={() => setModoCliente("novo")} /> Cliente novo</label>
          </div>}
          {modoCliente === "existente" && clientes.length > 0
            ? <div className="pd-campo">
              <label htmlFor="nc-cliente">Quem é o cliente</label>
              <select id="nc-cliente" className="pd-selecao" value={clienteId} onChange={(evento) => setClienteId(evento.target.value)}>
                <option value="">Sem cliente por enquanto</option>
                {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome} · {formatarTelefone(cliente.telefone)}</option>)}
              </select>
            </div>
            : <div className="pdl-grade pdl-grade-3">
              <div className="pd-campo"><label htmlFor="nc-nome">Nome</label><input id="nc-nome" className="pd-entrada" value={nome} onChange={(evento) => setNome(evento.target.value)} maxLength={200} placeholder="Nome do cliente" /></div>
              <div className="pd-campo"><label htmlFor="nc-telefone">Telefone <small>WhatsApp, com DDD</small></label><input id="nc-telefone" className="pd-entrada" value={telefone} onChange={(evento) => setTelefone(evento.target.value)} inputMode="tel" placeholder="(41) 99999-9999" /></div>
              <div className="pd-campo"><label htmlFor="nc-email">E-mail <small>opcional</small></label><input id="nc-email" className="pd-entrada" type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} placeholder="cliente@exemplo.com" /></div>
              <p className="pd-auxiliar pdl-largo">Deixe em branco para cadastrar o cliente depois, na página do caso.</p>
            </div>}
        </fieldset>

        <div className="pd-campo"><label htmlFor="nc-processo">Processo <small>número CNJ, se houver</small></label><input id="nc-processo" className="pd-entrada" value={processo} onChange={(evento) => setProcesso(evento.target.value)} inputMode="numeric" placeholder="0000000-00.0000.8.16.0000" /></div>
        <div className="pd-campo"><label htmlFor="nc-orgao">Órgão</label><input id="nc-orgao" className="pd-entrada" value={orgao} onChange={(evento) => setOrgao(evento.target.value)} maxLength={300} placeholder="Ex.: 2º Juizado Especial Cível de Curitiba" /></div>
        <div className="pd-campo"><label htmlFor="nc-ato">Ato</label><input id="nc-ato" className="pd-entrada" value={ato} onChange={(evento) => setAto(evento.target.value)} maxLength={300} placeholder="Ex.: audiência de conciliação" /></div>
        <div className="pd-campo pdl-largo">
          <label htmlFor="nc-relato">Relato do cliente <small>pode preencher depois</small></label>
          <textarea id="nc-relato" className="pd-area-texto" value={relato} onChange={(evento) => setRelato(evento.target.value)} maxLength={20000} rows={5} placeholder="O que o cliente contou, com as palavras dele. É o texto que a triagem vai ler." />
        </div>
      </div>

      <p className="pd-auxiliar pdl-nota-prazo">Data de prazo digitada aqui é a informada no caso. Ela não substitui a conferência no processo oficial.</p>

      {erro && <p role="alert" className="pd-aviso pd-aviso-risco">{erro}</p>}
      <div className="pd-linha-campos">
        <button type="submit" className="pd-botao pd-botao-primario" disabled={enviando || !titulo.trim()}>{enviando ? "Abrindo…" : "Abrir caso"}</button>
        <button type="button" className="pd-botao pd-botao-secundario" onClick={aoFechar} disabled={enviando}>Cancelar</button>
      </div>
    </div>
  </form>;
}
