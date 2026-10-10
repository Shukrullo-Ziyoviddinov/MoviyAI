import type { Metadata } from "next";
import { AdminAuthProvider } from "@/components/auth/AdminAuthProvider";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { PageSearchProvider } from "@/components/search/page-search";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoviyAI Admin",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" className="h-full">
      <body className="h-full overflow-hidden">
        <AdminAuthProvider>
          <PageSearchProvider>
            <div className="fixed inset-0 flex overflow-hidden">
              <Sidebar />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <Navbar />
                <main className="scroll-none min-h-0 flex-1 overflow-y-auto">{children}</main>
              </div>
            </div>
          </PageSearchProvider>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
