import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
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
  title: "OpenCalendar",
  description: "Een moderne kalender app met Google en iCloud sync",
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
    title: "OpenCalendar",
  },
  other: {
    "mobile-web-app-capable": "yes",
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
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
