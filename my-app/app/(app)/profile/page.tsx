import type { Metadata } from "next";
import { CalendarDays, Mail } from "lucide-react";
import { LogoutButton } from "@/src/components/auth/LogoutButton";
import { ProfileForm } from "@/src/components/auth/ProfileForm";
import { Avatar } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent } from "@/src/components/ui/card";
import { requireUser } from "@/src/lib/auth/session";

export const metadata: Metadata = { title: "Profile" };

/** Protected profile page. Auth enforced by middleware + requireUser. */
export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <div className="fade-up mx-auto grid w-full max-w-4xl gap-4 sm:gap-5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
            Profile
          </h1>
          <p className="mt-0.5 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Your identity, account details, and password.
          </p>
        </div>
        <span className="ml-auto shrink-0">
          <LogoutButton />
        </span>
      </div>
      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
        <Card className="lg:sticky lg:top-[4.5rem]">
          <CardContent className="flex flex-col items-center px-6 py-6 text-center">
            <Avatar name={user.name} size="lg" />
            <p className="mt-3 max-w-full truncate text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {user.name}
            </p>
            <p className="mt-0.5 max-w-full truncate text-[13px] text-zinc-500 dark:text-zinc-400">
              {user.email}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {user.role ? (
                <Badge tone="accent" size="sm">
                  {String(user.role).replace(/_/g, " ")}
                </Badge>
              ) : (
                <Badge tone="neutral" size="sm">
                  Member
                </Badge>
              )}
            </div>
            <dl className="mt-4 grid w-full gap-2 border-t border-zinc-100 pt-4 text-left dark:border-zinc-900">
              <div className="flex items-center gap-2.5 text-[13px]">
                <CalendarDays size={14} aria-hidden="true" className="shrink-0 text-zinc-400" />
                <dt className="sr-only">Member since</dt>
                <dd className="min-w-0 truncate text-zinc-600 dark:text-zinc-400">
                  Member since {memberSince}
                </dd>
              </div>
              <div className="flex items-center gap-2.5 text-[13px]">
                <Mail size={14} aria-hidden="true" className="shrink-0 text-zinc-400" />
                <dt className="sr-only">Sign-in method</dt>
                <dd className="min-w-0 truncate text-zinc-600 dark:text-zinc-400">
                  Email sign-in
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <ProfileForm
          initialName={user.name}
          email={user.email}
          memberSince={memberSince}
        />
      </div>
    </div>
  );
}
