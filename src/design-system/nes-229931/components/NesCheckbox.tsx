import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/utils";

export interface NesCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Text rendered next to the checkbox. */
  label: ReactNode;
}

/** Pixel checkbox with an attached label. */
export const NesCheckbox = forwardRef<HTMLInputElement, NesCheckboxProps>(function NesCheckbox(
  { label, className, ...props },
  ref,
) {
  return (
    <label className={className}>
      <input ref={ref} type="checkbox" className="nes-checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
});

export interface NesRadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Text rendered next to the radio. */
  label: ReactNode;
  /** Dark variant for dark surfaces. */
  dark?: boolean;
}

/** Pixel radio button with an attached label; group with a shared `name`. */
export const NesRadio = forwardRef<HTMLInputElement, NesRadioProps>(function NesRadio(
  { label, dark = false, className, ...props },
  ref,
) {
  return (
    <label className={className}>
      <input ref={ref} type="radio" className={cn("nes-radio", dark && "is-dark")} {...props} />
      <span>{label}</span>
    </label>
  );
});
