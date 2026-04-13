import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email ??
    "friend";

  const { data: zones } = await supabase
    .from("zones")
    .select("id")
    .eq("user_id", user.id);

  const { data: observations } = await supabase
    .from("observations")
    .select("id")
    .eq("user_id", user.id);

  const zoneCount = zones?.length ?? 0;
  const observationCount = observations?.length ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 md:p-8">
      <div className="rounded-2xl border border-stone-200 bg-amber-50 p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-800">
          Welcome, {displayName}
        </h1>
        <p className="mt-2 text-sm text-stone-500 italic">Your land is waiting.</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <span className="text-sm text-stone-600">
            {zoneCount} {zoneCount === 1 ? "zone" : "zones"}
          </span>
          <span className="text-sm text-stone-600">
            {observationCount}{" "}
            {observationCount === 1 ? "observation" : "observations"}
          </span>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Quick actions
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/journal/new"
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
          >
            + Observation
          </Link>
          <Link
            href="/zones/new"
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
          >
            + Zone
          </Link>
          <Link
            href="/mentor"
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-900 shadow-sm transition hover:border-green-300 hover:bg-green-100/80"
          >
            Ask Mentor
          </Link>
        </div>
      </div>
    </div>
  );
}
