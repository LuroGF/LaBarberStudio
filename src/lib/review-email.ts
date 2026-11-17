import { formatMadrid } from "./schedule";

export function renderReviewRequestEmail(input: {
  businessName: string;
  customerName: string;
  service: string;
  startsAt: string;
  reviewUrl: string;
}) {
  const date = formatMadrid(input.startsAt, "EEEE d 'de' MMMM");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#111;color:#f5f5f5;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:36px 20px"><p style="font-size:12px;letter-spacing:3px;color:#c9a45c;font-weight:700">${escapeHtml(input.businessName)}</p><div style="margin-top:20px;border:1px solid #333;border-radius:20px;background:#1d1d1d;padding:28px"><h1 style="margin:0;font-size:24px">Gracias, ${escapeHtml(input.customerName)}</h1><p style="margin:16px 0;color:#c7c7c7;line-height:1.6">Esperamos que hayas disfrutado de tu visita. Tu opinión nos ayuda a seguir mejorando y permite que otras personas conozcan nuestro trabajo.</p><div style="margin-top:24px;padding:18px;border-radius:14px;background:#111"><p style="margin:0 0 8px;font-weight:700">${escapeHtml(input.service)}</p><p style="margin:0;color:#c7c7c7;text-transform:capitalize">${escapeHtml(date)}</p></div><a href="${escapeHtml(input.reviewUrl)}" style="display:inline-block;margin-top:24px;border-radius:999px;background:#c9a45c;color:#111;text-decoration:none;font-weight:700;padding:14px 22px">DEJAR UNA RESEÑA</a></div><p style="margin-top:20px;color:#777;font-size:12px;line-height:1.5">Este mensaje se envía una sola vez después de tu cita. No contiene publicidad.</p></div></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
}
