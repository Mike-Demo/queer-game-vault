import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import {
  NesButton,
  NesField,
  NesIcon,
  NesInput,
  NesText,
} from "@/design-system/nes-229931";
import { Surface } from "@/components/Surface";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

interface AuthSearch {
  next?: string;
}

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    next: typeof search["next"] === "string" && search["next"].startsWith("/") ? search["next"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or register — QueerCade" },
      {
        name: "description",
        content: "Create a QueerCade account to track what you are playing, completed, wishlisted or dropped.",
      },
      { property: "og:title", content: "Sign in or register — QueerCade" },
      {
        property: "og:description",
        content: "Sign in to keep your own game library in the QueerCade arcade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signIn" | "signUp";

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;

function AuthPage() {
  const router = useRouter();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("signIn");
  const [username, setUsername] = useState("");
  const [usernameNote, setUsernameNote] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const destination = next ?? "/my-library";

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
      await router.navigate({ to: destination });
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : "Google sign-in failed.");
      setBusy(false);
    }
  }

  async function checkUsername() {
    const candidate = username.trim();
    if (candidate.length === 0) {
      setUsernameNote(null);
      return;
    }
    if (!USERNAME_PATTERN.test(candidate)) {
      setUsernameNote("Use 3–24 letters, numbers or underscores.");
      return;
    }
    const { data, error: rpcError } = await supabase.rpc("username_available", { _username: candidate });
    if (rpcError) {
      setUsernameNote(null);
      return;
    }
    setUsernameNote(data === true ? "That username is available." : "That username is already taken.");
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
        await router.navigate({ to: destination });
        return;
      }

      const candidate = username.trim();
      if (!USERNAME_PATTERN.test(candidate)) {
        throw new Error("Choose a username of 3–24 letters, numbers or underscores.");
      }
      if (password !== confirmPassword) {
        throw new Error("Those two passwords do not match.");
      }

      const { data: available } = await supabase.rpc("username_available", { _username: candidate });
      if (available === false) throw new Error("That username is already taken.");

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { username: candidate, display_name: candidate },
        },
      });
      if (signUpError) throw signUpError;
      setMessage("Account created. Check your email to confirm it, then sign in.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const registering = mode === "signUp";

  return (
    <AppShell>
      <div className="auth-layout">
        <Surface title={registering ? "Register for QueerCade" : "Sign in to QueerCade"} rounded>
          <div className="stack">
            <h1 className="title-md">
              <NesText variant="primary">{registering ? "Create your account" : "Welcome back"}</NesText>
            </h1>
            <NesButton type="button" variant="primary" disabled={busy} onClick={signInWithGoogle}>
              <NesIcon name="google" aria-hidden /> Continue with Google
            </NesButton>
            <NesText className="text-xs">or use email and password:</NesText>
          </div>
          <form className="stack" onSubmit={submit}>
            {registering ? (
              <NesField label="Username" htmlFor="username">
                <NesInput
                  id="username"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={24}
                  value={username}
                  aria-describedby="username-note"
                  onBlur={checkUsername}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setUsernameNote(null);
                  }}
                />
              </NesField>
            ) : null}
            {registering ? (
              <NesText id="username-note" className="text-xs">
                {usernameNote ?? "3–24 letters, numbers or underscores. This is your public profile name."}
              </NesText>
            ) : null}
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
                autoComplete={registering ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </NesField>
            {registering ? (
              <NesField label="Confirm password" htmlFor="confirm-password">
                <NesInput
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </NesField>
            ) : null}
            {error ? (
              <NesText variant="error" role="alert">
                {error}
              </NesText>
            ) : null}
            {message ? <NesText variant="success">{message}</NesText> : null}
            <div className="row">
              <NesButton type="submit" variant="primary" disabled={busy}>
                {busy ? "Working..." : registering ? "Register" : "Sign in"}
              </NesButton>
              <NesButton
                type="button"
                onClick={() => {
                  setMode(registering ? "signIn" : "signUp");
                  setError(null);
                  setMessage(null);
                }}
              >
                {registering ? "Already have an account? Sign in" : "Need an account? Register"}
              </NesButton>
            </div>
          </form>
        </Surface>
      </div>
    </AppShell>
  );
}
