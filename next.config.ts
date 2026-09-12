import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O servidor compartilhado roda `next dev` atrás do túnel. Sem esta lista,
  // o Next 16 bloqueia os recursos de desenvolvimento pedidos pelo domínio
  // público e a página chega sem hidratar: o formulário não reage.
  allowedDevOrigins: ["habeastitas.eduardomila.adv.br"],
};

export default nextConfig;
