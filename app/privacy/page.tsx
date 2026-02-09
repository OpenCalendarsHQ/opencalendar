"use client";

import Image from "next/image";
import Link from "next/link";
import Aurora from "@/components/animations/aurora";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-black overflow-hidden">
      {/* Aurora WebGL Background */}
      <div className="absolute inset-0 w-full h-full">
        <Aurora
          colorStops={["#0080ff", "#00ffff", "#004080"]}
          blend={0.5}
          amplitude={1.0}
          speed={1}
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black/60 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15)_0%,transparent_50%)]" />
        <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-black/40 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black/40 to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/icon.png" alt="OpenCalendar" width={40} height={40} />
          <span className="font-pixel text-2xl font-bold text-white">OPENCALENDAR</span>
        </Link>
        <Link
          href="/welcome"
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-6 py-12 md:px-12">
        <div className="mx-auto max-w-4xl">
          {/* Icon & Title */}
          <div className="mb-8 space-y-4">
            <div className="flex justify-start">
              <div className="rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-4 backdrop-blur-sm border border-blue-500/20">
                <Shield className="h-12 w-12 text-blue-400" />
              </div>
            </div>
            <h1 className="font-pixel text-4xl font-bold text-white md:text-5xl">
              Privacy Policy
            </h1>
            <p className="text-sm text-zinc-500">Last updated: February 9, 2026</p>
          </div>

          {/* Content */}
          <div className="space-y-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm md:p-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">1. Introduction</h2>
              <p className="text-zinc-300">
                Welcome to OpenCalendar. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our calendar synchronization service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">2. Information We Collect</h2>
              <div className="space-y-3 text-zinc-300">
                <div>
                  <h3 className="mb-2 font-semibold text-white">2.1 Account Information</h3>
                  <p>
                    When you create an account, we collect your email address and authentication credentials. We use Supabase Auth for secure authentication.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">2.2 Calendar Data</h3>
                  <p>
                    To provide our synchronization service, we access and store your calendar events from connected providers (Google Calendar, iCloud Calendar, Microsoft Outlook). This includes:
                  </p>
                  <ul className="ml-6 mt-2 list-disc space-y-1">
                    <li>Event titles, descriptions, and locations</li>
                    <li>Event dates, times, and time zones</li>
                    <li>Event recurrence patterns</li>
                    <li>Calendar names and colors</li>
                    <li>Event attendees and organizers</li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">2.3 OAuth Tokens</h3>
                  <p>
                    We securely store OAuth access and refresh tokens for your connected calendar providers. These tokens are encrypted and used only to sync your calendar data.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">2.4 Usage Data</h3>
                  <p>
                    We collect basic usage information such as sync timestamps and error logs to improve service reliability.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">3. How We Use Your Information</h2>
              <div className="space-y-2 text-zinc-300">
                <p>We use your information to:</p>
                <ul className="ml-6 list-disc space-y-1">
                  <li>Synchronize calendar events between your connected providers</li>
                  <li>Display your unified calendar view</li>
                  <li>Send you important service updates and security notifications</li>
                  <li>Improve and optimize our service</li>
                  <li>Provide customer support</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">4. Data Storage and Security</h2>
              <div className="space-y-3 text-zinc-300">
                <p>
                  Your data is stored securely using industry-standard encryption. We use:
                </p>
                <ul className="ml-6 list-disc space-y-1">
                  <li>Supabase PostgreSQL for database storage with encryption at rest</li>
                  <li>HTTPS/TLS for all data transmission</li>
                  <li>OAuth 2.0 for secure third-party authentication</li>
                  <li>Regular security audits and updates</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">5. Data Sharing</h2>
              <div className="space-y-3 text-zinc-300">
                <p>
                  We do not sell, trade, or rent your personal information to third parties. Your calendar data is only shared with:
                </p>
                <ul className="ml-6 list-disc space-y-1">
                  <li>The calendar providers you explicitly connect (Google, Apple, Microsoft)</li>
                  <li>Service providers necessary for app functionality (Supabase for hosting)</li>
                </ul>
                <p className="mt-3">
                  We may disclose your information if required by law or to protect our rights and the safety of our users.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">6. Third-Party Services</h2>
              <div className="space-y-3 text-zinc-300">
                <p>
                  OpenCalendar integrates with third-party calendar providers:
                </p>
                <ul className="ml-6 list-disc space-y-1">
                  <li>Google Calendar (Google LLC)</li>
                  <li>iCloud Calendar (Apple Inc.)</li>
                  <li>Microsoft Outlook Calendar (Microsoft Corporation)</li>
                </ul>
                <p className="mt-3">
                  These services have their own privacy policies. We recommend reviewing them to understand how they handle your data.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">7. Your Rights</h2>
              <div className="space-y-2 text-zinc-300">
                <p>You have the right to:</p>
                <ul className="ml-6 list-disc space-y-1">
                  <li>Access your personal data</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your account and all associated data</li>
                  <li>Disconnect calendar providers at any time</li>
                  <li>Export your data</li>
                  <li>Opt-out of non-essential communications</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">8. Data Retention</h2>
              <p className="text-zinc-300">
                We retain your data for as long as your account is active. When you delete your account, we permanently delete all your personal data and calendar information within 30 days, except where retention is required by law.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">9. Children's Privacy</h2>
              <p className="text-zinc-300">
                OpenCalendar is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">10. Changes to This Policy</h2>
              <p className="text-zinc-300">
                We may update this privacy policy from time to time. We will notify you of significant changes by email or through a notice in the app. Your continued use of OpenCalendar after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">11. Contact Us</h2>
              <p className="text-zinc-300">
                If you have questions about this privacy policy or your data, please contact us at:
              </p>
              <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
                <p className="font-medium text-white">Email: privacy@opencalendar.app</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Or open an issue on our{" "}
                  <Link
                    href="https://github.com/ArjandenHartog/opencalendar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    GitHub repository
                  </Link>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 px-6 py-6 md:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-zinc-500">
              © 2026 OpenCalendar. Open source software.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/privacy"
                className="text-zinc-400 transition-colors hover:text-white"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-zinc-400 transition-colors hover:text-white"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
