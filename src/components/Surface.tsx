import type { ComponentProps } from "react";

import { NesContainer } from "@/design-system/nes-229931";
import { useTheme } from "@/components/ThemeProvider";

/**
 * A design-system container that follows the app's appearance setting by using
 * the library's own dark variant. Everything else is passed straight through.
 */
export function Surface(props: ComponentProps<typeof NesContainer>) {
  const { resolved } = useTheme();
  return <NesContainer dark={resolved === "dark"} {...props} />;
}
