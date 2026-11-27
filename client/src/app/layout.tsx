import type { Metadata } from "next";
import Script from "next/script";
import { AppShell } from "@/components/AppShell";
import { siteName, siteOrigin } from "@/utils/site";
import "./globals.css";

export const metadata: Metadata = {
  title: siteName,
  description: "MoviyAI kino katalogi. Kinolar haqida ma’lumot, tavsif va treylerlarni toping.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const origin = siteOrigin();
  const website = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: origin,
  }).replace(/</g, "\\u003c");
  return (
    <html lang="uz" className="h-full">
      <body className="min-h-full">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: website }} />
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
