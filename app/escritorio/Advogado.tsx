"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AdvogadoPublico } from "@/lib/contas";

// O layout (server) lê o advogado da sessão e entrega aqui; qualquer tela ou
// componente cliente do escritório pega com `useAdvogado()`.
const ContextoDoAdvogado = createContext<AdvogadoPublico | null>(null);

export function AdvogadoProvider({ advogado, children }: { advogado: AdvogadoPublico; children: ReactNode }) {
  return <ContextoDoAdvogado.Provider value={advogado}>{children}</ContextoDoAdvogado.Provider>;
}

export function useAdvogado(): AdvogadoPublico {
  const advogado = useContext(ContextoDoAdvogado);
  if (!advogado) throw new Error("useAdvogado só funciona dentro de /escritorio.");
  return advogado;
}
