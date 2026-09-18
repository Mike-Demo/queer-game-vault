import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "../lib/utils";

export type NesButtonVariant = "default" | "primary" | "success" | "warning" | "error";

export interface NesButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style of the button. */
  variant?: NesButtonVariant;
}

/**
 * Retro 8-bit button. Use `variant` for semantic intent and the native
 * `disabled` attribute for the disabled state.
 */
export const NesButton = forwardRef<HTMLButtonElement, NesButtonProps>(function NesButton(
  { variant = "default", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn("nes-btn", variant !== "default" && `is-${variant}`, className)}
      {...props}
    />
  );
});
