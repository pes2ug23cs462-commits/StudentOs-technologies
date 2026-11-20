/* Company-wise coding practice (/code/company).

   We don't claim to know which questions a company asked in past years: there is
   no verified source for that. So each company gets
   · a practice set from our bank, picked for the level of its coding round
     (our own recommendation, said so on the page),
   · new AI problems "in this company's style", labelled as practice, not as past questions,
   · questions students report from their own interviews, shown only after the
     StudentOS team checks them (POST /api/pyq). */

import { PROBLEMS } from "./problems";
import type { Level, Problem } from "./types";

export type CompanyKind = "Service" | "Product";

export interface CodingCompany {
  id: string;
  name: string;
  website: string;
  kind: CompanyKind;
  /** our suggested topics to practise first for this company's level */
  focus: string[];
}

export const CODING_COMPANIES: CodingCompany[] = [
  { id: "tcs", name: "TCS", website: "tcs.com", kind: "Service", focus: ["Array", "String", "Math"] },
  { id: "infosys", name: "Infosys", website: "infosys.com", kind: "Service", focus: ["Array", "String", "Dynamic programming"] },
  { id: "wipro", name: "Wipro", website: "wipro.com", kind: "Service", focus: ["Array", "String", "Math"] },
  { id: "accenture", name: "Accenture", website: "accenture.com", kind: "Service", focus: ["Array", "String", "Math"] },
  { id: "cognizant", name: "Cognizant", website: "cognizant.com", kind: "Service", focus: ["Array", "String", "Hash map"] },
  { id: "capgemini", name: "Capgemini", website: "capgemini.com", kind: "Service", focus: ["Array", "String", "Math"] },
  { id: "hcltech", name: "HCLTech", website: "hcltech.com", kind: "Service", focus: ["Array", "String", "Sorting"] },
  { id: "techm", name: "Tech Mahindra", website: "techmahindra.com", kind: "Service", focus: ["Array", "String", "Math"] },
  { id: "ibm", name: "IBM", website: "ibm.com", kind: "Service", focus: ["Array", "String", "Hash map"] },
  { id: "deloitte", name: "Deloitte", website: "deloitte.com", kind: "Service", focus: ["Array", "String", "Sorting"] },
  { id: "ltimindtree", name: "LTIMindtree", website: "ltimindtree.com", kind: "Service", focus: ["Array", "String", "Math"] },
  { id: "ltts", name: "L&T Technology Services", website: "ltts.com", kind: "Service", focus: ["Array", "String", "Math"] },
  { id: "mphasis", name: "Mphasis", website: "mphasis.com", kind: "Service", focus: ["Array", "String", "Hash map"] },
  { id: "hexaware", name: "Hexaware", website: "hexaware.com", kind: "Service", focus: ["Array", "String", "Math"] },
  { id: "persistent", name: "Persistent Systems", website: "persistent.com", kind: "Service", focus: ["Array", "String", "Sorting"] },
  { id: "coforge", name: "Coforge", website: "coforge.com", kind: "Service", focus: ["Array", "String", "Math"] },
  { id: "ey", name: "EY", website: "ey.com", kind: "Service", focus: ["Array", "String", "Sorting"] },
  { id: "kpmg", name: "KPMG", website: "kpmg.com", kind: "Service", focus: ["Array", "String", "Math"] },
  { id: "virtusa", name: "Virtusa", website: "virtusa.com", kind: "Service", focus: ["Array", "String", "Math"] },
  { id: "zoho", name: "Zoho", website: "zoho.com", kind: "Product", focus: ["String", "Array", "Two pointers"] },
  { id: "amazon", name: "Amazon", website: "amazon.com", kind: "Product", focus: ["Array", "Hash map", "Graph", "Dynamic programming"] },
  { id: "microsoft", name: "Microsoft", website: "microsoft.com", kind: "Product", focus: ["Array", "String", "Dynamic programming"] },
  { id: "google", name: "Google", website: "google.com", kind: "Product", focus: ["Graph", "Dynamic programming", "Binary search"] },
  { id: "flipkart", name: "Flipkart", website: "flipkart.com", kind: "Product", focus: ["Array", "Dynamic programming", "Sliding window"] },
  { id: "adobe", name: "Adobe", website: "adobe.com", kind: "Product", focus: ["String", "Array", "Dynamic programming"] },
  { id: "oracle", name: "Oracle", website: "oracle.com", kind: "Product", focus: ["Array", "String", "Sorting"] },
  { id: "goldman", name: "Goldman Sachs", website: "goldmansachs.com", kind: "Product", focus: ["Array", "Dynamic programming", "Math"] },
  { id: "paypal", name: "PayPal", website: "paypal.com", kind: "Product", focus: ["Array", "Hash map", "Sliding window"] },
  { id: "walmart", name: "Walmart Global Tech", website: "walmart.com", kind: "Product", focus: ["Array", "Graph", "Dynamic programming"] },
  { id: "cisco", name: "Cisco", website: "cisco.com", kind: "Product", focus: ["Array", "String", "Graph"] },
  { id: "intel", name: "Intel", website: "intel.com", kind: "Product", focus: ["Array", "Bit manipulation", "Math"] },
  { id: "qualcomm", name: "Qualcomm", website: "qualcomm.com", kind: "Product", focus: ["Array", "Bit manipulation", "String"] },
  { id: "samsung", name: "Samsung R&D", website: "samsung.com", kind: "Product", focus: ["Graph", "Dynamic programming", "Array"] },
  { id: "sap", name: "SAP Labs", website: "sap.com", kind: "Product", focus: ["Array", "String", "Hash map"] },
  { id: "salesforce", name: "Salesforce", website: "salesforce.com", kind: "Product", focus: ["Array", "Hash map", "String"] },
  { id: "atlassian", name: "Atlassian", website: "atlassian.com", kind: "Product", focus: ["Array", "Hash map", "Sorting"] },
  { id: "freshworks", name: "Freshworks", website: "freshworks.com", kind: "Product", focus: ["Array", "String", "Hash map"] },
  { id: "uber", name: "Uber", website: "uber.com", kind: "Product", focus: ["Graph", "Array", "Dynamic programming"] },
  { id: "swiggy", name: "Swiggy", website: "swiggy.com", kind: "Product", focus: ["Array", "Hash map", "Sliding window"] },
  { id: "zomato", name: "Zomato", website: "zomato.com", kind: "Product", focus: ["Array", "Hash map", "Sorting"] },
  { id: "phonepe", name: "PhonePe", website: "phonepe.com", kind: "Product", focus: ["Array", "Dynamic programming", "Graph"] },
  { id: "paytm", name: "Paytm", website: "paytm.com", kind: "Product", focus: ["Array", "String", "Hash map"] },
  { id: "jpmorgan", name: "JPMorgan Chase", website: "jpmorganchase.com", kind: "Product", focus: ["Array", "String", "Dynamic programming"] },
  { id: "morganstanley", name: "Morgan Stanley", website: "morganstanley.com", kind: "Product", focus: ["Array", "Dynamic programming", "Math"] },
];

