import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

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
import { ApiClientError, authApi } from "@/lib/apiClient";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsVerifyingOtp(true);

    try {
      await authApi.verifyPasswordResetOtp({
        email,
        otp,
      });
      setIsOtpVerified(true);
    } catch (error) {
      setIsOtpVerified(false);
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Code verification failed.",
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== passwordConfirmation) {
      setErrorMessage("Passwords must match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authApi.resetPassword({
        email,
        otp,
        password,
      });
      setSuccessMessage(response.message);
      setIsOtpVerified(false);
      setPassword("");
      setPasswordConfirmation("");
      setOtp("");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Password reset failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthEntryShell
      authCard={
        <Card className="w-full max-w-md border-border/60 bg-card/95 shadow-elegant">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Enter the code from your email, then choose a new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{successMessage}</p>
                <Button asChild className="w-full">
                  <Link to="/login">Back to Sign In</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <form className="space-y-4" onSubmit={handleVerifyOtp}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="email">
                      Email
                    </label>
                    <Input
                      autoComplete="email"
                      id="email"
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setIsOtpVerified(false);
                      }}
                      type="email"
                      value={email}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="otp">
                      Reset Code
                    </label>
                    <Input
                      autoComplete="one-time-code"
                      id="otp"
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) => {
                        const nextValue = event.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtp(nextValue);
                        setIsOtpVerified(false);
                      }}
                      placeholder="6-digit code"
                      value={otp}
                    />
                  </div>

                  <Button
                    className="w-full"
                    disabled={isVerifyingOtp}
                    type="submit"
                    variant={isOtpVerified ? "secondary" : "default"}
                  >
                    {isVerifyingOtp
                      ? "Checking code..."
                      : isOtpVerified
                        ? "Code Verified"
                        : "Verify Code"}
                  </Button>
                </form>

                {isOtpVerified && (
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="password">
                        New Password
                      </label>
                      <Input
                        autoComplete="new-password"
                        id="password"
                        onChange={(event) => setPassword(event.target.value)}
                        type="password"
                        value={password}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor="passwordConfirmation"
                      >
                        Confirm Password
                      </label>
                      <Input
                        autoComplete="new-password"
                        id="passwordConfirmation"
                        onChange={(event) =>
                          setPasswordConfirmation(event.target.value)
                        }
                        type="password"
                        value={passwordConfirmation}
                      />
                    </div>

                    <Button className="w-full" disabled={isSubmitting} type="submit">
                      {isSubmitting ? "Saving new password..." : "Reset Password"}
                    </Button>
                  </form>
                )}

                {errorMessage && (
                  <p className="text-sm text-destructive">{errorMessage}</p>
                )}

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <Link
                    className="text-primary underline-offset-4 hover:underline"
                    to="/forgot-password"
                  >
                    Send a new code
                  </Link>
                  <Link
                    className="text-primary underline-offset-4 hover:underline"
                    to="/login"
                  >
                    Back to sign in
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      }
    />
  );
}
