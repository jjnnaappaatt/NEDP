import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-hero text-[var(--on-primary)] hover:opacity-90 active:opacity-80",
  accent: "bg-accent text-[var(--on-accent)] hover:brightness-105 active:brightness-95",
  secondary: "bg-surface text-ink border border-border hover:bg-surface-soft",
  ghost: "text-ink-soft hover:bg-surface-soft",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-[15px] font-medium",
        "transition whitespace-nowrap disabled:pointer-events-none disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
