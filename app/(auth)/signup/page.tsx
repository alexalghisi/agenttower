"use client";

import { useState } from "react";
import Link from "next/link";
import { registerAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Create an account</h1>
      <p className="mt-2 text-sm text-muted-foreground">Starts a Free plan after onboarding. No payment required.</p>
      <form
        action={async (formData) => {
          const result = await registerAction(formData);
          if (result?.error) setError(result.error);
        }}
        className="mt-8 space-y-4"
      >
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
        <Button type="submit" className="w-full">Create account</Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="underline">Log in</Link>
      </p>
    </main>
  );
}
