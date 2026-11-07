import type { SVGProps } from "react";

/* Line icons in the style used across the StudentOS designs (24px grid, 1.8 stroke). */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(paths: React.ReactNode, displayName: string) {
  const Icon = ({ size = 16, strokeWidth = 1.8, ...rest }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {paths}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

export const HomeIcon = make(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h5v-6h4v6h5V9.5" /></>, "HomeIcon");
export const ChatIcon = make(<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.4A8.4 8.4 0 1 1 21 11.5z" />, "ChatIcon");
export const PlanIcon = make(<><path d="M10 6h11M10 12h11M10 18h11" /><path d="M3 6h3M3 12h3M3 18h3" /></>, "PlanIcon");
export const CalendarIcon = make(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>, "CalendarIcon");
export const TargetIcon = make(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>, "TargetIcon");
export const SettingsIcon = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </>,
  "SettingsIcon",
);
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />, "PlusIcon");
export const ChevronDownIcon = make(<path d="m6 9 6 6 6-6" />, "ChevronDownIcon");
export const ChevronLeftIcon = make(<path d="m15 18-6-6 6-6" />, "ChevronLeftIcon");
export const ChevronRightIcon = make(<path d="m9 18 6-6-6-6" />, "ChevronRightIcon");
export const ArrowLeftIcon = make(<path d="M19 12H5M12 19l-7-7 7-7" />, "ArrowLeftIcon");
export const ArrowRightIcon = make(<path d="M5 12h14M12 5l7 7-7 7" />, "ArrowRightIcon");
export const CheckIcon = make(<path d="M20 6 9 17l-5-5" />, "CheckIcon");
export const CheckCircleIcon = make(<><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>, "CheckCircleIcon");
export const AlertCircleIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16h.01" /></>, "AlertCircleIcon");
export const InfoIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>, "InfoIcon");
export const XIcon = make(<path d="M18 6 6 18M6 6l12 12" />, "XIcon");
export const XCircleIcon = make(<><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></>, "XCircleIcon");
export const MoonIcon = make(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />, "MoonIcon");
export const SunIcon = make(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>, "SunIcon");
export const EyeIcon = make(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>, "EyeIcon");
export const EyeOffIcon = make(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /><path d="M3 3l18 18" /></>, "EyeOffIcon");
export const PaperclipIcon = make(<path d="m21 11-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" />, "PaperclipIcon");
export const SlidersIcon = make(<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />, "SlidersIcon");
export const MinimizeIcon = make(<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />, "MinimizeIcon");
export const MaximizeIcon = make(<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />, "MaximizeIcon");
export const ClockIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, "ClockIcon");
export const BookIcon = make(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8" /></>, "BookIcon");
export const FlagIcon = make(<path d="M4 22V4M4 4h12l-2 4 2 4H4" />, "FlagIcon");
export const PlayIcon = make(<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />, "PlayIcon");
export const PauseIcon = make(<path d="M8 5v14M16 5v14" strokeWidth={2.6} />, "PauseIcon");
export const PencilIcon = make(<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />, "PencilIcon");
export const RefreshIcon = make(<><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" /><path d="M21 3v5h-5" /></>, "RefreshIcon");
export const RepeatIcon = make(<><path d="m17 2 4 4-4 4" /><path d="M3 11V10a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></>, "RepeatIcon");
export const MailIcon = make(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>, "MailIcon");
export const UserIcon = make(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>, "UserIcon");
export const BellIcon = make(<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>, "BellIcon");
export const LockIcon = make(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>, "LockIcon");
export const GradCapIcon = make(<><path d="M22 10 12 5 2 10l10 5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></>, "GradCapIcon");
export const MicIcon = make(<><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>, "MicIcon");
export const CircleIcon = make(<circle cx="12" cy="12" r="9" />, "CircleIcon");
export const SpinnerIcon = make(<path d="M21 12a9 9 0 1 1-6.2-8.6" />, "SpinnerIcon");
export const TrashIcon = make(<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" />, "TrashIcon");
export const MenuIcon = make(<path d="M4 6h16M4 12h16M4 18h16" />, "MenuIcon");
export const GripIcon = make(<path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" strokeWidth={3} />, "GripIcon");
export const LogOutIcon = make(<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />, "LogOutIcon");

/* Brand marks for social sign-in */
export const GoogleIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
    <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
    <path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" />
    <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z" />
  </svg>
);
export const GitHubIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z" />
  </svg>
);
export const LinkedInIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <rect width="24" height="24" rx="3" fill="#0A66C2" />
    <path fill="#fff" d="M7 9.5H4.5V19H7V9.5zM5.7 5.2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM19.5 13.4c0-2.3-1.2-3.1-2.9-3.1-1.2 0-2 .7-2.3 1.2V9.5h-2.5V19h2.5v-5c0-1.1.5-1.8 1.4-1.8 1 0 1.3.8 1.3 1.8v5h2.5v-5.6z" />
  </svg>
);
