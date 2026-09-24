import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Ledger" },
      { name: "description", content: "Sign in to your private expense notebook." },
      { property: "og:title", content: "Sign in · Ledger" },
      { property: "og:description", content: "Sign in to your private expense notebook." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/" });
  }, [session, navigate]);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setMessage("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setMessage("Google sign-in failed. Try email instead.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-white/60 p-7 backdrop-blur-2xl">
        <h1 className="text-2xl font-bold tracking-tight">Ledger</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A quiet notebook for your money.
        </p>

        <label className="mt-7 block label-xs">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          className="mt-2 w-full rounded-xl border border-line bg-white/70 px-4 py-3.5 text-base outline-none"
        />
        <label className="mt-4 block label-xs">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="mt-2 w-full rounded-xl border border-line bg-white/70 px-4 py-3.5 text-base outline-none"
        />

        {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-5 w-full rounded-xl bg-accent py-4 text-base font-medium text-primary-foreground disabled:opacity-60"
        >
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
        <button
          onClick={google}
          className="mt-2 w-full rounded-xl border border-line py-4 text-base font-medium"
        >
          Continue with Google
        </button>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-muted-foreground"
        >
          {mode === "signin" ? "No account yet? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
