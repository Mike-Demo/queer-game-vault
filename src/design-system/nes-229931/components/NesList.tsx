import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "../lib/utils";

export interface NesListProps extends HTMLAttributes<HTMLUListElement> {
  /** Bullet shape. */
  variant?: "disc" | "circle";
  /** Dark-surface variant for use on dark backgrounds. */
  dark?: boolean;
}

/** Retro bulleted list; pass <li> elements as children. */
export const NesList = forwardRef<HTMLUListElement, NesListProps>(function NesList(
  { variant = "disc", dark = false, className, ...props },
  ref,
) {
  return <ul ref={ref} className={cn("nes-list", `is-${variant}`, dark && "is-dark", className)} {...props} />;
});
