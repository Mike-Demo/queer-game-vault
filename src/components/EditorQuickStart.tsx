import { Link } from "@tanstack/react-router";

import {
  NesText,
} from "@/design-system/nes-229931";
import { Surface } from "@/components/Surface";
import { useEditorAccess, useSession } from "@/hooks/useAuth";

/**
 * Three-step orientation for signed-in editors. Renders nothing for visitors,
 * so the public arcade stays uncluttered.
 */
export function EditorQuickStart() {
  const { session } = useSession();
  const { data: access } = useEditorAccess(Boolean(session));

  if (!access?.role) return null;

  return (
    <Surface title="How it works" rounded>
      <div className="stack">
        <p className="text-xs">
          <NesText>
            1. Search games in Discover and import the ones you want.
          </NesText>
        </p>
        <p className="text-xs">
          <NesText>
            2. In the Review queue, write your own description, then set the status to approved or
            featured.
          </NesText>
        </p>
        <p className="text-xs">
          <NesText>3. Approved and featured games appear here and in the public library.</NesText>
        </p>
        <div className="row-between">
          <Link to="/import-search">Import games from IGDB</Link>
          <Link to="/review">Review queue</Link>
          <Link to="/imports">Import history</Link>
        </div>
      </div>
    </Surface>
  );
}
