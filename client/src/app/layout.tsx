import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoviyAI",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
