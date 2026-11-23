import { SITE_URL } from "./site";
import type { BusinessHourRow, Service } from "./types";

type SeoBusinessSettings = {
  business_name: string;
  address: string;
  phone_whatsapp: string;
  instagram_handle: string;
};

const schemaDays: Record<number, string> = {
  1: "https://schema.org/Monday",
  2: "https://schema.org/Tuesday",
  3: "https://schema.org/Wednesday",
  4: "https://schema.org/Thursday",
  5: "https://schema.org/Friday",
  6: "https://schema.org/Saturday",
  7: "https://schema.org/Sunday",
};

function priceRange(services: Service[]): string {
  if (!services.length) return "€";
  const prices = services.map((service) => service.price_cents);
  const minimum = Math.min(...prices) / 100;
  const maximum = Math.max(...prices) / 100;
  const format = (value: number) => `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value)} €`;
  return minimum === maximum ? format(minimum) : `${format(minimum)}–${format(maximum)}`;
}

export function buildHairSalonJsonLd(
  settings: SeoBusinessSettings,
  services: Service[],
  hours: BusinessHourRow[],
) {
  const instagramHandle = settings.instagram_handle.replace(/^@/, "").trim();
  const telephone = settings.phone_whatsapp.trim();
  const addressParts = settings.address.split(",").map((part) => part.trim()).filter(Boolean);
  const hasStreetAddress = addressParts.length >= 3;

  return {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    "@id": `${SITE_URL}/#business`,
    name: settings.business_name,
    url: `${SITE_URL}/`,
    image: [
      `${SITE_URL}/opengraph-image`,
      `${SITE_URL}/brand/barbershop-hero-v1.webp`,
    ],
    logo: `${SITE_URL}/brand/lb-mark-512.png`,
    ...(telephone ? { telephone } : {}),
    priceRange: priceRange(services),
    currenciesAccepted: "EUR",
    address: {
      "@type": "PostalAddress",
      ...(hasStreetAddress ? { streetAddress: addressParts[0] } : {}),
      addressLocality: addressParts.at(-2) || "Fuenlabrada",
      addressRegion: addressParts.at(-1) || "Madrid",
      addressCountry: "ES",
    },
    areaServed: { "@type": "City", name: "Fuenlabrada" },
    ...(instagramHandle ? { sameAs: [`https://www.instagram.com/${instagramHandle}/`] } : {}),
    openingHoursSpecification: hours.flatMap((row) => {
      const dayOfWeek = schemaDays[row.weekday];
      return dayOfWeek ? [{
        "@type": "OpeningHoursSpecification",
        dayOfWeek,
        opens: row.start_time.slice(0, 5),
        closes: row.end_time.slice(0, 5),
      }] : [];
    }),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Servicios de barbería",
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        url: `${SITE_URL}/reservar?servicio=${service.id}`,
        price: (service.price_cents / 100).toFixed(2),
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        itemOffered: {
          "@type": "Service",
          name: service.name,
          ...(service.description ? { description: service.description } : {}),
        },
      })),
    },
    potentialAction: {
      "@type": "ReserveAction",
      target: `${SITE_URL}/reservar`,
      name: "Reservar cita",
    },
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
