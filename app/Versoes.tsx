"use client";

import { useEffect, useState } from "react";

type Versao = { id: string; curta: string; titulo: string; quando: string };
type Comparacao = { commits: Array<{ id: string; titulo: string }>; arquivos: Array<{ nome: string; situacao: string; adicoes: number; remocoes: number }> };
type Dados = { atual: Versao | null; versoes: Versao[]; comparacao: Comparacao | null; erro?: string };

function data(valor: string) {
  return new Date(valor).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

export function Versoes() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [base, setBase] = useState("");
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const controlador = new AbortController();
    fetch(`/api/versoes${base ? `?base=${base}` : ""}`, { signal: controlador.signal })
      .then((resposta) => resposta.json())
      .then((resultado: Dados) => setDados(resultado))
      .catch(() => setDados({ atual: null, versoes: [], comparacao: null, erro: "Não consegui carregar o histórico agora." }));
    return () => controlador.abort();
  }, [aberto, base]);

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <button type="button" onClick={() => setAberto((valor) => !valor)} className="flex w-full items-center justify-between gap-4 text-left">
        <span><span className="block text-xl font-bold">Histórico de versões</span><span className="text-sm text-slate-500">Veja o que mudou no sistema antes e depois de cada publicação.</span></span>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">{aberto ? "Fechar" : "Ver versões"}</span>
      </button>
      {aberto && (
        <div className="mt-6">
          {!dados && <p className="text-slate-600">Carregando versões…</p>}
          {dados?.erro && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{dados.erro}</p>}
          {dados?.atual && (
            <>
              <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950"><strong>Versão atual:</strong> {dados.atual.titulo} <code className="ml-1">{dados.atual.curta}</code> · publicada em {data(dados.atual.quando)}</p>
              <label className="mt-5 block font-semibold">Comparar a versão atual com:</label>
              <select value={base} onChange={(evento) => setBase(evento.target.value)} className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white p-3 outline-none focus:border-blue-600">
                <option value="">Escolha uma versão anterior</option>
                {dados.versoes.slice(1).map((versao) => <option key={versao.id} value={versao.id}>{versao.curta} · {versao.titulo} · {data(versao.quando)}</option>)}
              </select>
            </>
          )}
          {dados?.comparacao && (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <h3 className="font-bold">O que foi feito</h3>
                <ul className="mt-2 space-y-2 text-sm">{dados.comparacao.commits.map((commit) => <li key={commit.id} className="rounded-lg bg-blue-50 p-3"><code>{commit.id}</code> · {commit.titulo}</li>)}</ul>
              </div>
              <div>
                <h3 className="font-bold">Arquivos alterados</h3>
                <ul className="mt-2 space-y-2 text-sm">{dados.comparacao.arquivos.map((arquivo) => <li key={arquivo.nome} className="rounded-lg bg-slate-50 p-3"><code className="break-all">{arquivo.nome}</code><span className="block text-slate-600">{arquivo.situacao} · +{arquivo.adicoes} / -{arquivo.remocoes}</span></li>)}</ul>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
