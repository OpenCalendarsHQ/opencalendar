import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { StructuredData } from "@/components/seo/structured-data";
import { Analytics } from "@vercel/analytics/react";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://opencalendars.app"),
  title: {
    default: "OpenCalendars - Al je kalenders op één plek",
    template: "%s | OpenCalendars",
  },
  description: "OpenCalendars brengt al je Google Calendar en iCloud events samen in één overzichtelijke kalender. Gratis, open source en met desktop app.",
  keywords: ["kalender", "agenda", "google calendar", "icloud", "microsoft calendar", "caldav", "sync", "desktop app", "open source"],
  authors: [{ name: "OpenCalendars", url: "https://opencalendars.app" }],
  creator: "OpenCalendars",
  publisher: "OpenCalendars",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    alternateLocale: "en_US",
    url: "https://opencalendars.app",
    title: "OpenCalendars - Al je kalenders op één plek",
    description: "OpenCalendars brengt al je Google Calendar en iCloud events samen in één overzichtelijke kalender. Gratis, open source en met desktop app.",
    siteName: "OpenCalendars",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpenCalendars - Al je kalenders op één plek",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenCalendars - Al je kalenders op één plek",
    description: "OpenCalendars brengt al je Google Calendar en iCloud events samen in één overzichtelijke kalender. Gratis, open source en met desktop app.",
    images: ["/og-image.png"],
  },
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "/",
    languages: {
      nl: "/",
      en: "/en",
    },
  },
  icons: {
    icon: [
      { url: "/icon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/apple-icon-180.svg", type: "image/svg+xml", sizes: "180x180" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OpenCalendars",
    startupImage: [
      { url: "/splash-640x1136.png", media: "(device-width: 320px) and (device-height: 568px)" },
      { url: "/splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px)" },
      { url: "/splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px)" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "theme-color": "#0a0a0a",
    "msapplication-TileColor": "#0a0a0a",
    "msapplication-config": "/browserconfig.xml",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} font-sans antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var colorScheme = localStorage.getItem('colorScheme') || 'default';
                  var compactMode = localStorage.getItem('compactMode') === 'true';
                  var root = document.documentElement;

                  // Apply theme
                  if (theme === 'light') {
                    root.classList.add('light');
                  } else if (theme === 'dark') {
                    root.classList.add('dark');
                  } else {
                    // Auto mode - detect system preference
                    var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    root.classList.add(isDark ? 'dark' : 'light');
                  }

                  // Apply color scheme
                  root.classList.add('scheme-' + colorScheme);

                  // Apply compact mode
                  if (compactMode) {
                    root.classList.add('compact');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        <StructuredData />
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
