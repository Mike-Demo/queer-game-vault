import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/utils";

export type NesBadgeVariant = "dark" | "primary" | "success" | "warning" | "error";

export interface NesBadgeProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Color of the badge label. */
  variant?: NesBadgeVariant;
  /** Optional left-hand icon segment (e.g. a NesIcon or short mark). */
  icon?: ReactNode;
  /** Color of the icon segment when `icon` is set. */
  iconVariant?: NesBadgeVariant;
}

/**
 * Small status label rendered as an anchor badge. Pass `icon` to render a
 * split badge with a colored icon segment (e.g. "- <icon> label").
 */
export const NesBadge = forwardRef<HTMLAnchorElement, NesBadgeProps>(function NesBadge(
  { variant = "dark", icon, iconVariant = "dark", className, children, ...props },
  ref,
) {
  return (
    <a ref={ref} className={cn("nes-badge", icon ? "is-icon" : false, className)} {...props}>
      {icon ? <span className={cn("is-icon", `is-${iconVariant}`)}>{icon}</span> : null}
      <span className={`is-${variant}`}>{children}</span>
    </a>
  );
});
