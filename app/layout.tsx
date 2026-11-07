import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "StudentOS", template: "%s · StudentOS" },
  description: "Your AI study planner, built around college — not against it.",
  icons: { icon: "/studentos-mark.png" },
};

export const viewport: Viewport = { themeColor: "#0b0b0d", colorScheme: "dark light" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before the page paints, so light mode doesn’t flash dark. */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("studentos:theme")==="light")document.documentElement.classList.add("light")}catch(e){}` }} />
      </head>
      <body className="font-sans">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
