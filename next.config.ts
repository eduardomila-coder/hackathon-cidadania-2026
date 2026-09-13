import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O servidor compartilhado roda `next dev` atrás do túnel. Sem esta lista,
  // o Next 16 bloqueia os recursos de desenvolvimento pedidos por outro
  // domínio e a página chega sem hidratar: o formulário não reage.
  //
  // Atenção: definir a lista substitui a permissão padrão de `localhost`.
  // Com só o domínio do túnel aqui, abrir por `127.0.0.1` ou pelo IP da rede
  // local (é assim que Fernando e Maria abrem, pela pasta compartilhada)
  // deixava o login morto. Todo nome ou IP por onde a demonstração é aberta
  // precisa estar nesta lista.
  allowedDevOrigins: [
    "escritoriodativo.eduardomila.adv.br",
    "localhost",
    "127.0.0.1",
    "192.168.2.1",
  ],
};

export default nextConfig;
