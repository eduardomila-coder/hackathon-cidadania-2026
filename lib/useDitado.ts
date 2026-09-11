"use client";

import { useEffect, useRef, useState } from "react";

// Ditado pelo microfone com a Web Speech API do navegador (Chrome/Edge/Safari).
// Sem servidor, sem custo: o próprio navegador transcreve.
type Reconhecedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

function criarReconhecedor(): Reconhecedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconhecedor; webkitSpeechRecognition?: new () => Reconhecedor };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function useDitado(aoReconhecer: (texto: string) => void) {
  const [suportado, setSuportado] = useState(false);
  const [gravando, setGravando] = useState(false);
  const ref = useRef<Reconhecedor | null>(null);

  useEffect(() => {
    const r = criarReconhecedor();
    if (!r) return;
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) aoReconhecer(e.results[i][0].transcript.trim());
      }
    };
    r.onend = () => setGravando(false);
    ref.current = r;
    setSuportado(true);
  }, [aoReconhecer]);

  return {
    suportado,
    gravando,
    iniciar: () => {
      ref.current?.start();
      setGravando(true);
    },
    parar: () => ref.current?.stop(),
  };
}
