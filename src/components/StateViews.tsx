import type { ReactNode } from "react";

import { NesContainer, NesProgress, NesText } from "@/design-system/nes-229931";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <NesContainer>
      <div className="stack">
        <NesText>{label}...</NesText>
        <NesProgress variant="primary" value={40} max={100} aria-label={label} />
      </div>
    </NesContainer>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <NesContainer title={title}>
      <div className="stack">{children ?? <NesText>Nothing here yet.</NesText>}</div>
    </NesContainer>
  );
}

export function ErrorState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <NesContainer title="Something went wrong">
      <div className="stack" role="alert">
        <NesText variant="error">{message}</NesText>
        {children}
      </div>
    </NesContainer>
  );
}
