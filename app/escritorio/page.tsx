"use client";

import { useAdvogado } from "./Advogado";

// Esqueleto: o módulo 2 (Casos) substitui esta página pelo painel de verdade.
export default function Painel() {
  const advogado = useAdvogado();
  return <section className="pd-cartao">
    <p className="md-eyebrow">Painel</p>
    <h1>Painel do advogado em construção</h1>
    <p>Olá, {advogado.nome}. Em breve seus casos, prazos e mensagens aparecem aqui.</p>
  </section>;
}
