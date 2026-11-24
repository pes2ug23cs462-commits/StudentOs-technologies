import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Poppins } from "next/font/google";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/site";
import { StoreProvider } from "@/lib/store";
import "./globals.css";
import { LITE_SCRIPT } from "@/lib/lite";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Used on certificates, to match the certificate design.
// Serif for the certificate's title and the student's name.
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-cert", display: "swap" });

const DESCRIPTION =
  "StudentOS is an AI study planner and placement app for Indian college and PU students: a study plan built around your timetable, an AI tutor, mock interviews with feedback, a resume builder and campus placement drives.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "StudentOS · AI Study Planner, Mock Interviews & Placements", template: "%s · StudentOS" },
  description: DESCRIPTION,
  applicationName: "StudentOS",
  keywords: [
    "StudentOS",
    "AI study planner",
    "study planner for college students",
    "AI tutor",
    "mock interview",
    "AI mock interview",
    "placement preparation",
    "campus placements",
    "resume builder for students",
    "exam preparation",
    "PU college",
    "engineering students",
    "coding interview practice",
    "student productivity app",
    "India",
  ],
  authors: [{ name: "StudentOS Technologies" }],
  creator: "StudentOS Technologies",
  publisher: "StudentOS Technologies",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "StudentOS",
    url: "/",
    title: "StudentOS · AI Study Planner, Mock Interviews & Placements",
    description: DESCRIPTION,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: "StudentOS · AI Study Planner, Mock Interviews & Placements", description: DESCRIPTION },
  robots: { index: true, follow: true },
  category: "education",
};

export const viewport: Viewport = { themeColor: "#0b0b0d", colorScheme: "dark light" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before the page paints, so light mode doesn’t flash dark. */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("studentos:theme")==="light")document.documentElement.classList.add("light")}catch(e){}` }} />
        {/* Low-end device, Data Saver, reduced motion or "Reduce effects": turn heavy effects off before paint. */}
        <script dangerouslySetInnerHTML={{ __html: LITE_SCRIPT }} />
      </head>
      <body className="font-sans">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
