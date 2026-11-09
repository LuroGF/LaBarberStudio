import type { Metadata, Viewport } from "next";
import "@fontsource-variable/montserrat";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

export const metadata: Metadata = {
  title: "LA BARBER STUDIO | Barbería en Fuenlabrada",
  description: "Reserva tu cita en LA BARBER STUDIO, Fuenlabrada (Madrid).",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brand/lb-mark.svg", apple: "/brand/lb-mark-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">{children}<ServiceWorkerRegistration /></body>
    </html>
  );
}
