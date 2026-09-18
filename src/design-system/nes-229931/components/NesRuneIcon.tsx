import { forwardRef, type SVGAttributes } from "react";

import { cn } from "../lib/utils";
import { RUNE_ICONS, type RuneIconName } from "./runes";

export type { RuneIconName };

const SIZES = {
  small: 24,
  medium: 40,
  large: 64,
} as const;

export type NesRuneIconSize = keyof typeof SIZES;

export interface NesRuneIconProps extends SVGAttributes<SVGSVGElement> {
  /** Which rune icon to render. */
  name: RuneIconName;
  /** Rendered edge length in pixels. */
  size?: NesRuneIconSize;
}

/**
 * Pixel rune icon from the Rune Icons set (215 glyphs). Fills with
 * `currentColor`, so it inherits surrounding text color. Decorative by
 * default — pass aria-label when the icon carries meaning.
 */
export const NesRuneIcon = forwardRef<SVGSVGElement, NesRuneIconProps>(function NesRuneIcon(
  { name, size = "medium", className, ...props },
  ref,
) {
  const icon = RUNE_ICONS[name];
  const edge = SIZES[size];
  return (
    <svg
      ref={ref}
      role={props["aria-label"] ? "img" : undefined}
      aria-hidden={props["aria-label"] ? undefined : true}
      width={edge}
      height={edge}
      viewBox={icon.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("nes-rune-icon", className)}
      {...props}
    >
      {icon.paths.map((d, i) => (
        <path key={i} d={d} fill="currentColor" />
      ))}
    </svg>
  );
});
