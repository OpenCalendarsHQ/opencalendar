"use client";

import Script from "next/script";

export function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "OpenCalendars",
    url: "https://opencalendars.app",
    logo: "https://opencalendars.app/icon-512.png",
    description: "OpenCalendars brengt al je Google Calendar en iCloud events samen in één overzichtelijke kalender.",
    sameAs: [
      "https://github.com/ArjandenHartog/opencalendar",
    ],
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "OpenCalendars",
    applicationCategory: "Productivity",
    operatingSystem: "Web, Windows, macOS, Linux",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "100",
    },
    featureList: [
      "Google Calendar sync",
      "iCloud Calendar sync",
      "Microsoft Calendar sync",
      "CalDAV ondersteuning",
      "Desktop app",
      "Herhalende events",
      "Offline ondersteuning",
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "OpenCalendars",
    url: "https://opencalendars.app",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://opencalendars.app/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <Script
        id="structured-data-org"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <Script
        id="structured-data-software"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareSchema),
        }}
      />
      <Script
        id="structured-data-website"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
    </>
  );
}
