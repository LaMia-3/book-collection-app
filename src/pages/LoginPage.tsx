import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

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

type LocationState = {
  from?: string;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authError, isAuthenticated, isLoadingAuth, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPageError(null);

    try {
      await login({ email, password });
      const from = (location.state as LocationState | null)?.from || "/";
      navigate(from, { replace: true });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Login failed.");
    }
  };

  return (
    <AuthEntryShell
      authCard={
        <Card className="w-full max-w-md border-border/60 bg-card/95 shadow-elegant">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Access your account-backed library with your credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
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
                  autoComplete="current-password"
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
                {isLoadingAuth ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <p className="mt-4 text-sm text-muted-foreground">
              Need an account?{" "}
              <Link className="text-primary underline-offset-4 hover:underline" to="/register">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      }
    />
  );
}
