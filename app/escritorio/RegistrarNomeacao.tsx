"use client";

import { useState } from "react";
import { NovaNomeacao } from "./casos/NovaNomeacao";
import { NovoCaso } from "./casos/NovoCaso";
import type { Cliente } from "@/lib/escritorio";
import "./lista.css";

// Botão "Registrar nomeação" do protótipo, que aqui abre o formulário de
// leitura da intimação logo abaixo do cabeçalho da página.
export function RegistrarNomeacao({ classe = "btn btn-secondary", texto = "Registrar nomeação", clientes }: { classe?: string; texto?: string; clientes?: Cliente[] }) {
  const [aberto, setAberto] = useState<"nenhum" | "nomeacao" | "caso">("nenhum");
  return <>
    <button type="button" className={classe} onClick={() => setAberto((valor) => valor === "nomeacao" ? "nenhum" : "nomeacao")} aria-pressed={aberto === "nomeacao"}>{texto}</button>
    {clientes && <button type="button" className="btn btn-primary" onClick={() => setAberto((valor) => valor === "caso" ? "nenhum" : "caso")} aria-pressed={aberto === "caso"}>Novo caso</button>}
    {aberto !== "nenhum" && <div className="painel-flutuante">
      {aberto === "nomeacao"
        ? <NovaNomeacao aoFechar={() => setAberto("nenhum")} />
        : <NovoCaso clientes={clientes ?? []} aoFechar={() => setAberto("nenhum")} />}
    </div>}
  </>;
}
