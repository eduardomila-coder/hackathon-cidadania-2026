import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Escritório Dativo | Ambiente profissional",
  description: "Protótipo de escritório de apoio para organizar o atendimento da advocacia dativa.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
