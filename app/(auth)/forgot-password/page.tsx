import { requestPasswordResetAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Local mode does not send email. If an account exists, the reset link is shown on the next screen.
      </p>
      <form
        action={async (formData) => {
          "use server";
          const result = await requestPasswordResetAction(formData);
          if (result.token) {
            const { redirect } = await import("next/navigation");
            redirect(`/forgot-password?token=${result.token}`);
          }
        }}
        className="mt-8 space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <Button type="submit" className="w-full">Send reset link</Button>
      </form>
      {params.token ? (
        <p className="mt-6 text-sm">
          Reset link (local only):{" "}
          <a className="underline" href={`/forgot-password/confirm?token=${params.token}`}>
            open reset form
          </a>
        </p>
      ) : null}
    </main>
  );
}
