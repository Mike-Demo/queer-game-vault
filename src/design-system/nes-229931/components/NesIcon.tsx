import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "../lib/utils";

export type NesIconName =
  | "heart"
  | "star"
  | "coin"
  | "trophy"
  | "close"
  | "like"
  | "twitter"
  | "facebook"
  | "github"
  | "google"
  | "gmail"
  | "medium"
  | "linkedin"
  | "instagram"
  | "whatsapp"
  | "youtube"
  | "reddit"
  | "twitch";

export interface NesIconProps extends HTMLAttributes<HTMLElement> {
  /** Which icon to render. */
  name: NesIconName;
  /** Pixel-scaled size (default is the base size). */
  size?: "small" | "medium" | "large";
  /** Hollow variant — only heart, star, and like support it. */
  empty?: boolean;
}

/**
 * Pixel icon. Heart, star, and like accept `empty`; star also accepts
 * `empty` for a hollow star. Decorative by default — pass aria-label when
 * the icon carries meaning.
 */
export const NesIcon = forwardRef<HTMLElement, NesIconProps>(function NesIcon(
  { name, size, empty = false, className, ...props },
  ref,
) {
  return (
    <i
      ref={ref}
      aria-hidden={props["aria-label"] ? undefined : true}
      className={cn("nes-icon", name, size && `is-${size}`, empty && "is-empty", className)}
      {...props}
    />
  );
});
