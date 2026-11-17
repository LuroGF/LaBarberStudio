import { describe, expect, it } from "vitest";
import { renderReviewRequestEmail } from "../../src/lib/review-email";

describe("solicitud de reseña", () => {
  it("incluye el enlace y escapa los datos introducidos", () => {
    const html = renderReviewRequestEmail({
      businessName: "LA BARBER & STUDIO",
      customerName: "Álvaro <script>",
      service: "Corte & barba",
      startsAt: "2026-11-17T10:00:00.000Z",
      reviewUrl: "https://g.page/r/example/review?x=1&y=2",
    });

    expect(html).toContain("DEJAR UNA RESEÑA");
    expect(html).toContain("https://g.page/r/example/review?x=1&amp;y=2");
    expect(html).toContain("LA BARBER &amp; STUDIO");
    expect(html).not.toContain("<script>");
  });
});
