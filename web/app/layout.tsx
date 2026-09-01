import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "URL Health Checker",
  description: "Submit a batch of URLs and watch checks complete live.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-100 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex w-full max-w-3xl items-center px-6 py-4">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-zinc-900 hover:text-zinc-600"
            >
              URL Health Checker
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
