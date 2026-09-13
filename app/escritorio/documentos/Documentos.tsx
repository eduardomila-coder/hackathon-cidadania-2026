"use client";

import Link from "next/link";
import { useState } from "react";
import { chamar, mensagemDeErro } from "../casos/api";

export type DocumentoNaTela = {
  id: string;
  nome: string;
  detalhe: string;
  essencial: boolean;
  recebido: boolean;
  atualizadoEm: string;
};

export type GrupoDeDocumentos = {
  casoId: string;
  titulo: string;
  cliente: string | null;
  situacao: string;
  documentos: DocumentoNaTela[];
};

type Resumo = { pendentes: number; essenciaisPendentes: number; recebidos: number; grupos: number };

// A marcação de recebido grava pela rota do caso (PATCH /api/escritorio/casos/
// [id]/documentos), a mesma que a página do caso usa. O estado muda na hora e
// a lista se reordena na próxima abertura.
export function Documentos({ grupos, resumo }: { grupos: GrupoDeDocumentos[]; resumo: Resumo }) {
  const [mudancas, setMudancas] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const estadoDe = (documento: DocumentoNaTela) => mudancas[documento.id] ?? documento.recebido;

  async function alternar(casoId: string, documento: DocumentoNaTela) {
    const alvo = !estadoDe(documento);
    setSalvando(documento.id);
    setErro(null);
    setRecado(null);
    try {
      await chamar(`/api/escritorio/casos/${casoId}/documentos`, { metodo: "PATCH", corpo: { id: documento.id, recebido: alvo } });
      setMudancas((atual) => ({ ...atual, [documento.id]: alvo }));
      setRecado(alvo ? `"${documento.nome}" marcado como recebido.` : `"${documento.nome}" voltou para pendente.`);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(null);
    }
  }

  return <div className="pd-documentos">
    <div className="pd-pagina-cabeca">
      <div>
        <p className="pd-eyebrow">Documentos</p>
        <h1>Documentos por caso</h1>
        <p className="pd-auxiliar">O checklist de cada caso, com o que já chegou e o que falta pedir. Os itens marcados como essenciais são os que travam o andamento quando faltam. Cada documento pertence ao caso de onde veio.</p>
      </div>
      <div className="pd-pagina-acoes">
        <Link className="pd-botao pd-botao-secundario" href="/escritorio">Abrir meus casos</Link>
      </div>
    </div>

    <p className="pd-aviso">
      <strong>O que esta tela guarda.</strong> Cada caso abre com o checklist padrão de quatro documentos, e é ele que aparece aqui: nome, para que serve e se já foi recebido. O envio de arquivo ainda não está ligado nesta demonstração, e nada entra sozinho no checklist: o que o cliente manda por WhatsApp não vira documento aqui, é você que marca o item como recebido quando ele chega.
    </p>

    <dl className="pd-metricas">
      <div className={`pd-metrica${resumo.pendentes > 0 ? " pd-documentos-metrica-alerta" : ""}`}><dt>Pendentes</dt><dd>{resumo.pendentes}</dd><small>documentos ainda não recebidos</small></div>
      <div className={`pd-metrica${resumo.essenciaisPendentes > 0 ? " pd-documentos-metrica-risco" : ""}`}><dt>Essenciais pendentes</dt><dd>{resumo.essenciaisPendentes}</dd><small>travam o andamento quando faltam</small></div>
      <div className="pd-metrica"><dt>Recebidos</dt><dd>{resumo.recebidos}</dd><small>já conferidos e marcados</small></div>
      <div className="pd-metrica"><dt>Casos com checklist</dt><dd>{resumo.grupos}</dd><small>casos com documentos a pedir</small></div>
    </dl>

    <p className="pd-documentos-recado" role="status" aria-live="polite">{erro ? <span className="pd-documentos-erro">{erro}</span> : recado}</p>

    {grupos.length === 0
      ? <div className="pd-vazio">
        <strong>Nenhum checklist ainda.</strong>
        O checklist de documentos nasce junto com o caso: abra <Link href="/escritorio">um caso</Link> ou registre uma nomeação, e os quatro documentos padrão aparecem aqui para acompanhar.
      </div>
      : grupos.map((grupo) => {
        const pendentes = grupo.documentos.filter((documento) => !estadoDe(documento));
        const essenciais = pendentes.filter((documento) => documento.essencial).length;
        // Pendente primeiro, essencial na frente; o que já foi marcado desce.
        const ordenados = [...grupo.documentos].sort((a, b) => {
          const recebidoDe = (documento: DocumentoNaTela) => (estadoDe(documento) ? 1 : 0);
          return recebidoDe(a) - recebidoDe(b) || Number(b.essencial) - Number(a.essencial) || a.nome.localeCompare(b.nome, "pt-BR");
        });

        return <section className="pd-cartao" key={grupo.casoId}>
          <div className="pd-cartao-cabeca pd-documentos-cabeca">
            <div className="pd-documentos-caso">
              <h2>{grupo.titulo}</h2>
              <p className="pd-linha-meta">{grupo.cliente ?? "sem cliente vinculado"} · {grupo.situacao}</p>
            </div>
            <div className="pd-documentos-caso-acoes">
              {essenciais > 0
                ? <span className="pd-estado pd-estado-risco">{essenciais} {essenciais === 1 ? "essencial pendente" : "essenciais pendentes"}</span>
                : pendentes.length > 0
                  ? <span className="pd-estado pd-estado-atencao">{pendentes.length} {pendentes.length === 1 ? "pendente" : "pendentes"}</span>
                  : <span className="pd-estado pd-estado-ok">Checklist completo</span>}
              <Link className="pd-botao pd-botao-pequeno pd-botao-secundario" href={`/escritorio/casos/${grupo.casoId}`}>Abrir caso</Link>
            </div>
          </div>

          <div className="pd-lista">
            {ordenados.map((documento) => {
              const recebido = estadoDe(documento);
              return <div className="pd-linha pd-documentos-linha" key={documento.id}>
                <div className="pd-documentos-celula">
                  <p className="pd-linha-titulo">{documento.nome}</p>
                  <p className="pd-linha-meta">{documento.detalhe || "sem observação"}</p>
                </div>
                <div className="pd-documentos-celula">
                  {recebido
                    ? <span className="pd-estado pd-estado-ok">Recebido</span>
                    : documento.essencial
                      ? <span className="pd-estado pd-estado-risco">Pendente essencial</span>
                      : <span className="pd-estado pd-estado-atencao">Pendente</span>}
                  <p className="pd-linha-meta">
                    {mudancas[documento.id] === undefined ? `atualizado em ${documento.atualizadoEm}` : "alterado agora"}
                  </p>
                </div>
                <div className="pd-documentos-acao">
                  <button
                    type="button"
                    className={`pd-botao pd-botao-pequeno ${recebido ? "pd-botao-quieto" : "pd-botao-secundario"}`}
                    onClick={() => alternar(grupo.casoId, documento)}
                    disabled={salvando === documento.id}
                  >{salvando === documento.id ? "Salvando…" : recebido ? "Desmarcar" : "Marcar recebido"}</button>
                </div>
              </div>;
            })}
          </div>
        </section>;
      })}
  </div>;
}
