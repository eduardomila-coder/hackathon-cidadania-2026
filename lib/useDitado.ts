"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Ditado pelo microfone com a Web Speech API do navegador (Chrome/Edge/Safari).
// Sem servidor, sem custo: o próprio navegador transcreve.
type Reconhecedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type JanelaComVoz = {
  SpeechRecognition?: new () => Reconhecedor;
  webkitSpeechRecognition?: new () => Reconhecedor;
};

function construtor(): (new () => Reconhecedor) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as JanelaComVoz;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// `false` no servidor, valor real no cliente — sem erro de hidratação.
function useSuporteVoz() {
  return useSyncExternalStore(
    () => () => {},
    () => construtor() !== null,
    () => false,
  );
}

export function useDitado(aoReconhecer: (texto: string) => void) {
  const suportado = useSuporteVoz();
  const [gravando, setGravando] = useState(false);
  const ref = useRef<Reconhecedor | null>(null);
  const callback = useRef(aoReconhecer);
  useEffect(() => {
    callback.current = aoReconhecer;
  }, [aoReconhecer]);

  function iniciar() {
    const Ctor = construtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) callback.current(e.results[i][0].transcript.trim());
      }
    };
    r.onend = () => setGravando(false);
    ref.current = r;
    r.start();
    setGravando(true);
  }

  return { suportado, gravando, iniciar, parar: () => ref.current?.stop() };
}
