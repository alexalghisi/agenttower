import { resetPasswordAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ConfirmResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <form
        action={async (formData) => {
          "use server";
          await resetPasswordAction(formData);
        }}
        className="mt-8 space-y-4"
      >
        <input type="hidden" name="token" value={token ?? ""} />
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
        <Button type="submit" className="w-full">Update password</Button>
      </form>
    </main>
  );
}
