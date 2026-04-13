import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export default async function ZonesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: zones } = await supabase
    .from("zones")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <a href="/dashboard" className="text-sm text-stone-500 hover:text-stone-700">Back to dashboard</a>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-800">Your Zones</h1>
            <p className="mt-1 text-sm text-stone-500 italic">The named places on your land.</p>
          </div>
          <a href="/zones/new" className="mt-8 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-stone-100 transition hover:bg-stone-900">+ New zone</a>
        </div>

        {(!zones || zones.length === 0) && (
          <div className="rounded-2xl border border-stone-200 bg-amber-50 p-10 text-center shadow-sm">
            <p className="text-2xl mb-3">🗺️</p>
            <p className="text-stone-700 font-medium">No zones yet.</p>
            <p className="mt-1 text-sm text-stone-500 italic">Name the places on your land — food forest, meadow, garden beds, riparian edge.</p>
            <a href="/zones/new" className="mt-6 inline-block rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-stone-100 transition hover:bg-stone-900">Add your first zone</a>
          </div>
        )}

        <div className="space-y-4">
          {zones?.map((zone) => (
            <div key={zone.id} className="rounded-2xl border border-stone-200 bg-amber-50 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-stone-800">{zone.name}</h2>
                  {zone.description && (
                    <p className="mt-1 text-sm text-stone-600 italic">{zone.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {zone.soil_type && (
                      <span className="inline-block rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">{zone.soil_type}</span>
                    )}
                    {zone.area_acres && (
                      <span className="inline-block rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">{zone.area_acres} acres</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
