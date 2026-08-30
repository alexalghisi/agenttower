import { redirect } from "next/navigation";
import { getMemberships, getSessionUser } from "@/lib/auth/session";
import type { Membership, SessionUser } from "@/types/domain";

export async function requireAppContext(): Promise<{ user: SessionUser; membership: Membership }> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await getMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");
  return { user, membership: memberships[0] };
}
