import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthEntryShell } from "@/components/auth/AuthEntryShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiClientError, authApi } from "@/lib/apiClient";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await authApi.requestPasswordReset({ email });
      setSuccessMessage(response.message);
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`, {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Unable to start password reset.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthEntryShell
      compact
      showEntryLinks={false}
      authCard={
        <Card className="w-full max-w-md border-border/60 bg-card/95 shadow-elegant">
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
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

              {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}

              {successMessage && (
                <p className="text-sm text-muted-foreground">{successMessage}</p>
              )}

              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Sending code..." : "Send Reset Code"}
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <Link
                className="text-primary underline-offset-4 hover:underline"
                to="/login"
              >
                Back to sign in
              </Link>
              <Link
                className="text-primary underline-offset-4 hover:underline"
                to="/register"
              >
                Create account
              </Link>
            </div>
          </CardContent>
        </Card>
      }
    />
  );
}
