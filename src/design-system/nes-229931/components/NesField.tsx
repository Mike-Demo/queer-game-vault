import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/utils";

export interface NesFieldProps extends HTMLAttributes<HTMLDivElement> {
  /** Visible label text, associated with the control via htmlFor/id. */
  label: ReactNode;
  /** id of the control this field labels. */
  htmlFor?: string;
  /** Lay the label and control out side by side. */
  inline?: boolean;
}

/** Labeled form field wrapper; wrap NesInput/NesTextarea/NesSelect children. */
export const NesField = forwardRef<HTMLDivElement, NesFieldProps>(function NesField(
  { label, htmlFor, inline = false, className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("nes-field", inline && "is-inline", className)} {...props}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
});
