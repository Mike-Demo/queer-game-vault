import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "../lib/utils";

export interface NesSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Validation-state border coloring. */
  state?: "success" | "warning" | "error";
}

/** Styled <select>; pass native <option> elements as children. */
export const NesSelect = forwardRef<HTMLSelectElement, NesSelectProps>(function NesSelect(
  { state, className, children, ...props },
  ref,
) {
  return (
    <div className={cn("nes-select", state && `is-${state}`, className)}>
      <select ref={ref} {...props}>
        {children}
      </select>
    </div>
  );
});
