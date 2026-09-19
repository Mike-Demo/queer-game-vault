import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { Surface } from "@/components/Surface";
import { useTheme } from "@/components/ThemeProvider";
import {
  NesButton,
  NesCheckbox,
  NesField,
  NesInput,
  NesRadio,
  NesSelect,
  NesText,
  NesTextarea,
} from "@/design-system/nes-229931";
import { useMyProfile, useUpdateProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import type { ThemeMode } from "@/lib/theme/mode";

export const Route = createFileRoute("/_authenticated/settings")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Profile settings — QueerCade" },
      { name: "description", content: "Update your QueerCade username, profile, appearance and password." },
      { property: "og:title", content: "Profile settings — QueerCade" },
      { property: "og:description", content: "Manage your QueerCade account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const profile = useMyProfile(true);
  const update = useUpdateProfile();
  const { mode, highContrast, setMode, setHighContrast } = useTheme();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    if (!profile.data) return;
    setUsername(profile.data.username);
    setBio(profile.data.bio ?? "");
    setVisibility(profile.data.profileVisibility);
  }, [profile.data]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    setSaveError(null);
    try {
      const result = await update.mutateAsync({ username, bio, profileVisibility: visibility });
      if (result.ok) setSaved(true);
      else setSaveError(result.error ?? "That could not be saved.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "That could not be saved.");
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordBusy(true);
    setPasswordError(null);
    setPasswordMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setPasswordError(error.message);
    else {
      setPassword("");
      setPasswordMessage("Your password has been changed.");
    }
    setPasswordBusy(false);
  }

  function saveAppearance(nextMode: ThemeMode, nextContrast: boolean) {
    setMode(nextMode);
    setHighContrast(nextContrast);
    update.mutate({ themePreference: nextMode, highContrast: nextContrast });
  }

  return (
    <AppShell>
      <div className="stack-lg">
        <h1 className="title-xl">
          <NesText variant="primary">Profile settings</NesText>
        </h1>

        {profile.isPending ? <LoadingState label="Loading your settings" /> : null}
        {profile.isError ? <ErrorState message="Your settings could not be loaded. Please refresh." /> : null}

        {profile.data ? (
          <div className="settings-layout">
            <Surface title="Profile" rounded>
              <form className="stack" onSubmit={saveProfile}>
                <NesField label="Username" htmlFor="settings-username">
                  <NesInput
                    id="settings-username"
                    value={username}
                    required
                    minLength={3}
                    maxLength={24}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </NesField>
                <NesText className="text-xs">3–24 letters, numbers or underscores.</NesText>

                <NesField label="About you" htmlFor="settings-bio">
                  <NesTextarea
                    id="settings-bio"
                    rows={4}
                    maxLength={600}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                  />
                </NesField>

                <fieldset className="stack">
                  <legend className="text-xs">Who can see your library</legend>
                  <NesRadio
                    name="visibility"
                    label="Anyone with my profile link"
                    value="public"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                  />
                  <NesRadio
                    name="visibility"
                    label="Only me"
                    value="private"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                  />
                </fieldset>

                {saveError ? (
                  <NesText variant="error" role="alert">
                    {saveError}
                  </NesText>
                ) : null}
                {saved ? <NesText variant="success">Saved.</NesText> : null}

                <NesButton type="submit" variant="primary" disabled={update.isPending}>
                  {update.isPending ? "Saving..." : "Save profile"}
                </NesButton>
              </form>
            </Surface>

            <Surface title="Appearance" rounded>
              <div className="stack">
                <NesField label="Theme" htmlFor="settings-theme">
                  <NesSelect
                    id="settings-theme"
                    value={mode}
                    onChange={(event) => saveAppearance(event.target.value as ThemeMode, highContrast)}
                  >
                    <option value="system">Match my device</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </NesSelect>
                </NesField>
                <NesCheckbox
                  label="Higher contrast text and links"
                  checked={highContrast}
                  onChange={(event) => saveAppearance(mode, event.target.checked)}
                />
              </div>
            </Surface>

            <Surface title="Account" rounded>
              <form className="stack" onSubmit={savePassword}>
                <NesText className="text-xs">{`Signed in as ${profile.data.email ?? "your account"}`}</NesText>
                <NesField label="New password" htmlFor="settings-password">
                  <NesInput
                    id="settings-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </NesField>
                {passwordError ? (
                  <NesText variant="error" role="alert">
                    {passwordError}
                  </NesText>
                ) : null}
                {passwordMessage ? <NesText variant="success">{passwordMessage}</NesText> : null}
                <NesButton type="submit" disabled={passwordBusy}>
                  {passwordBusy ? "Saving..." : "Change password"}
                </NesButton>
              </form>
            </Surface>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
