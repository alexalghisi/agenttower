import { OnboardingWizard } from "@/components/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Onboarding</p>
      <h1 className="mt-2 text-3xl font-semibold">Stand up a workspace</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Creates an organization, first project, and a hashed API key. The plaintext key is shown once.
      </p>
      <OnboardingWizard />
    </main>
  );
}
