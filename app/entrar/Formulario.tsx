"use client";

import { useState, type FormEvent } from "react";

// Formulário de login. Depois de entrar, recarrega a página no destino para
// o layout do escritório ler o cookie novo no servidor.
export function Formulario({ destino }: { destino: string }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });
      const dados = await resposta.json().catch(() => ({})) as { erro?: string };
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível entrar agora.");
      window.location.assign(destino);
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : "Não foi possível entrar agora.");
      setEnviando(false);
    }
  }

  return <form className="pd-entrar-form" onSubmit={entrar}>
    <div className="pd-campo">
      <label htmlFor="usuario">Usuário</label>
      <input className="pd-entrada" id="usuario" name="usuario" value={usuario} onChange={(evento) => setUsuario(evento.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required autoFocus />
    </div>
    <div className="pd-campo">
      <label htmlFor="senha">Senha</label>
      <input className="pd-entrada" id="senha" name="senha" type="password" value={senha} onChange={(evento) => setSenha(evento.target.value)} autoComplete="current-password" required />
    </div>
    {erro && <p className="pd-entrar-erro" role="alert">{erro}</p>}
    <button type="submit" className="pd-botao pd-botao-primario pd-botao-bloco" disabled={enviando || !usuario.trim() || !senha}>{enviando ? "Entrando…" : "Entrar"}</button>
  </form>;
}
