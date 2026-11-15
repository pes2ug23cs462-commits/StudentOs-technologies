import type { Metadata } from "next";
import { ContactPage } from "@/components/site/contact-page";

export const metadata: Metadata = { title: "Contact", description: "Get in touch with the StudentOS team for support, college partnerships or press.", alternates: { canonical: "/contact" } };

export default function Page() {
  return <ContactPage />;
}
