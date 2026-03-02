import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Buttercup LMS",
  description: "Learning Management System for Buttercup Learning teacher training",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="bg-neutral-50 antialiased font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
