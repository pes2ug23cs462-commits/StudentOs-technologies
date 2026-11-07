import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Poppins } from "next/font/google";
import type { ReactNode } from "react";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Used on certificates, to match the certificate design.
// Serif for the certificate's title and the student's name.
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-cert", display: "swap" });

export const metadata: Metadata = {
  title: { default: "StudentOS", template: "%s · StudentOS" },
  description: "Your AI study planner, built around college — not against it.",
  icons: { icon: "/studentos-mark.png" },
};

export const viewport: Viewport = { themeColor: "#0b0b0d", colorScheme: "dark light" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${playfair.variable}`} suppressHydrationWarning>
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
