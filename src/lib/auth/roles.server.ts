import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "admin" | "editor" | "user";

/**
 * Server-side authorization: the caller must actually hold an editor or admin
 * role in the database. Hiding UI is never the boundary.
 */
export async function assertEditor(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ role: AppRole }> {
  const [adminResult, editorResult] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "editor" }),
  ]);

  if (adminResult.error || editorResult.error) {
    console.error("Role lookup failed", adminResult.error?.message ?? editorResult.error?.message);
    throw new Error("ROLE_LOOKUP_FAILED");
  }

  if (adminResult.data === true) return { role: "admin" };
  if (editorResult.data === true) return { role: "editor" };

  throw new Error("FORBIDDEN_NOT_EDITOR");
}

export function authErrorMessage(message: string): string {
  if (message.includes("FORBIDDEN_NOT_EDITOR")) {
    return "You do not have permission to import games.";
  }
  if (message.includes("ROLE_LOOKUP_FAILED")) {
    return "Your permissions could not be checked. Please try again.";
  }
  return message;
}
