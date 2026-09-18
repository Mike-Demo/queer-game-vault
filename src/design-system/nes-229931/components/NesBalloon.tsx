import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "../lib/utils";

export interface NesBalloonProps extends HTMLAttributes<HTMLDivElement> {
  /** Which side the speech tail points from. */
  from?: "left" | "right";
}

/** Speech balloon for character dialogue or chat-style messages. */
export const NesBalloon = forwardRef<HTMLDivElement, NesBalloonProps>(function NesBalloon(
  { from = "left", className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("nes-balloon", `from-${from}`, className)} {...props} />;
});
