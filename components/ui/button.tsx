import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SpinnerIcon } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "xs" | "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-black font-semibold shadow-[0_0_22px_rgba(0,225,245,0.28)] hover:bg-accent-hover disabled:shadow-none",
  secondary: "border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.09]",
  ghost: "text-white/85 hover:bg-white/[0.06] hover:text-white",
  danger: "border border-rose-500/50 text-rose-400 hover:bg-rose-500/10",
  link: "text-accent hover:underline px-0! h-auto!",
};
const sizes: Record<Size, string> = {
  xs: "h-8 px-3 text-[12px] gap-1.5 rounded-md",
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-[13.5px] gap-2 rounded-lg",
  lg: "h-11 px-5 text-[14px] gap-2 rounded-lg",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition outline-none",
    "focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant = "secondary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest }: Props) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <SpinnerIcon className="animate-spin" size={14} /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/[0.09] hover:text-white",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
