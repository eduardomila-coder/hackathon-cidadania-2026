import Link from "next/link";
import { listarRevisoes, type Revisao } from "@/lib/revisoes";
import "../painel/painel.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Habeas Release" };

function quando(data: string) {
  return new Date(data).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

const cor = { ok: "bg-emerald-100 text-emerald-900", falhou: "bg-red-100 text-red-900", pendente: "bg-amber-100 text-amber-900" };
const texto = { ok: "passou", falhou: "falhou", pendente: "precisa conferir" };

export default async function Revisoes() {
  const revisoes = await listarRevisoes();
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-5 py-7 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-700">Central de publicação</p>
            <h1 className="text-4xl font-black tracking-tight">Habeas Release</h1>
            <p className="mt-2 text-slate-600">Mudanças só chegam ao site depois da sua aprovação.</p>
          </div>
          <Link href="/painel" className="rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold hover:border-blue-600">← Painel da equipe</Link>
        </header>

        <section className="mb-7 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="font-bold">Como aprovar</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-700">
            <li>Leia o resumo e os alertas abaixo.</li>
            <li>Abra a mudança no GitHub e confira a prévia.</li>
            <li>Se estiver certa, use <strong>Merge pull request</strong>. A versão entra no site em até um minuto.</li>
          </ol>
          <p className="mt-3 text-sm text-slate-600">O botão de mesclar fica no GitHub para exigir sua conta. Nenhuma pessoa consegue publicar pelo site público.</p>
        </section>

        {revisoes === null && <Aviso>Não consegui consultar o GitHub agora. Confira a conexão e atualize a página.</Aviso>}
        {revisoes?.length === 0 && <Aviso>Não há mudanças esperando sua aprovação. Quando Maria ou Fernando enviar uma, ela aparece aqui.</Aviso>}
        <div className="flex flex-col gap-5">
          {revisoes?.map((revisao) => <Cartao key={revisao.numero} revisao={revisao} />)}
        </div>
      </div>
    </main>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">{children}</div>;
}

function Cartao({ revisao }: { revisao: Revisao }) {
  const pronto = revisao.alertas.length === 0 && revisao.verificacoes.every((verificacao) => verificacao.resultado === "ok");
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-700">Mudança #{revisao.numero} enviada por {revisao.autor}</p>
          <h2 className="mt-1 text-2xl font-bold">{revisao.titulo}</h2>
          <p className="mt-2 text-sm text-slate-500">Branch: <code>{revisao.branch}</code> · Atualizada em {quando(revisao.atualizadaEm)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${pronto ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{pronto ? "Pronta para aprovar" : "Precisa revisar"}</span>
      </div>
      {revisao.descricao && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-slate-700">{revisao.descricao}</p>}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="font-semibold">O que mudou</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {revisao.arquivos.map((arquivo) => <li key={arquivo.nome} className="rounded-lg bg-slate-50 px-3 py-2"><code className="break-all">{arquivo.nome}</code><span className="ml-2 text-slate-500">{arquivo.situacao} · +{arquivo.adicoes} / -{arquivo.remocoes}</span></li>)}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Checklist</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {revisao.verificacoes.map((verificacao) => <li key={verificacao.nome} className={`rounded-lg px-3 py-2 ${cor[verificacao.resultado]}`}>{verificacao.nome}: {texto[verificacao.resultado]}</li>)}
          </ul>
          {revisao.alertas.length > 0 && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"><strong>Atenção antes de aprovar</strong><ul className="mt-1 list-disc pl-5">{revisao.alertas.map((alerta) => <li key={alerta}>{alerta}</li>)}</ul></div>}
        </div>
      </div>
      <a href={revisao.url} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800">Abrir, aprovar e publicar no GitHub ↗</a>
    </article>
  );
}
