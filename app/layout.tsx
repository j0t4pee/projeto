import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // Importamos o arquivo que criamos

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Escala de Acólitos",
  description: "Gerenciamento de escalas paroquiais",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}