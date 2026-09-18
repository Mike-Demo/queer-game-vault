import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "../lib/utils";

export type NesFieldState = "success" | "warning" | "error";

export interface NesInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Validation state color. */
  state?: NesFieldState;
}

/** Single-line text field with optional validation-state coloring. */
export const NesInput = forwardRef<HTMLInputElement, NesInputProps>(function NesInput(
  { state, className, ...props },
  ref,
) {
  return <input ref={ref} className={cn("nes-input", state && `is-${state}`, className)} {...props} />;
});

export interface NesTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Validation state color. */
  state?: NesFieldState;
}

/** Multi-line text field with optional validation-state coloring. */
export const NesTextarea = forwardRef<HTMLTextAreaElement, NesTextareaProps>(function NesTextarea(
  { state, className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn("nes-textarea", state && `is-${state}`, className)} {...props} />;
});
