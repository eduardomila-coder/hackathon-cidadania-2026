// As cinco etapas do fluxo de honorários dativos, como no protótipo.
//
// Mora num módulo sem "use client" de propósito: a página é servidor e a tela é
// cliente, e um valor exportado de um módulo de cliente chega ao servidor como
// referência, não como array — foi o que quebrou a tela de Honorários em
// 13/09/2026 ("ETAPAS_PADRAO.map is not a function"). Constante compartilhada
// entre servidor e cliente fica fora dos dois.
export const ETAPAS_PADRAO = ["Arbitramento", "Certidão judicial", "Checklist", "Requerimento", "Acompanhamento"];
