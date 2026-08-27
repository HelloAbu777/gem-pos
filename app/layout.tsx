import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEM POS - Do'kon va Kassa Boshqaruvi",
  description: "Kichik va o'rta biznes uchun mo'ljallangan POS va inventarizatsiya tizimi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" className="h-full">
      <body className="min-h-full bg-white antialiased">{children}</body>
    </html>
  );
}
