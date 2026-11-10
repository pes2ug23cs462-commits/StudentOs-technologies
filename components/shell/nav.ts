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

export interface Crumb {
  label: string;
  href: string;
}

/** Sub-pages that get their own last crumb, e.g. Practice Arena › Mock interview. */
const SUB: { path: string; label: string }[] = [
  { path: "/interview", label: "Mock interview" },
  { path: "/code", label: "Coding" },
  { path: "/premium", label: "Premium" },
  { path: "/timeline", label: "College timeline" },
  { path: "/goals", label: "My goals" },
  { path: "/resources", label: "Resources" },
  { path: "/session", label: "Session" },
  { path: "/plan", label: "Plan" },
  { path: "/onboarding", label: "Set up your plan" },
  { path: "/learn/watch", label: "Video" },
  { path: "/learn/", label: "Course" },
];

/** Clickable trail for the current page: "Study › Learning › Course". */
export function crumbsFor(pathname: string): Crumb[] {
  if (pathname.startsWith("/certificates")) return [{ label: "Learning", href: "/learn" }, { label: "Certificates", href: "/certificates" }];
  if (pathname.startsWith("/settings")) return [{ label: "Settings", href: "/settings" }];
  for (const g of NAV_GROUPS) {
    const hit = g.items.find((i) => isActive(pathname, i.match));
    if (!hit) continue;
    const out: Crumb[] = [];
    if (g.title) out.push({ label: g.title, href: g.items[0].href });
    out.push({ label: hit.label, href: hit.href });
    if (pathname !== hit.href) {
      const sub = SUB.find((x) => (x.path.endsWith("/") ? pathname.startsWith(x.path) : pathname === x.path || pathname.startsWith(x.path + "/")));
      if (sub) out.push({ label: sub.label, href: pathname });
    }
    return out;
  }
  return [];
}
