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
  { id: "tcs", name: "TCS", website: "tcs.com", kind: "Service", focus: ["Math", "Number theory", "String", "Pattern"] },
  { id: "infosys", name: "Infosys", website: "infosys.com", kind: "Service", focus: ["String", "Dynamic programming", "Greedy", "Math"] },
  { id: "wipro", name: "Wipro", website: "wipro.com", kind: "Service", focus: ["Math", "Array", "Pattern", "Matrix"] },
  { id: "accenture", name: "Accenture", website: "accenture.com", kind: "Service", focus: ["Array", "String", "Math", "Sorting"] },
  { id: "cognizant", name: "Cognizant", website: "cognizant.com", kind: "Service", focus: ["String", "Hash map", "Array", "Stack"] },
  { id: "capgemini", name: "Capgemini", website: "capgemini.com", kind: "Service", focus: ["Pattern", "Math", "String", "Array"] },
  { id: "hcltech", name: "HCLTech", website: "hcltech.com", kind: "Service", focus: ["Array", "Sorting", "Matrix", "Math"] },
  { id: "techm", name: "Tech Mahindra", website: "techmahindra.com", kind: "Service", focus: ["Number theory", "String", "Array", "Simulation"] },
  { id: "ibm", name: "IBM", website: "ibm.com", kind: "Service", focus: ["String", "Hash map", "Two pointers", "Math"] },
  { id: "deloitte", name: "Deloitte", website: "deloitte.com", kind: "Service", focus: ["Array", "Sorting", "String", "Prefix sums"] },
  { id: "ltimindtree", name: "LTIMindtree", website: "ltimindtree.com", kind: "Service", focus: ["Array", "Math", "String", "Hash set"] },
  { id: "ltts", name: "L&T Technology Services", website: "ltts.com", kind: "Service", focus: ["Math", "Matrix", "Array", "Number theory"] },
  { id: "mphasis", name: "Mphasis", website: "mphasis.com", kind: "Service", focus: ["String", "Stack", "Array", "Sorting"] },
  { id: "hexaware", name: "Hexaware", website: "hexaware.com", kind: "Service", focus: ["Math", "Pattern", "String", "Array"] },
  { id: "persistent", name: "Persistent Systems", website: "persistent.com", kind: "Service", focus: ["Hash map", "Array", "Two pointers", "String"] },
  { id: "coforge", name: "Coforge", website: "coforge.com", kind: "Service", focus: ["Array", "Hash set", "String", "Sorting"] },
  { id: "ey", name: "EY", website: "ey.com", kind: "Service", focus: ["String", "Array", "Sorting", "Hash map"] },
  { id: "kpmg", name: "KPMG", website: "kpmg.com", kind: "Service", focus: ["Array", "Sorting", "Prefix sums", "Math"] },
  { id: "virtusa", name: "Virtusa", website: "virtusa.com", kind: "Service", focus: ["String", "Array", "Math", "Greedy"] },
  { id: "zoho", name: "Zoho", website: "zoho.com", kind: "Product", focus: ["String", "Matrix", "Pattern", "Simulation"] },
  { id: "amazon", name: "Amazon", website: "amazon.com", kind: "Product", focus: ["Hash map", "Graph", "Dynamic programming", "Sliding window"] },
  { id: "microsoft", name: "Microsoft", website: "microsoft.com", kind: "Product", focus: ["String", "Dynamic programming", "Matrix", "Binary search"] },
  { id: "google", name: "Google", website: "google.com", kind: "Product", focus: ["Graph", "Dynamic programming", "Binary search", "Recursion"] },
  { id: "flipkart", name: "Flipkart", website: "flipkart.com", kind: "Product", focus: ["Dynamic programming", "Sliding window", "Heap", "Greedy"] },
  { id: "adobe", name: "Adobe", website: "adobe.com", kind: "Product", focus: ["String", "Dynamic programming", "Two pointers", "Stack"] },
  { id: "oracle", name: "Oracle", website: "oracle.com", kind: "Product", focus: ["Array", "Sorting", "Binary search", "String"] },
  { id: "goldman", name: "Goldman Sachs", website: "goldmansachs.com", kind: "Product", focus: ["Dynamic programming", "Math", "Array", "Prefix sums"] },
  { id: "paypal", name: "PayPal", website: "paypal.com", kind: "Product", focus: ["Hash map", "Sliding window", "String", "Greedy"] },
  { id: "walmart", name: "Walmart Global Tech", website: "walmart.com", kind: "Product", focus: ["Graph", "Dynamic programming", "Heap", "Array"] },
  { id: "cisco", name: "Cisco", website: "cisco.com", kind: "Product", focus: ["Graph", "Bit manipulation", "String", "Array"] },
  { id: "intel", name: "Intel", website: "intel.com", kind: "Product", focus: ["Bit manipulation", "Math", "Array", "Binary search"] },
  { id: "qualcomm", name: "Qualcomm", website: "qualcomm.com", kind: "Product", focus: ["Bit manipulation", "Array", "Matrix", "Math"] },
  { id: "samsung", name: "Samsung R&D", website: "samsung.com", kind: "Product", focus: ["Graph", "DFS / BFS", "Matrix", "Recursion"] },
  { id: "sap", name: "SAP Labs", website: "sap.com", kind: "Product", focus: ["Hash map", "String", "Sorting", "Stack"] },
  { id: "salesforce", name: "Salesforce", website: "salesforce.com", kind: "Product", focus: ["Hash map", "String", "Dynamic programming", "Heap"] },
  { id: "atlassian", name: "Atlassian", website: "atlassian.com", kind: "Product", focus: ["Hash map", "Sorting", "Greedy", "Stack"] },
  { id: "freshworks", name: "Freshworks", website: "freshworks.com", kind: "Product", focus: ["String", "Hash map", "Two pointers", "Array"] },
  { id: "uber", name: "Uber", website: "uber.com", kind: "Product", focus: ["Graph", "Heap", "Dynamic programming", "Binary search"] },
  { id: "swiggy", name: "Swiggy", website: "swiggy.com", kind: "Product", focus: ["Graph", "Greedy", "Sliding window", "Hash map"] },
  { id: "zomato", name: "Zomato", website: "zomato.com", kind: "Product", focus: ["Hash map", "Sorting", "Greedy", "Heap"] },
  { id: "phonepe", name: "PhonePe", website: "phonepe.com", kind: "Product", focus: ["Dynamic programming", "Graph", "Stack", "Binary search"] },
  { id: "paytm", name: "Paytm", website: "paytm.com", kind: "Product", focus: ["Array", "String", "Dynamic programming", "Stack"] },
  { id: "jpmorgan", name: "JPMorgan Chase", website: "jpmorganchase.com", kind: "Product", focus: ["Array", "String", "Dynamic programming", "Sorting"] },
  { id: "morganstanley", name: "Morgan Stanley", website: "morganstanley.com", kind: "Product", focus: ["Dynamic programming", "Math", "Recursion", "Array"] },
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
  Service: { Easy: 8, Medium: 4, Hard: 0 },
  Product: { Easy: 3, Medium: 7, Hard: 3 },
};

/** Small stable hash, so two companies with similar topics still get different problems. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** How well a problem fits a company: its focus topics, the first topic counting most. */
export function fit(c: CodingCompany, p: Problem) {
  return p.topics.reduce((s, t) => {
    const i = c.focus.indexOf(t);
    return s + (i < 0 ? 0 : c.focus.length - i);
  }, 0);
}

/** Our practice set for a company: problems on its focus topics first, at the level mix for its kind. */
export function companySet(c: CodingCompany): Problem[] {
  const out: Problem[] = [];
  for (const level of ["Easy", "Medium", "Hard"] as Level[]) {
    // focus topics first, with a small per-company shuffle so similar companies still differ
    const score = (p: Problem) => fit(c, p) + (hash(c.id + p.id) % 1000) / 250;
    const pool = PROBLEMS.filter((p) => p.level === level).sort((a, b) => score(b) - score(a));
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
