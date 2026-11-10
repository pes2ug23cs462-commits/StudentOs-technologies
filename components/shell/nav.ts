/* The app's pages, grouped the way the sidebar shows them. Also used for the
   breadcrumb in the top bar and for the ⌘K search. */

import {
  BriefcaseIcon,
  CalendarIcon,
  ChatIcon,
  FileIcon,
  FolderIcon,
  HomeIcon,
  PlanIcon,
  TargetIcon,
  VideoIcon,
} from "@/components/ui/icons";

type IconT = (p: { size?: number; className?: string }) => React.ReactElement;

export interface NavLink {
  href: string;
  label: string;
  Icon: IconT;
  match: string[];
  badge?: "PRO" | "SOON";
}

export const NAV_GROUPS: { title: string; items: NavLink[] }[] = [
  {
    title: "",
    items: [
      { href: "/dashboard", label: "Dashboard", Icon: HomeIcon, match: ["/dashboard"] },
      { href: "/assistant", label: "AI Assistant", Icon: ChatIcon, match: ["/assistant", "/onboarding"] },
    ],
  },
  {
    title: "Study",
    items: [
      { href: "/study-plan", label: "Study Plan", Icon: PlanIcon, match: ["/study-plan", "/plan", "/session"] },
      { href: "/schedule", label: "Schedule", Icon: CalendarIcon, match: ["/schedule", "/timeline"] },
      { href: "/learn", label: "Learning", Icon: VideoIcon, match: ["/learn", "/resources", "/goals", "/notes"] },
      { href: "/tests", label: "Practice Arena", Icon: TargetIcon, match: ["/tests", "/interview", "/code", "/premium"], badge: "PRO" },
    ],
  },
  {
    title: "Career",
    items: [
      { href: "/projects", label: "Projects & Experience", Icon: FolderIcon, match: ["/projects"] },
      { href: "/resume", label: "Resume Creator", Icon: FileIcon, match: ["/resume"] },
      { href: "/placement", label: "Placement", Icon: BriefcaseIcon, match: ["/placement"], badge: "SOON" },
    ],
  },
];

export const NAV_ALL = NAV_GROUPS.flatMap((g) => g.items);

/** Extra places the ⌘K search can jump to. */
export const QUICK_LINKS: { href: string; label: string; hint: string }[] = [
  { href: "/learn?tab=materials&m=notes", label: "AI Notes", hint: "Learning" },
  { href: "/learn?tab=goals", label: "My goals", hint: "Learning" },
  { href: "/learn?tab=videos", label: "Popular videos", hint: "Learning" },
  { href: "/certificates", label: "Certificates", hint: "Learning" },
  { href: "/code", label: "Coding problems", hint: "Practice Arena" },
  { href: "/interview", label: "Mock interview", hint: "Practice Arena" },
  { href: "/timeline", label: "College timeline", hint: "Schedule" },
  { href: "/settings/profile", label: "Profile settings", hint: "Settings" },
  { href: "/settings/account", label: "Plan & account", hint: "Settings" },
];

export const isActive = (pathname: string, match: string[]) => match.some((m) => pathname === m || pathname.startsWith(m + "/"));

/** "Study › Learning" for the current page. */
export function crumbsFor(pathname: string): string[] {
  if (pathname.startsWith("/settings") || pathname.startsWith("/certificates")) return ["Settings"];
  for (const g of NAV_GROUPS) {
    const hit = g.items.find((i) => isActive(pathname, i.match));
    if (hit) return g.title ? [g.title, hit.label] : [hit.label];
  }
  return [];
}
