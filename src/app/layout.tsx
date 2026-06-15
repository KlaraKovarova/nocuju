import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "nocuju.cz — útulny a nouzová nocoviště v ČR",
    template: "%s | nocuju.cz",
  },
  description:
    "Mapa a katalog českých horských útulen a nouzových nocovišť. Volně přístupná místa pro přespání v přírodě — útulny, přístřešky, krizová nocoviště.",
  openGraph: {
    title: "nocuju.cz — útulny a nouzová nocoviště v ČR",
    description:
      "Mapa a katalog českých horských útulen a nouzových nocovišť.",
    locale: "cs_CZ",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1 w-full">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
