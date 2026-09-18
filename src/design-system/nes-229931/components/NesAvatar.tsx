import { forwardRef, type ImgHTMLAttributes } from "react";

import { cn } from "../lib/utils";

export interface NesAvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Pixel-scaled size (default is the base 32px). */
  size?: "small" | "medium" | "large";
  /** Circular crop. */
  rounded?: boolean;
}

/** Pixelated avatar image; `src`/`alt` are required for meaning. */
export const NesAvatar = forwardRef<HTMLImageElement, NesAvatarProps>(function NesAvatar(
  { size, rounded = false, className, alt, ...props },
  ref,
) {
  return (
    <img
      ref={ref}
      alt={alt ?? ""}
      className={cn("nes-avatar", size && `is-${size}`, rounded && "is-rounded", className)}
      {...props}
    />
  );
});
