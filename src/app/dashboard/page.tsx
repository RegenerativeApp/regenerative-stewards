import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }
  const displayName = user.user_metadata?.display_name ?? user.email ?? "friend";
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
    <main className="min-h-screen bg-stone-100 px-6 py-12 text-stone-900">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-2xl border border-stone-200 bg-amber-50 p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-800">
            Welcome, {displayName}
          </h1>
          <p className="mt-2 text-sm text-stone-500 italic">Your land is waiting.</p>
          <div className="mt-4 flex gap-4">
            <span className="text-xs text-stone-400">{zoneCount} {zoneCount === 1 ? "zone" : "zones"}</span>
            <span className="text-xs text-stone-400">{observationCount} {observationCount === 1 ? "observation" : "observations"}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <a href="/journal" className="rounded-2xl border border-stone-200 bg-amber-50 p-6 shadow-sm transition hover:shadow-md hover:border-stone-300 block">
            <p className="text-2xl mb-2">📓</p>
            <h2 className="text-lg font-semibold text-stone-800">Field Journal</h2>
            <p className="mt-1 text-sm text-stone-500 italic">Record what the land is showing you.</p>
          </a>
          <a href="/zones" className="rounded-2xl border border-stone-200 bg-amber-50 p-6 shadow-sm transition hover:shadow-md hover:border-stone-300 block">
            <p className="text-2xl mb-2">🗺️</p>
            <h2 className="text-lg font-semibold text-stone-800">Your Zones</h2>
            <p className="mt-1 text-sm text-stone-500 italic">The named places on your land.</p>
          </a>
          <div className="rounded-2xl border border-stone-200 bg-amber-50 p-6 shadow-sm opacity-50">
            <p className="text-2xl mb-2">🌿</p>
            <h2 className="text-lg font-semibold text-stone-800">Plant Oracle</h2>
            <p className="mt-1 text-sm text-stone-500 italic">Coming soon.</p>
          </div>
          <a href="/mentor" className="rounded-2xl border border-stone-200 bg-green-50 p-6 shadow-sm transition hover:shadow-md hover:border-green-300 block">
            <p className="tl mb-2">🧠</p>
            <h2 className="text-lg font-semibold text-stone-800">Ecological Mentor</h2>
            <p className="mt-1 text-sm text-stone-500 italic">Ask anything about your land.</p>
          </a>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-amber-50 p-6 shadow-sm">
          <form action={signOut}>
            <button type="submit" className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-stone-100 transition hover:bg-stone-900">
              Log out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
