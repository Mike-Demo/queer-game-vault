import { forwardRef, type SVGAttributes } from "react";

import { cn } from "../lib/utils";
import { pixelIconToRects, type PixelIconData } from "./pixel-icon";

export type { PixelIconData, PixelGridSize } from "./pixel-icon";

const SIZES = {
  small: 24,
  medium: 40,
  large: 64,
} as const;

export type NesPixelIconSize = keyof typeof SIZES;

export interface NesPixelIconProps extends SVGAttributes<SVGSVGElement> {
  /** Pixel grid to render (drawn in the icon studio or authored by hand). */
  icon: PixelIconData;
  /** Rendered edge length in pixels. */
  size?: NesPixelIconSize;
  /** Ignore the icon's palette and fill every pixel with `currentColor`. */
  monochrome?: boolean;
}

/**
 * Renders a custom pixel icon as crisp SVG. Palette entries may be hex colors
 * or "currentColor". Decorative by default — pass aria-label when the icon
 * carries meaning.
 */
export const NesPixelIcon = forwardRef<SVGSVGElement, NesPixelIconProps>(function NesPixelIcon(
  { icon, size = "medium", monochrome = false, className, ...props },
  ref,
) {
  const edge = SIZES[size];
  const rects = pixelIconToRects(icon, monochrome);
  return (
    <svg
      ref={ref}
      role={props["aria-label"] ? "img" : undefined}
      aria-hidden={props["aria-label"] ? undefined : true}
      width={edge}
      height={edge}
      viewBox={`0 0 ${icon.size} ${icon.size}`}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("nes-pixel-icon", className)}
      {...props}
    >
      {rects.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.width} height={1} fill={r.fill} />
      ))}
    </svg>
  );
});
