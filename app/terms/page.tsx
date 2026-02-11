"use client";

import Image from "next/image";
import Link from "next/link";
import Aurora from "@/components/animations/aurora";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
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
          <Image src="/icon.png" alt="OpenCalendars"
 width={40} height={40} />
          <span className="font-pixel text-2xl font-bold text-white">OPENCALENDARS</span>

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
                <FileText className="h-12 w-12 text-blue-400" />
              </div>
            </div>
            <h1 className="font-pixel text-4xl font-bold text-white md:text-5xl">
              Terms of Service
            </h1>
            <p className="text-sm text-zinc-500">Last updated: February 9, 2026</p>
          </div>

          {/* Content */}
          <div className="space-y-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm md:p-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">1. Agreement to Terms</h2>
              <p className="text-zinc-300">
                By accessing or using OpenCalendars
, you agree to be bound by these Terms of Service and our Privacy Policy. If you disagree with any part of these terms, you may not use our service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">2. Description of Service</h2>
              <p className="text-zinc-300">
                OpenCalendars is a calendar synchronization
 and management platform that allows you to connect and view multiple calendar providers (Google Calendar, iCloud Calendar, Microsoft Outlook) in a unified interface. The service is provided "as is" and "as available."
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">3. User Accounts</h2>
              <div className="space-y-3 text-zinc-300">
                <div>
                  <h3 className="mb-2 font-semibold text-white">3.1 Account Creation</h3>
                  <p>
                    To use OpenCalendars
, you must create an account. You agree to:
                  </p>
                  <ul className="ml-6 mt-2 list-disc space-y-1">
                    <li>Provide accurate, current, and complete information</li>
                    <li>Maintain and update your information to keep it accurate</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Accept responsibility for all activities under your account</li>
                    <li>Notify us immediately of any unauthorized access</li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">3.2 Age Requirement</h3>
                  <p>
                    You must be at least 13 years old to use OpenCalendar. By using the service, you represent that you meet this age requirement.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">3.3 Account Termination</h3>
                  <p>
                    You may delete your account at any time through the settings page. We reserve the right to suspend or terminate accounts that violate these terms.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">4. Calendar Provider Authorization</h2>
              <div className="space-y-3 text-zinc-300">
                <p>
                  When you connect calendar providers to OpenCalendars
, you authorize us to:
                </p>
                <ul className="ml-6 list-disc space-y-1">
                  <li>Access your calendar events and metadata</li>
                  <li>Create, modify, and delete events on your behalf</li>
                  <li>Sync changes between your connected calendars</li>
                  <li>Store calendar data for synchronization purposes</li>
                </ul>
                <p className="mt-3">
                  You can revoke these permissions at any time by disconnecting the calendar provider in your settings.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">5. Acceptable Use</h2>
              <div className="space-y-3 text-zinc-300">
                <p>You agree not to:</p>
                <ul className="ml-6 list-disc space-y-1">
                  <li>Use the service for any illegal purpose or in violation of any laws</li>
                  <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                  <li>Interfere with or disrupt the service or servers</li>
                  <li>Use automated systems to access the service without permission</li>
                  <li>Reverse engineer, decompile, or disassemble any part of the service</li>
                  <li>Remove or modify any proprietary notices</li>
                  <li>Use the service to transmit viruses, malware, or harmful code</li>
                  <li>Abuse or harass other users or our support team</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">6. Open Source License</h2>
              <div className="space-y-3 text-zinc-300">
                <p>
                  OpenCalendars is open source software
. The source code is available under the MIT License on GitHub. While the software is freely available, these Terms of Service govern the use of the hosted service at opencalendar.app.
                </p>
                <p className="mt-3">
                  You may fork, modify, and distribute the source code according to the MIT License terms, but you must host your own instance if you make modifications.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">7. Data and Privacy</h2>
              <p className="text-zinc-300">
                Your use of OpenCalendars is also governed
 by our Privacy Policy. By using the service, you consent to our collection and use of your data as described in the Privacy Policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">8. Third-Party Services</h2>
              <div className="space-y-3 text-zinc-300">
                <p>
                  OpenCalendars integrates with third-party
 services (Google, Apple, Microsoft). Your use of these services through OpenCalendars is subject
 to their respective terms of service:
                </p>
                <ul className="ml-6 mt-2 list-disc space-y-1">
                  <li>Google Calendar: Google Terms of Service</li>
                  <li>iCloud Calendar: Apple Terms of Service</li>
                  <li>Microsoft Outlook: Microsoft Services Agreement</li>
                </ul>
                <p className="mt-3">
                  We are not responsible for the availability, content, or practices of these third-party services.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">9. Service Availability</h2>
              <div className="space-y-3 text-zinc-300">
                <p>
                  We strive to provide reliable service, but we do not guarantee:
                </p>
                <ul className="ml-6 list-disc space-y-1">
                  <li>Uninterrupted or error-free operation</li>
                  <li>That the service will meet your specific requirements</li>
                  <li>That data synchronization will be instantaneous</li>
                  <li>Prevention of data loss or corruption</li>
                </ul>
                <p className="mt-3">
                  We reserve the right to modify, suspend, or discontinue the service at any time with or without notice.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">10. Disclaimer of Warranties</h2>
              <p className="text-zinc-300">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">11. Limitation of Liability</h2>
              <div className="space-y-3 text-zinc-300">
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, OPENCALENDAR SHALL NOT BE LIABLE FOR:
                </p>
                <ul className="ml-6 list-disc space-y-1">
                  <li>Any indirect, incidental, special, or consequential damages</li>
                  <li>Loss of data, profits, or business opportunities</li>
                  <li>Damages resulting from third-party service interruptions</li>
                  <li>Unauthorized access to or alteration of your data</li>
                </ul>
                <p className="mt-3">
                  Our total liability shall not exceed the amount you paid us in the past 12 months (currently $0, as the service is free).
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">12. Indemnification</h2>
              <p className="text-zinc-300">
                You agree to indemnify and hold harmless OpenCalendars
, its contributors, and affiliates from any claims, damages, or expenses arising from your use of the service, your violation of these terms, or your violation of any rights of another party.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">13. Changes to Terms</h2>
              <p className="text-zinc-300">
                We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the service. Your continued use after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">14. Governing Law</h2>
              <p className="text-zinc-300">
                These terms shall be governed by and construed in accordance with the laws of the Netherlands, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">15. Dispute Resolution</h2>
              <p className="text-zinc-300">
                Any disputes arising from these terms or your use of the service shall be resolved through good faith negotiation. If negotiation fails, disputes may be resolved through binding arbitration or in the courts of the Netherlands.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">16. Severability</h2>
              <p className="text-zinc-300">
                If any provision of these terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">17. Contact Information</h2>
              <p className="text-zinc-300">
                For questions about these Terms of Service, please contact us:
              </p>
              <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
                <p className="font-medium text-white">Email: legal@opencalendar.app</p>
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
© 2026 OpenCalendars. Open source software.

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
