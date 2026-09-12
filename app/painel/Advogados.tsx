"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { AdvogadoPublico } from "@/lib/contas";

// Contas dos advogados de teste, administradas pela equipe no painel. Cria,
// desativa e reativa pela API da equipe (/api/advogados, mesmo Basic Auth do
// painel). A senha nunca volta do servidor: aparece uma vez, na hora de
// criar, para a equipe copiar e passar ao advogado.

type Props = { advogados: AdvogadoPublico[]; linkDeEntrada: string };
type Formulario = { nome: string; oab: string; usuario: string; senha: string };

const FORMULARIO_VAZIO: Formulario = { nome: "", oab: "OAB/PR ", usuario: "", senha: "" };

function dataCurta(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso.slice(0, 10);
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
}

// Sugere o usuário a partir do nome: "Ana Souza Lima" → "ana.souza".
function sugerirUsuario(nome: string) {
  const partes = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/\s+/).filter((parte) => /^[a-z0-9]+$/.test(parte));
  return partes.slice(0, 2).join(".").slice(0, 40);
}

export function Advogados({ advogados, linkDeEntrada }: Props) {
  const router = useRouter();
  const [recarregando, iniciar] = useTransition();
  const [form, setForm] = useState<Formulario>(FORMULARIO_VAZIO);
  const [usuarioEditado, setUsuarioEditado] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [criado, setCriado] = useState<{ nome: string; usuario: string; senha: string } | null>(null);

  function alterar(campo: keyof Formulario, valor: string) {
    setForm((atual) => {
      const proximo = { ...atual, [campo]: valor };
      if (campo === "nome" && !usuarioEditado) proximo.usuario = sugerirUsuario(valor);
      return proximo;
    });
    if (campo === "usuario") setUsuarioEditado(valor.length > 0);
  }

  async function chamar(metodo: "POST" | "PATCH", corpo: unknown) {
    const resposta = await fetch("/api/advogados", {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dados = await resposta.json().catch(() => ({})) as { advogado?: AdvogadoPublico; erro?: string };
    if (!resposta.ok) throw new Error(dados.erro || "Não consegui concluir agora.");
    return dados.advogado ?? null;
  }

  async function criar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setCriado(null);
    setOcupado("novo");
    try {
      const advogado = await chamar("POST", form);
      setCriado({ nome: advogado?.nome ?? form.nome, usuario: advogado?.usuario ?? form.usuario, senha: form.senha });
      setForm(FORMULARIO_VAZIO);
      setUsuarioEditado(false);
      iniciar(() => router.refresh());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui criar a conta.");
    } finally {
      setOcupado(null);
    }
  }

  async function definirAtivo(advogado: AdvogadoPublico, ativo: boolean) {
    const pergunta = ativo
      ? `Reativar a conta de ${advogado.nome} (${advogado.usuario})?`
      : `Desativar a conta de ${advogado.nome} (${advogado.usuario})? Ele deixa de entrar na hora; os casos dele continuam guardados.`;
    if (!window.confirm(pergunta)) return;
    setErro(null);
    setOcupado(advogado.id);
    try {
      await chamar("PATCH", { id: advogado.id, ativo });
      iniciar(() => router.refresh());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui alterar a conta.");
    } finally {
      setOcupado(null);
    }
  }

  const ativos = advogados.filter((advogado) => advogado.ativo).length;

  return <div className="cfp-grade-2 adv-grade">
    <article className="cfp-cartao adv-lista">
      <div className="adv-lista-cabeca">
        <h2>Contas criadas</h2>
        <span className="cfp-badge">{ativos} {ativos === 1 ? "ativa" : "ativas"}{recarregando ? " · atualizando…" : ""}</span>
      </div>
      <p>Cada advogado entra em <a href="/entrar">{linkDeEntrada}</a> com o usuário e a senha que a equipe passou. Senha esquecida: <code>node scripts/advogado.mjs senha usuario nova-senha</code> no servidor.</p>
      {erro && <p className="cfp-erro" role="alert">{erro}</p>}
      {advogados.length === 0
        ? <p className="cfp-vazio">Nenhuma conta ainda. Crie a primeira ao lado.</p>
        : <div className="adv-tabela-caixa">
          <table className="adv-tabela">
            <thead>
              <tr><th>Nome</th><th>OAB</th><th>Usuário</th><th>Criado em</th><th>Situação</th><th><span className="sr-only">Ações</span></th></tr>
            </thead>
            <tbody>
              {advogados.map((advogado) => <tr key={advogado.id} className={advogado.ativo ? "" : "inativo"}>
                <td data-rotulo="Nome"><strong>{advogado.nome}</strong></td>
                <td data-rotulo="OAB">{advogado.oab}</td>
                <td data-rotulo="Usuário"><code>{advogado.usuario}</code></td>
                <td data-rotulo="Criado em">{dataCurta(advogado.criadoEm)}<span className="cfp-muted"> por {advogado.criadoPor}</span></td>
                <td data-rotulo="Situação"><span className={`cfp-badge${advogado.ativo ? "" : " ambar"}`}>{advogado.ativo ? "Ativo" : "Desativado"}</span></td>
                <td>
                  <button type="button" className="adv-botao" disabled={ocupado !== null} onClick={() => void definirAtivo(advogado, !advogado.ativo)}>
                    {ocupado === advogado.id ? "Salvando…" : advogado.ativo ? "Desativar" : "Reativar"}
                  </button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>}
    </article>

    <article className="cfp-cartao adv-novo">
      <h2>Criar conta</h2>
      <p>Só a equipe cria contas; não há cadastro livre. Use dados fictícios ou de quem vai testar de verdade.</p>
      <form className="adv-form" onSubmit={criar}>
        <label htmlFor="adv-nome">Nome completo</label>
        <input id="adv-nome" value={form.nome} onChange={(evento) => alterar("nome", evento.target.value)} autoComplete="off" required />
        <label htmlFor="adv-oab">OAB</label>
        <input id="adv-oab" value={form.oab} onChange={(evento) => alterar("oab", evento.target.value)} placeholder="OAB/PR 12345" autoComplete="off" required />
        <label htmlFor="adv-usuario">Usuário</label>
        <input id="adv-usuario" value={form.usuario} onChange={(evento) => alterar("usuario", evento.target.value)} placeholder="ana.souza" autoComplete="off" autoCapitalize="none" spellCheck={false} required />
        <small>Letras minúsculas, números, ponto, traço ou sublinhado. Sem espaço.</small>
        <label htmlFor="adv-senha">Senha</label>
        <input id="adv-senha" type="text" value={form.senha} onChange={(evento) => alterar("senha", evento.target.value)} placeholder="pelo menos 8 caracteres" autoComplete="off" required minLength={8} />
        <small>Fica visível aqui de propósito: copie e passe ao advogado. Depois de criada, o servidor só guarda o hash.</small>
        <button type="submit" className="adv-botao adv-botao-principal" disabled={ocupado !== null || form.senha.length < 8 || !form.nome.trim() || !form.usuario.trim() || !form.oab.trim()}>
          {ocupado === "novo" ? "Criando…" : "Criar conta"}
        </button>
      </form>
      {criado && <div className="adv-criado" role="status">
        <strong>Conta criada. Passe isto ao advogado:</strong>
        <dl>
          <dt>Endereço</dt><dd><a href="/entrar">{linkDeEntrada}</a></dd>
          <dt>Usuário</dt><dd><code>{criado.usuario}</code></dd>
          <dt>Senha</dt><dd><code>{criado.senha}</code></dd>
        </dl>
        <small>A senha não aparece de novo. Se perder, troque com <code>node scripts/advogado.mjs senha {criado.usuario} nova-senha</code>.</small>
      </div>}
    </article>
  </div>;
}
