import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import {
  NesButton,
  NesContainer,
  NesField,
  NesIcon,
  NesInput,
  NesText,
} from "@/design-system/nes-229931";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Editor sign in — QueerCade" },
      { name: "description", content: "Sign in to search IGDB and curate the QueerCade arcade." },
      { property: "og:title", content: "Editor sign in — QueerCade" },
      { property: "og:description", content: "Editor access to the QueerCade management screens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signIn" | "signUp";

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.redirected) return;
      if (result.error) throw result.error;
      await router.navigate({ to: "/" });
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : "Google sign-in failed.");
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signIn") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        await router.navigate({ to: "/" });
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) throw signUpError;
      setMessage("Account created. Check your email to confirm it, then sign in.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <NesContainer title={mode === "signIn" ? "Editor sign in" : "Create editor account"} rounded>
        <div className="stack">
          <NesButton type="button" variant="primary" disabled={busy} onClick={signInWithGoogle}>
            <NesIcon name="google" aria-hidden /> Continue with Google
          </NesButton>
          <NesText className="text-xs">or use email and password:</NesText>
        </div>
        <form className="stack" onSubmit={submit}>
          <NesField label="Email" htmlFor="email">
            <NesInput
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </NesField>
          <NesField label="Password" htmlFor="password">
            <NesInput
              id="password"
              type="password"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </NesField>
          {error ? (
            <NesText variant="error" role="alert">
              {error}
            </NesText>
          ) : null}
          {message ? <NesText variant="success">{message}</NesText> : null}
          <div className="row">
            <NesButton type="submit" variant="primary" disabled={busy}>
              {busy ? "Working..." : mode === "signIn" ? "Sign in" : "Create account"}
            </NesButton>
            <NesButton type="button" onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}>
              {mode === "signIn" ? "Need an account?" : "Have an account?"}
            </NesButton>
          </div>
        </form>
      </NesContainer>
    </AppShell>
  );
}
