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

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-12 text-stone-900">
      <div className="mx-auto max-w-2xl rounded-2xl border border-stone-200 bg-amber-50 p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-800">
          Welcome, {displayName}
        </h1>
        <p className="mt-3 text-sm text-stone-600">You are signed in to your dashboard.</p>

        <form action={signOut} className="mt-8">
          <button
            type="submit"
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-stone-100 transition hover:bg-stone-900"
          >
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}
