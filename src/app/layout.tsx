import type { Metadata, Viewport } from "next";
import "@fontsource-variable/montserrat";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { CookieConsent } from "@/components/cookie-consent";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "LA BARBER STUDIO | Barbería en Fuenlabrada",
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/",
    siteName: SITE_NAME,
    title: "LA BARBER STUDIO | Barbería en Fuenlabrada",
    description: SITE_DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "LA BARBER STUDIO · Barbería en Fuenlabrada" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LA BARBER STUDIO | Barbería en Fuenlabrada",
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brand/lb-mark.svg", apple: "/brand/lb-mark-192.png" },
  appleWebApp: { capable: true, title: "LA BARBER", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">{children}<ServiceWorkerRegistration /><PwaInstallPrompt /><CookieConsent /></body>
    </html>
  );
}
