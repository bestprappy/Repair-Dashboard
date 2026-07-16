import { LockKeyhole, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Sign in | Repair Analytics" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const showError = (await searchParams).error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="surface-shadow w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="brand-gradient mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl text-white">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </div>
          <CardTitle>Repair Analytics</CardTitle>
          <CardDescription>Enter the dashboard password to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/auth/login" method="post" className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} autoFocus className="pl-9" />
              </div>
              {showError ? <p role="alert" className="text-destructive text-sm">Incorrect password or too many attempts. Please try again later.</p> : null}
            </div>
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
