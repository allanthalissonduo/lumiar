"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquare, CheckCircle, UsersRound } from "lucide-react";

// `useSearchParams` opts the component out of static prerendering
// unless wrapped in Suspense — same pattern as /login.
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const searchParams = useSearchParams();
  // When the user lands here from `/join/<token>` we carry the
  // invite token in the query so it survives the signup → email
  // verification → redirect round-trip. `emailRedirectTo` below
  // points back at /join/<token> so the user lands on the redeem
  // step after verifying instead of being dropped on /dashboard.
  const inviteToken = searchParams.get("invite");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    // If we have an invite token, point Supabase's verification
    // email back at the join page so the user can accept after
    // verifying. Without a token, Supabase uses its default
    // redirect (the app root).
    const emailRedirectTo = inviteToken
      ? `${window.location.origin}/join/${encodeURIComponent(inviteToken)}`
      : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4"
        style={{ background: "var(--color-abyssal)" }}
      >
        <Card
          className="w-full max-w-md"
          style={{
            background: "var(--color-card-abyssal)",
            border: "1px solid rgba(43,111,219,0.25)",
          }}
        >
          <CardHeader className="items-center text-center">
            <div
              className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: "rgba(43,111,219,0.10)" }}
            >
              <CheckCircle className="h-6 w-6" style={{ color: "var(--color-electric)" }} />
            </div>
            <CardTitle className="text-xl" style={{ color: "var(--color-off-white)" }}>
              Check your email
            </CardTitle>
            <CardDescription style={{ color: "var(--color-kraft-ocre)" }}>
              We&apos;ve sent a confirmation link to{" "}
              <span style={{ color: "var(--color-off-white)" }}>{email}</span>. Please check your
              inbox and click the link to verify your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
            >
              <Button
                variant="outline"
                className="w-full"
                style={{
                  border: "1px solid rgba(43,111,219,0.25)",
                  color: "var(--color-kraft-ocre)",
                }}
              >
                Back to sign in
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--color-abyssal)" }}
    >
      <Card
        className="w-full max-w-md"
        style={{
          background: "var(--color-card-abyssal)",
          border: "1px solid rgba(43,111,219,0.25)",
        }}
      >
        <CardHeader className="items-center text-center">
          <div
            className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "rgba(43,111,219,0.10)" }}
          >
            {inviteToken ? (
              <UsersRound className="h-6 w-6" style={{ color: "var(--color-electric)" }} />
            ) : (
              <MessageSquare className="h-6 w-6" style={{ color: "var(--color-electric)" }} />
            )}
          </div>
          <CardTitle className="text-xl" style={{ color: "var(--color-off-white)" }}>
            {inviteToken ? "Create account & join" : "Create account"}
          </CardTitle>
          <CardDescription style={{ color: "var(--color-kraft-ocre)" }}>
            {inviteToken
              ? "Verify your email, then accept the invitation to join your team."
              : "Get started with CRM Template for WhatsApp"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName" style={{ color: "var(--color-kraft-ocre)" }}>
                Full name
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full"
                style={{
                  border: "1px solid rgba(43,111,219,0.25)",
                  background: "rgba(26,63,158,0.15)",
                  color: "var(--color-off-white)",
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" style={{ color: "var(--color-kraft-ocre)" }}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
                style={{
                  border: "1px solid rgba(43,111,219,0.25)",
                  background: "rgba(26,63,158,0.15)",
                  color: "var(--color-off-white)",
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" style={{ color: "var(--color-kraft-ocre)" }}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
                style={{
                  border: "1px solid rgba(43,111,219,0.25)",
                  background: "rgba(26,63,158,0.15)",
                  color: "var(--color-off-white)",
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword" style={{ color: "var(--color-kraft-ocre)" }}>
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full"
                style={{
                  border: "1px solid rgba(43,111,219,0.25)",
                  background: "rgba(26,63,158,0.15)",
                  color: "var(--color-off-white)",
                }}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full disabled:opacity-50"
              style={{
                background: "var(--color-electric)",
                color: "var(--color-off-white)",
              }}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "var(--color-kraft-ocre)" }}>
            Already have an account?{" "}
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
              style={{ color: "var(--color-electric)" }}
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
