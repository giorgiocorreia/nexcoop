import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'NexCoop — Gestão para Cooperativas e Associações',
  description: 'Plataforma SaaS para gestão de cooperativas e associações brasileiras. Controle filiados, finanças, assembleias, documentos e muito mais.',
  icons: {
    icon: '/images/logo-nexcoop-onlyone.png',
    apple: '/images/logo-nexcoop-onlyone.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      </head>
      <body className={inter.className}>
        {children}
        {/* Toaster global do sonner — primeira tela do projeto a usar a dep
            (carteirinha do filiado, fase 2). Posição top-right não conflita
            com o chrome fixo do sistema (sidebar/topbar ficam à esquerda/topo). */}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
