import { forwardRef, type DialogHTMLAttributes } from "react";

import { cn } from "../lib/utils";

export interface NesDialogProps extends DialogHTMLAttributes<HTMLDialogElement> {
  /** Rounded pixel corners. */
  rounded?: boolean;
  /** Dark surface with light text. */
  dark?: boolean;
}

/**
 * Native <dialog> with retro framing. Control visibility with the native
 * `open` attribute or showModal()/close().
 */
export const NesDialog = forwardRef<HTMLDialogElement, NesDialogProps>(function NesDialog(
  { rounded = false, dark = false, className, ...props },
  ref,
) {
  return (
    <dialog
      ref={ref}
      className={cn("nes-dialog", rounded && "is-rounded", dark && "is-dark", className)}
      {...props}
    />
  );
});
