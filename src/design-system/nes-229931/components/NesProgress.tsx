import { forwardRef, type ProgressHTMLAttributes } from "react";

import { cn } from "../lib/utils";

export type NesProgressVariant = "default" | "primary" | "success" | "warning" | "error" | "pattern";

export interface NesProgressProps extends ProgressHTMLAttributes<HTMLProgressElement> {
  /** Bar color, or `pattern` for the striped texture. */
  variant?: NesProgressVariant;
}

/** Chunky progress bar; set `value` and `max` like the native element. */
export const NesProgress = forwardRef<HTMLProgressElement, NesProgressProps>(function NesProgress(
  { variant = "default", className, ...props },
  ref,
) {
  return (
    <progress
      ref={ref}
      className={cn("nes-progress", variant !== "default" && `is-${variant}`, className)}
      {...props}
    />
  );
});
