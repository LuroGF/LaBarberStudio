import { describe, expect, it } from "vitest";
import { buildHairSalonJsonLd, serializeJsonLd } from "../../src/lib/seo";

const service = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Corte de pelo",
  description: "Corte personalizado",
  price_cents: 1100,
  duration_minutes: 40,
  is_active: true,
  sort_order: 1,
};

describe("SEO local", () => {
  it("builds HairSalon data from current services and hours", () => {
    const schema = buildHairSalonJsonLd(
      {
        business_name: "LA BARBER STUDIO",
        address: "Calle de Gazaperas 18, Fuenlabrada, Madrid",
        phone_whatsapp: "+34664573491",
        instagram_handle: "@labarber.studio",
      },
      [service],
      [{ id: "hour", weekday: 1, start_time: "10:00:00", end_time: "14:00:00" }],
    );

    expect(schema["@type"]).toBe("HairSalon");
    expect(schema.telephone).toBe("+34664573491");
    expect(schema.priceRange).toBe("11 €");
    expect(schema.address).toEqual(expect.objectContaining({
      streetAddress: "Calle de Gazaperas 18",
      addressLocality: "Fuenlabrada",
      addressRegion: "Madrid",
    }));
    expect(schema.openingHoursSpecification).toEqual([
      expect.objectContaining({ dayOfWeek: "https://schema.org/Monday", opens: "10:00", closes: "14:00" }),
    ]);
    expect(schema.hasOfferCatalog.itemListElement[0]).toEqual(
      expect.objectContaining({ price: "11.00", priceCurrency: "EUR" }),
    );
  });

  it("escapes markup when serializing JSON-LD", () => {
    expect(serializeJsonLd({ value: "</script><script>" })).not.toContain("<");
    expect(serializeJsonLd({ value: "</script><script>" })).toContain("\\u003c/script>");
  });
});
