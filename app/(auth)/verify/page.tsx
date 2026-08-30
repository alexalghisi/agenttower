import Link from "next/link";
import { verifyEmailAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailAction(token) : { error: "Missing token." };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Email verification</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {"error" in result && result.error
          ? result.error
          : "Email marked verified. Local mode does not send mail; this page is the verification channel."}
      </p>
      <Button asChild className="mt-6">
        <Link href="/onboarding">Continue onboarding</Link>
      </Button>
    </main>
  );
}
