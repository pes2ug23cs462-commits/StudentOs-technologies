/* Company logos without anyone uploading them: from the company's website if we
   know it, or from a short list of well-known recruiters. Unknown names keep the
   letter tile, so a wrong logo is never shown. */

const KNOWN: Record<string, string> = {
  tcs: "tcs.com", "tata consultancy services": "tcs.com", infosys: "infosys.com", wipro: "wipro.com", accenture: "accenture.com",
  cognizant: "cognizant.com", capgemini: "capgemini.com", hcl: "hcltech.com", hcltech: "hcltech.com", "hcl technologies": "hcltech.com",
  "tech mahindra": "techmahindra.com", ltimindtree: "ltimindtree.com", mindtree: "ltimindtree.com", "l&t technology services": "ltts.com", ltts: "ltts.com",
  deloitte: "deloitte.com", "ernst & young": "ey.com", ey: "ey.com", kpmg: "kpmg.com", pwc: "pwc.com", ibm: "ibm.com", oracle: "oracle.com",
  sap: "sap.com", microsoft: "microsoft.com", google: "google.com", amazon: "amazon.com", flipkart: "flipkart.com", zoho: "zoho.com",
  freshworks: "freshworks.com", swiggy: "swiggy.com", zomato: "zomato.com", paytm: "paytm.com", razorpay: "razorpay.com", phonepe: "phonepe.com",
  "jp morgan": "jpmorganchase.com", "jpmorgan chase": "jpmorganchase.com", "goldman sachs": "goldmansachs.com", "morgan stanley": "morganstanley.com",
  "hdfc bank": "hdfcbank.com", "icici bank": "icicibank.com", "axis bank": "axisbank.com", "kotak mahindra bank": "kotak.com", "bajaj finserv": "bajajfinserv.in",
  "byju's": "byjus.com", byjus: "byjus.com", unacademy: "unacademy.com", mphasis: "mphasis.com", "persistent systems": "persistent.com", persistent: "persistent.com",
  hexaware: "hexaware.com", "zensar technologies": "zensar.com", cisco: "cisco.com", intel: "intel.com", nvidia: "nvidia.com", qualcomm: "qualcomm.com",
  samsung: "samsung.com", bosch: "bosch.com", siemens: "siemens.com", "tata motors": "tatamotors.com", "tata steel": "tatasteel.com", "mahindra": "mahindra.com",
  "larsen & toubro": "larsentoubro.com", "l&t": "larsentoubro.com", reliance: "ril.com", "reliance industries": "ril.com", adobe: "adobe.com", salesforce: "salesforce.com",
  "ola": "olacabs.com", "meesho": "meesho.com", "cred": "cred.club", "myntra": "myntra.com", "dell": "dell.com", "hp": "hp.com", "ey gds": "ey.com",
};

/** The website's host (www. removed), or "" if it isn't a usable address. */
export function hostOf(website: string | undefined): string {
  const w = (website ?? "").trim();
  if (!w) return "";
  try {
    const h = new URL(/^https?:\/\//i.test(w) ? w : `https://${w}`).hostname.toLowerCase().replace(/^www\./, "");
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) ? h : "";
  } catch {
    return "";
  }
}

/** The domain to take a logo from, or "" to keep the letter tile. */
export function companyDomain(name: string, website?: string): string {
  const fromSite = hostOf(website);
  if (fromSite) return fromSite;
  const key = name.toLowerCase().replace(/\b(pvt|private|ltd|limited|inc|llp|india|technologies|corp|corporation)\b\.?/g, "").replace(/[^a-z0-9&' ]+/g, " ").replace(/\s+/g, " ").trim();
  return KNOWN[key] ?? KNOWN[name.toLowerCase().trim()] ?? "";
}

export const logoUrl = (domain: string) => `/api/company-logo?d=${encodeURIComponent(domain)}`;
