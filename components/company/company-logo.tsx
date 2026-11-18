"use client";

/* A company's logo, fetched on its own from its website (or a known list).
   Falls back to the letter tile when there is no logo. */

import { useState } from "react";
import { companyDomain, logoUrl } from "@/lib/company-logo";
import { cn } from "@/lib/utils";

export function CompanyLogo({ name, website, className, letterClassName }: { name: string; website?: string; className: string; letterClassName?: string }) {
  const domain = companyDomain(name, website);
  const [failed, setFailed] = useState(false);
  if (domain && !failed)
    return (
      <span className={cn(className, "overflow-hidden border border-white/10 bg-[#ffffff] p-1.5")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl(domain)} alt={`${name} logo`} loading="lazy" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      </span>
    );
  return <span className={cn(className, letterClassName)}>{(name.trim()[0] ?? "?").toUpperCase()}</span>;
}
