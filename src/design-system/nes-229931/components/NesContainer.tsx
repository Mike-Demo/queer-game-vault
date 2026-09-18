import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/utils";

export interface NesContainerProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Optional frame title rendered into the container's top border. */
  title?: ReactNode;
  /** Center the title within the top border. */
  centered?: boolean;
  /** Rounded pixel corners. */
  rounded?: boolean;
  /** Dark surface with light text. */
  dark?: boolean;
}

/** Framed content panel; pair `title` with `centered` for dialog-style headers. */
export const NesContainer = forwardRef<HTMLDivElement, NesContainerProps>(function NesContainer(
  { title, centered = false, rounded = false, dark = false, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn("nes-container", title ? "with-title" : false, centered && "is-centered", rounded && "is-rounded", dark && "is-dark", className)}
      {...props}
    >
      {title ? <p className="title">{title}</p> : null}
      {children}
    </div>
  );
});
