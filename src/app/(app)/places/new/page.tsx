import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export default async function NewPlacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  async function savePlace(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const soil_type = formData.get("soil_type") as string;
    const area_acres = formData.get("area_acres") as string;

    await supabase.from("places").insert({
      user_id: user.id,
      name,
      description: description || null,
      soil_type: soil_type || null,
      area_acres: area_acres ? parseFloat(area_acres) : null,
    });

    redirect("/places");
  }

  const soilTypes = [
    "clay",
    "clay-loam",
    "loam",
    "sandy-loam",
    "sandy",
    "silty",
    "silty-loam",
    "rocky",
    "unknown",
  ];

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <a href="/places" className="text-sm text-stone-500 hover:text-stone-700">Back to places</a>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-800">New Place</h1>
          <p className="mt-1 text-sm text-stone-500 italic">Name a place on your land.</p>
        </div>

        <form action={savePlace} className="rounded-2xl border border-stone-200 bg-amber-50 p-8 shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Place name</label>
            <input type="text" name="name" required placeholder="e.g. South Food Forest, Coyote Meadow, Front Beds" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
            <textarea name="description" rows={3} placeholder="What is this place? What's its character, its history, its purpose?" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 italic focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Soil type</label>
            <select name="soil_type" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400">
              <option value="">Unknown or mixed</option>
              {soilTypes.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Area (acres)</label>
            <input type="number" name="area_acres" step="0.1" min="0" placeholder="e.g. 0.5" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400" />
          </div>

          <div className="flex items-center justify-between pt-2">
            <a href="/places" className="text-sm text-stone-400 hover:text-stone-600">Cancel</a>
            <button type="submit" className="rounded-lg bg-stone-800 px-6 py-2 text-sm font-medium text-stone-100 transition hover:bg-stone-900">Save place</button>
          </div>
        </form>
      </div>
    </main>
  );
}
