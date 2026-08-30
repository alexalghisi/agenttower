"use client";

import { useState } from "react";
import Link from "next/link";
import { loginAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Demo: demo@agenttower.dev / DemoPass123!
      </p>
      <form
        action={async (formData) => {
          const result = await loginAction(formData);
          if (result?.error) setError(result.error);
        }}
        className="mt-8 space-y-4"
      >
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required defaultValue="demo@agenttower.dev" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required defaultValue="DemoPass123!" />
        </div>
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        <Link href="/forgot-password" className="underline">Forgot password</Link>
        {" · "}
        <Link href="/signup" className="underline">Create an account</Link>
      </p>
    </main>
  );
}
