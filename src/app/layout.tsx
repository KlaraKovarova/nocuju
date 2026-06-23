import type { Metadata } from "next";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

import "./globals.css";

const SITE_TITLE = "nocuju.cz — útulny a nouzová nocoviště v ČR";
const SITE_DESCRIPTION =
  "Mapa a katalog volně přístupných útulen, srubů a nouzových nocovišť v Česku. Přespej v přírodě bez rezervací a poplatků.";

export const metadata: Metadata = {
  metadataBase: new URL("https://nocuju.cz"),
  title: {
    default: SITE_TITLE,
    template: "%s | nocuju.cz",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "cs_CZ",
    siteName: "nocuju.cz",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
