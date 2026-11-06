import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SADAR —   Sistem Analisis Data & Antisipasi Risiko",
  description: "Belajar mengenali risiko digital dan mengambil keputusan dengan lebih aman."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
