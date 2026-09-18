import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "../lib/utils";

export type NesTextVariant = "primary" | "success" | "warning" | "error" | "disabled";

export interface NesTextProps extends HTMLAttributes<HTMLSpanElement> {
  /** Semantic text color. */
  variant?: NesTextVariant;
}

/** Inline colored text for status and emphasis. */
export const NesText = forwardRef<HTMLSpanElement, NesTextProps>(function NesText(
  { variant, className, ...props },
  ref,
) {
  return <span ref={ref} className={cn(variant && `nes-text is-${variant}`, className)} {...props} />;
});
