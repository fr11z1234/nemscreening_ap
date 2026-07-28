import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nemscreening",
  description: "Ressourcekortlægning i felten",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Nemscreening",
    // black-translucent tegner altid statuslinjens tekst hvid. Pa en lys app
    // er den dermed usynlig — "default" giver mork tekst pa lys bund.
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover, sa appen bruger hele skaermen pa telefoner med notch.
  // Zoom er bevidst IKKE slaet fra — felterne er 16px, sa iOS zoomer ikke af
  // sig selv, og screeneren kan stadig forstorre et billede.
  viewportFit: "cover",
  // Appen er lys uanset styresystemet, sa browserlinjen skal ogsa vaere det.
  // Ellers far en bruger med morkt tema en navy stribe over en bone-flade.
  themeColor: "#f5f7fa",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="da"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
