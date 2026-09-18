/** Transparent cell marker inside a pixel grid. */
export const TRANSPARENT = -1;

export type PixelGridSize = 8 | 16 | 32;

/**
 * Serializable pixel icon. `pixels` is a `size × size` grid of palette indexes;
 * `TRANSPARENT` (-1) leaves the cell empty. A palette entry of "currentColor"
 * inherits the surrounding text color, like NesRuneIcon.
 */
export interface PixelIconData {
  size: PixelGridSize;
  palette: readonly string[];
  pixels: ReadonlyArray<ReadonlyArray<number>>;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  fill: string;
}

export function createEmptyGrid(size: PixelGridSize): number[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => TRANSPARENT));
}

/** Collapses horizontal runs of identical color into rects (fewer SVG nodes). */
export function pixelIconToRects(icon: PixelIconData, monochrome = false): PixelRect[] {
  const rects: PixelRect[] = [];
  for (let y = 0; y < icon.size; y += 1) {
    const row = icon.pixels[y] ?? [];
    let x = 0;
    while (x < icon.size) {
      const index = row[x] ?? TRANSPARENT;
      if (index === TRANSPARENT || icon.palette[index] === undefined) {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < icon.size && (row[end] ?? TRANSPARENT) === index) end += 1;
      rects.push({
        x,
        y,
        width: end - x,
        fill: monochrome ? "currentColor" : icon.palette[index],
      });
      x = end;
    }
  }
  return rects;
}

/** Standalone SVG markup for export (uses real colors, never currentColor). */
export function pixelIconToSvg(icon: PixelIconData, fallbackColor = "#212529"): string {
  const rects = pixelIconToRects(icon)
    .map((r) => {
      const fill = r.fill === "currentColor" ? fallbackColor : r.fill;
      return `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="1" fill="${fill}"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.size} ${icon.size}" shape-rendering="crispEdges">${rects}</svg>`;
}

export function isPixelGridSize(value: number): value is PixelGridSize {
  return value === 8 || value === 16 || value === 32;
}

/** Runtime guard for data loaded from storage. */
export function isPixelIconData(value: unknown): value is PixelIconData {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v["size"] !== "number" || !isPixelGridSize(v["size"])) return false;
  if (!Array.isArray(v["palette"]) || !v["palette"].every((p) => typeof p === "string")) return false;
  if (!Array.isArray(v["pixels"]) || v["pixels"].length !== v["size"]) return false;
  return v["pixels"].every(
    (row) => Array.isArray(row) && row.length === v["size"] && row.every((c) => typeof c === "number"),
  );
}
