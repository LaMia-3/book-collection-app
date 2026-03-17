import { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Bug,
  Heart,
  Library,
  Shield,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AuthEntryShellProps = {
  authCard: ReactNode;
  authSupplement?: ReactNode;
  compact?: boolean;
  showEntryLinks?: boolean;
};

const ENTRY_LINKS = [
  {
    icon: BookOpen,
    label: "Changelog",
    to: "/about?tab=changelog",
  },
  {
    icon: Bug,
    label: "Known Issues",
    to: "/about?tab=known-issues",
  },
  {
    icon: Sparkles,
    label: "Roadmap",
    to: "/about?tab=roadmap",
  },
  {
    icon: Shield,
    label: "Privacy",
    to: "/about?tab=privacy",
  },
  {
    icon: Heart,
    label: "About",
    to: "/about?tab=about",
  },
] as const;

const PRODUCT_HIGHLIGHTS = [
  "Build a personal library that actually looks like a bookshelf.",
  "Create collections for your favorites, TBR piles, genres, or any custom shelf you want.",
  "Track series, follow your reading goals, and keep your progress in one place.",
] as const;

export function AuthEntryShell({
  authCard,
  authSupplement,
  compact = false,
  showEntryLinks = true,
}: AuthEntryShellProps) {
  if (compact) {
    return (
      <div className="min-h-screen bg-gradient-page">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10 lg:px-8">
          <section className="w-full max-w-md space-y-4">
            {authCard}
            {showEntryLinks && (
              <div className="space-y-3 rounded-3xl border border-border/50 bg-card/80 p-4 shadow-elegant backdrop-blur">
                <p className="text-sm font-medium text-foreground">
                  Learn more before you sign in
                </p>
                <div className="flex flex-wrap gap-2">
                  {ENTRY_LINKS.map(({ icon: Icon, label, to }) => (
                    <Button key={label} asChild size="sm" variant="outline">
                      <Link to={to}>
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-page">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <section className="flex flex-col justify-between rounded-3xl border border-border/50 bg-card/80 p-6 shadow-elegant backdrop-blur sm:p-8 lg:p-10">
          <div className="space-y-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Library className="h-4 w-4" />
              Book Collection App v2.0.0
            </div>

            <div className="max-w-2xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                A reading tracker built around your own bookshelf.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Add books, arrange them on a shelf-style library, group them
                into collections, keep up with series, and watch your reading
                goals come together over time.
              </p>
            </div>

            <div className="grid gap-3">
              {PRODUCT_HIGHLIGHTS.map((highlight) => (
                <Card key={highlight} className="border-border/60 bg-background/70">
                  <CardContent className="flex items-start gap-3 p-4">
                    <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground">{highlight}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

          </div>

          <div className="mt-8 space-y-3">
            <p className="text-sm font-medium text-foreground">
              Learn more before you sign in
            </p>
            <div className="flex flex-wrap gap-2">
              {ENTRY_LINKS.map(({ icon: Icon, label, to }) => (
                <Button key={label} asChild size="sm" variant="outline">
                  <Link to={to}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md space-y-4">
            {authCard}
            {authSupplement}
          </div>
        </section>
      </div>
    </div>
  );
}
