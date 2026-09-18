import { forwardRef, type TableHTMLAttributes } from "react";

import { cn } from "../lib/utils";

export interface NesTableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** Draw cell borders. */
  bordered?: boolean;
  /** Center cell content. */
  centered?: boolean;
  /** Dark surface with light text. */
  dark?: boolean;
  /** Wrap in a horizontally scrollable container. */
  responsive?: boolean;
}

/** Data table; pass native thead/tbody markup as children. */
export const NesTable = forwardRef<HTMLTableElement, NesTableProps>(function NesTable(
  { bordered = false, centered = false, dark = false, responsive = false, className, ...props },
  ref,
) {
  const table = (
    <table
      ref={ref}
      className={cn("nes-table", bordered && "is-bordered", centered && "is-centered", dark && "is-dark", className)}
      {...props}
    />
  );
  return responsive ? <div className="nes-table-responsive">{table}</div> : table;
});
