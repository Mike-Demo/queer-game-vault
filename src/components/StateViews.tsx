import type { ReactNode } from "react";

import {
  NesProgress,
  NesText,
} from "@/design-system/nes-229931";
import { Surface } from "@/components/Surface";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <Surface>
      <div className="stack">
        <NesText>{label}...</NesText>
        <NesProgress variant="primary" value={40} max={100} aria-label={label} />
      </div>
    </Surface>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Surface title={title}>
      <div className="stack">{children ?? <NesText>Nothing here yet.</NesText>}</div>
    </Surface>
  );
}

export function ErrorState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <Surface title="Something went wrong">
      <div className="stack" role="alert">
        <NesText variant="error">{message}</NesText>
        {children}
      </div>
    </Surface>
  );
}
