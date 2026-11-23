import { ImageResponse } from "next/og";
import { SITE_URL } from "@/lib/site";

export const alt = "LA BARBER STUDIO · Barbería en Fuenlabrada";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const siteHost = new URL(SITE_URL).host;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#111111",
        color: "#f7f7f7",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background: "linear-gradient(120deg, #111111 0%, #1f1f1f 55%, #111111 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          right: -110,
          top: -130,
          display: "flex",
          border: "2px solid rgba(201,164,92,0.35)",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          right: -30,
          bottom: -210,
          display: "flex",
          background: "rgba(201,164,92,0.12)",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 52, height: 3, display: "flex", background: "#c9a45c" }} />
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.2em", color: "#d6b66f" }}>
            BARBERÍA EN FUENLABRADA
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 900, letterSpacing: "-0.045em" }}>
            LA BARBER
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 4 }}>
            <div style={{ width: 62, height: 2, display: "flex", background: "#c9a45c" }} />
            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "0.34em" }}>STUDIO</span>
            <div style={{ width: 62, height: 2, display: "flex", background: "#c9a45c" }} />
          </div>
          <div style={{ display: "flex", marginTop: 40, fontSize: 28, color: "#c8c8c8" }}>
            Tu estilo. Tus reglas. Reserva tu cita online.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: "#d6b66f" }}>
          {siteHost}
        </div>
      </div>
    </div>,
    size,
  );
}
