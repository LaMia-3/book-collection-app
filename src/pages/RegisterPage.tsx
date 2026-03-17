import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { AuthEntryShell } from "@/components/auth/AuthEntryShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { authError, isAuthenticated, isLoadingAuth, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPageError(null);

    try {
      await register({
        email,
        password,
        preferredName,
      });
      navigate("/", { replace: true });
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Registration failed.",
      );
    }
  };

  return (
    <AuthEntryShell
      authCard={
        <Card className="w-full max-w-md border-border/60 bg-card/95 shadow-elegant">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Start syncing your library to your authenticated account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="preferredName">
                  Preferred Name
                </label>
                <Input
                  autoComplete="name"
                  id="preferredName"
                  onChange={(event) => setPreferredName(event.target.value)}
                  value={preferredName}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <Input
                  autoComplete="email"
                  id="email"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <Input
                  autoComplete="new-password"
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </div>

              {(pageError || authError) && (
                <p className="text-sm text-destructive">{pageError || authError}</p>
              )}

              <Button className="w-full" disabled={isLoadingAuth} type="submit">
                {isLoadingAuth ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <p className="mt-4 text-sm text-muted-foreground">
              Already registered?{" "}
              <Link className="text-primary underline-offset-4 hover:underline" to="/login">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      }
    />
  );
}