/** Any other company the student types in: id "x-<name>", default focus for its kind. */
export function customCompany(name: string, kind: CompanyKind): CodingCompany {
  const clean = name.replace(/\s+/g, " ").trim().slice(0, 40);
  const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "company";
  return { id: `x-${slug}`, name: clean, website: "", kind, focus: kind === "Service" ? ["Array", "String", "Math"] : ["Array", "Dynamic programming", "Hash map"] };
}

/** A company id the server accepts: one from the list, or a typed-in "x-…" one. */
export const validCompanyId = (id: string) => CODING_COMPANIES.some((c) => c.id === id) || /^x-[a-z0-9][a-z0-9-]{1,39}$/.test(id);

/** How many of each level we suggest: service companies' rounds are mostly easier, product companies' harder. */
export const MIX: Record<CompanyKind, Record<Level, number>> = {
  Service: { Easy: 6, Medium: 3, Hard: 0 },
  Product: { Easy: 2, Medium: 5, Hard: 2 },
};

/** Our practice set for a company: problems on its focus topics first, at the level mix for its kind. */
export function companySet(c: CodingCompany): Problem[] {
  const score = (p: Problem) => p.topics.filter((t) => c.focus.includes(t)).length;
  const out: Problem[] = [];
  for (const level of ["Easy", "Medium", "Hard"] as Level[]) {
    const pool = PROBLEMS.filter((p) => p.level === level).sort((a, b) => score(b) - score(a) || a.num - b.num);
    out.push(...pool.slice(0, MIX[c.kind][level]));
  }
  return out;
}

export const ROUNDS = ["Online test", "Technical interview", "Coding round", "HR interview", "Other"] as const;

/** A question a student says they were asked, as the team approved it. */
export interface ReportedQuestion {
  id: string;
  company: string;
  companyName?: string;
  year: number;
  round: string;
  role: string;
  question: string;
  at: number;
  approved?: boolean;
  by?: string;
}
